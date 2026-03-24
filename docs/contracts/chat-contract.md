# Chat Contract (Project Conversations)

本文件是 **冻结的实现契约**（frozen contract），仅描述当前已实现并被前后端依赖的对话流式协议与 source/citation 语义。

范围：

- 项目对话写侧 SSE：`POST /api/projects/:projectId/conversations/:conversationId/messages/stream`
- `ProjectConversationMessageResponse` 的 `sources[] / citationContent` 结构
- `sourceKey`、`sources_seed` 事件、以及 draft `[[sourceN]]` transport token 的约束与语义

非范围：

- 页面 UI/交互（见 `docs/current/architecture.md`）
- roadmap / 未来计划

## 1. Streaming Endpoint

### 1.1 Request

`POST /api/projects/:projectId/conversations/:conversationId/messages/stream`

Headers:

- `Accept: text/event-stream`
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (若已登录)

Body (stream request contract):

```ts
{
  content: string;
  clientRequestId: string;
  targetUserMessageId?: string;
}
```

- `content` 必填，服务端按 “trim 后非空” 语义处理。
- `clientRequestId` 对 `/messages/stream` 为必填，用于幂等与端到端关联（UI、SSE events、draft/persisted handoff）。
- `targetUserMessageId` 表示在同一 conversation 内以某条 user message 为目标进行 replay/edit 写入。

### 1.2 Response Transport (SSE)

响应为 `text/event-stream`，每个 SSE frame 的 `data:` 为 **单个 JSON 对象**（即一个事件），由客户端按 SSE 规则拆帧并 `JSON.parse`。

事件 JSON 顶层必须包含以下字段（`ProjectConversationStreamEventBase`）：

```ts
{
  version: "v1";
  type: "ack" | "delta" | "sources_seed" | "done" | "error";
  sequence: number;
  conversationId: string;
  clientRequestId: string;
}
```

## 2. Event Types

### 2.1 `ack`

```ts
{
  type: "ack";
  userMessageId: string;
  userMessagePersisted: boolean;
}
```

语义：

- 表示 user message 的服务端接收与（可选）落库确认。
- `userMessageId` 为服务端最终 message id（前端会用它替换本地 pending user bubble id）。

### 2.2 `delta`

```ts
{
  type: "delta";
  delta: string;
}
```

语义：

- `delta` 作为 assistant message 的增量文本片段，客户端按到达顺序拼接形成 streaming draft content。
- `delta` 文本允许包含 **draft transport token**（见 4.1）。

### 2.3 `sources_seed`

```ts
{
  type: "sources_seed";
  sources: Array<{
    id: string;
    sourceKey: string;
    knowledgeId: string;
    documentId: string;
    sourceLabel: string;
    status: "seeded";
  }>;
}
```

语义：

- `sources_seed` 是 “源引用种子事件”，用于在 **assistant 仍处于 streaming draft** 且还没有最终 `sources[]` 时，提前提供可点击的 source 列表骨架（按 `sourceKey` 分组）。
- seed item 只承诺最小可展示信息：`id + sourceKey + knowledgeId + documentId + sourceLabel`；不包含 chunk/snippet/distance。
- live transport 只会在首个非空 `delta` 发送前刷出一次 `sources_seed`；若在首个非空 `delta` 前失败或取消，则不会发送 seed 事件。

### 2.4 `done`

```ts
{
  type: "done";
  assistantMessageId: string;
  assistantMessagePersisted: true;
  finishReason: "stop" | "length" | "cancelled" | "unknown";
  assistantMessage: ProjectConversationMessageResponse;
  conversationSummary: {
    id: string;
    projectId: string;
    title: string;
    updatedAt: string;
    preview: string;
  };
}
```

语义：

- 表示本次 turn 已结束，且 assistant message 已落库（`assistantMessagePersisted: true`）。
- `assistantMessage` 是最终 persisted assistant message 的真相源（包含可选 `sources[] / citationContent`）。

### 2.5 `error`

```ts
{
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}
```

语义：

- 表示本次 SSE turn 失败。
- 客户端可用 `retryable` 决定是否提示用户重试。

## 3. Persisted Message Payload

`ProjectConversationMessageResponse`（持久化消息结构）：

```ts
{
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;

  sources?: Array<{
    id: string;
    sourceKey: string;
    knowledgeId: string;
    documentId: string;
    chunkId: string;
    chunkIndex: number;
    source: string;   // label
    snippet: string;
    distance: number | null;
  }>;

  citationContent?: {
    version: 1;
    sentences: Array<{
      id: string;
      text: string;
      sourceIds: string[];
      grounded: boolean;
    }>;
  };

  starred: boolean;
  starredAt: string | null;
  starredBy: string | null;
}
```

约束：

- `sources[].id` 是 message-local 稳定 id；`citationContent.sentences[].sourceIds[]` 引用该 `id`。
- `citationContent` 可选；当不存在或不通过校验时，客户端会回退到 legacy source 渲染路径。

## 4. Source Semantics

### 4.1 Draft `[[sourceN]]` Transport Token

Streaming `delta` 文本允许出现以下 token（它们是传输层标注，不是最终事实源）：

- Draft token：`[[sourceN]]`，其中 `N` 为正整数（例如 `[[source1]]`）。
- Legacy token：`[[SOURCE_TAG:1,2]]`，用于兼容旧式 “数字索引” 标注（会被解析为 `source1/source2`）。

契约语义：

- token 的唯一作用是：在 streaming 或 legacy fallback 路径中，将文本位置与 `sourceKey` 建立弱关联。
- 客户端必须把 token 视为 **可选**：不能要求 persisted `content` 必须包含 token 才能展示 sources。

### 4.2 `sourceKey`

`sourceKey: string` 是 sources 的可视化分组与引用标识，满足：

- 在 UI 内作为 “source 标签” 的稳定键（例如 `source1`）。
- `sources_seed.sources[].sourceKey` 与 persisted `sources[].sourceKey` 在同一 turn 内应保持一致，以便 draft-to-persisted handoff 平滑过渡。

注：`sourceKey` 的生成策略属于实现细节，但前端会按 “同一 knowledgeId + documentId” 聚合展示，并依赖 `sourceKey` 在该聚合维度上稳定。
