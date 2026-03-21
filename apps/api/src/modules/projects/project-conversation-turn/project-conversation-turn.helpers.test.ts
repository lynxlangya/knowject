import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@lib/app-error.js";
import { findProjectConversationRetryState } from "../utils/project-conversation-turn.retry.js";
import { buildReplayConversationMessages } from "../utils/project-conversation-turn.replay.js";
import { createProjectConversationStreamErrorEvent } from "../adapters/project-conversation-stream.events.js";
import type { ProjectConversationDocument } from "../projects.types.js";

const createConversation = (
  messages: ProjectConversationDocument["messages"],
): ProjectConversationDocument => ({
  id: "chat-test",
  title: "测试会话",
  messages,
  createdAt: new Date("2026-03-17T09:00:00.000Z"),
  updatedAt: new Date("2026-03-17T09:05:00.000Z"),
});

test("findProjectConversationRetryState returns the matching user turn and following assistant reply", () => {
  const conversation = createConversation([
    {
      id: "msg-user-1",
      role: "user",
      content: "第一轮问题",
      clientRequestId: "request-1",
      createdAt: new Date("2026-03-17T09:00:00.000Z"),
    },
    {
      id: "msg-assistant-1",
      role: "assistant",
      content: "第一轮回答",
      createdAt: new Date("2026-03-17T09:00:05.000Z"),
      sources: [],
    },
    {
      id: "msg-user-2",
      role: "user",
      content: "第二轮问题",
      clientRequestId: "request-2",
      createdAt: new Date("2026-03-17T09:01:00.000Z"),
    },
  ]);

  const retryState = findProjectConversationRetryState(
    conversation,
    "request-1",
  );

  assert.equal(retryState?.userMessage.id, "msg-user-1");
  assert.equal(retryState?.assistantMessage?.id, "msg-assistant-1");
});

test("buildReplayConversationMessages trims later turns and replaces the target user message content", () => {
  const conversation = createConversation([
    {
      id: "msg-user-1",
      role: "user",
      content: "旧问题",
      createdAt: new Date("2026-03-17T09:00:00.000Z"),
    },
    {
      id: "msg-assistant-1",
      role: "assistant",
      content: "旧回答",
      createdAt: new Date("2026-03-17T09:00:05.000Z"),
      sources: [],
    },
    {
      id: "msg-user-2",
      role: "user",
      content: "第二轮问题",
      createdAt: new Date("2026-03-17T09:01:00.000Z"),
    },
  ]);

  const replay = buildReplayConversationMessages({
    conversation,
    targetUserMessageId: "msg-user-1",
    content: "新问题",
    clientRequestId: "request-replay-1",
  });

  assert.deepEqual(
    replay.messages.map((message) => message.id),
    ["msg-user-1"],
  );
  assert.equal(replay.userMessage.content, "新问题");
  assert.equal(replay.userMessage.clientRequestId, "request-replay-1");
});

test("createProjectConversationStreamErrorEvent normalizes unknown errors and retryability", () => {
  const retryableEvent = createProjectConversationStreamErrorEvent({
    conversationId: "chat-stream",
    clientRequestId: "request-stream-1",
    sequence: 3,
    locale: "en",
    error: new AppError({
      statusCode: 502,
      code: "PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR",
      message: "项目对话流式生成失败，请稍后重试",
      messageKey: "project.conversation.streamFailed",
    }),
  });

  assert.equal(retryableEvent.type, "error");
  if (retryableEvent.type !== "error") {
    throw new Error("retryableEvent should be an error event");
  }
  assert.equal(retryableEvent.retryable, true);
  assert.equal(retryableEvent.code, "PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR");
  assert.equal(
    retryableEvent.message,
    "Project conversation streaming failed; try again later",
  );

  const normalizedEvent = createProjectConversationStreamErrorEvent({
    conversationId: "chat-stream",
    clientRequestId: "request-stream-1",
    sequence: 4,
    locale: "en",
    error: new Error("boom"),
  });

  assert.equal(normalizedEvent.type, "error");
  if (normalizedEvent.type !== "error") {
    throw new Error("normalizedEvent should be an error event");
  }
  assert.equal(normalizedEvent.retryable, true);
  assert.equal(normalizedEvent.code, "INTERNAL_SERVER_ERROR");
  assert.equal(normalizedEvent.message, "Service temporarily unavailable");
});
