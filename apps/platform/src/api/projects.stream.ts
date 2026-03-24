import {
  ApiError,
  extractApiErrorPayload,
} from '@knowject/request';
import type {
  CreateProjectConversationStreamMessageRequest,
  ProjectConversationStreamEvent,
  ProjectConversationStreamEventType,
} from './projects';
import { handleUnauthorized } from './client';
import { getToken } from '@app/auth/token';

interface StreamProjectConversationMessageOptions {
  signal?: AbortSignal;
  onEvent(event: ProjectConversationStreamEvent): Promise<void> | void;
}

const STREAM_RESPONSE_CONTENT_TYPE = 'text/event-stream';

const buildProjectConversationStreamPath = (
  projectId: string,
  conversationId: string,
): string => {
  return `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(
    conversationId,
  )}/messages/stream`;
};

const normalizeSseBuffer = (buffer: string): string => {
  return buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const splitSseFrames = (
  buffer: string,
): {
  frames: string[];
  remainder: string;
} => {
  const frames: string[] = [];
  let normalizedBuffer = buffer;
  let separatorIndex = normalizedBuffer.indexOf('\n\n');

  while (separatorIndex >= 0) {
    frames.push(normalizedBuffer.slice(0, separatorIndex));
    normalizedBuffer = normalizedBuffer.slice(separatorIndex + 2);
    separatorIndex = normalizedBuffer.indexOf('\n\n');
  }

  return {
    frames,
    remainder: normalizedBuffer,
  };
};

const parseSseFrameData = (frame: string): string | null => {
  const dataLines = frame
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith(':'))
    .flatMap((line) => {
      if (!line.startsWith('data:')) {
        return [];
      }

      return [line.slice(5).trimStart()];
    });

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
};

const parseStreamEvent = (payload: string): ProjectConversationStreamEvent => {
  let parsedEvent: unknown;

  try {
    parsedEvent = JSON.parse(payload);
  } catch (error) {
    throw new ApiError(
      '项目对话流返回了无法解析的事件数据',
      502,
      'PROJECT_CONVERSATION_STREAM_INVALID_EVENT',
      error,
    );
  }

  if (
    !parsedEvent ||
    typeof parsedEvent !== 'object' ||
    !('version' in parsedEvent) ||
    !('type' in parsedEvent) ||
    !('sequence' in parsedEvent) ||
    !('conversationId' in parsedEvent) ||
    !('clientRequestId' in parsedEvent)
  ) {
    throw new ApiError(
      '项目对话流事件缺少必要字段',
      502,
      'PROJECT_CONVERSATION_STREAM_INVALID_EVENT',
      parsedEvent,
    );
  }

  const eventType = (parsedEvent as { type?: unknown }).type;
  const supportedEventTypes = new Set<ProjectConversationStreamEventType>([
    'ack',
    'delta',
    'sources_seed',
    'done',
    'error',
  ]);

  if (typeof eventType !== 'string' || !supportedEventTypes.has(eventType as ProjectConversationStreamEventType)) {
    throw new ApiError(
      '项目对话流返回了未知事件类型',
      502,
      'PROJECT_CONVERSATION_STREAM_INVALID_EVENT',
      parsedEvent,
    );
  }

  return parsedEvent as ProjectConversationStreamEvent;
};

const buildStreamApiError = async (
  response: Response,
  fallbackMessage: string,
): Promise<ApiError> => {
  const requestId = response.headers.get('x-request-id') ?? undefined;
  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: unknown = null;

  try {
    responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    responseBody = null;
  }

  const payload = extractApiErrorPayload(responseBody, {
    message: fallbackMessage,
    requestId,
  });

  return new ApiError(
    payload.message,
    response.status,
    payload.code,
    payload.detail,
    payload.requestId,
  );
};

export const streamProjectConversationMessage = async (
  projectId: string,
  conversationId: string,
  payload: CreateProjectConversationStreamMessageRequest,
  options: StreamProjectConversationMessageOptions,
): Promise<void> => {
  const token = getToken();
  const response = await fetch(
    buildProjectConversationStreamPath(projectId, conversationId),
    {
      method: 'POST',
      headers: {
        accept: STREAM_RESPONSE_CONTENT_TYPE,
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    },
  );

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    throw await buildStreamApiError(
      response,
      '发送项目对话流请求失败，请稍后重试',
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes(STREAM_RESPONSE_CONTENT_TYPE)) {
    throw await buildStreamApiError(
      response,
      '项目对话流返回了非预期响应格式',
    );
  }

  if (!response.body) {
    throw new ApiError(
      '项目对话流未返回可读取的数据流',
      502,
      'PROJECT_CONVERSATION_STREAM_EMPTY_BODY',
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += normalizeSseBuffer(decoder.decode(value, { stream: true }));
    const { frames, remainder } = splitSseFrames(buffer);
    buffer = remainder;

    for (const frame of frames) {
      const payloadText = parseSseFrameData(frame);

      if (!payloadText) {
        continue;
      }

      await options.onEvent(parseStreamEvent(payloadText));
    }
  }

  const tailPayload = parseSseFrameData(
    normalizeSseBuffer(buffer + decoder.decode()),
  );

  if (tailPayload) {
    await options.onEvent(parseStreamEvent(tailPayload));
  }
};
