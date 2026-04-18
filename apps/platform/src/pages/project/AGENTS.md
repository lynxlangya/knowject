# AGENTS.md

## 1. 目录职责

- 本目录只覆盖项目态页面：`overview / chat / resources / members` 及其 hooks、adapters、components。
- 这是当前前端最复杂的业务域，优先关注编排边界而不是视觉细节。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/platform/AGENTS.md`
3. `apps/platform/README.md` 中 project page 相关段落
4. `docs/current/project-chat-sources.md`
5. `docs/contracts/chat-contract.md`

## 3. 本层不能猜的事实

- source / citation / SSE 语义
- `clientRequestId`、`targetUserMessageId`、replay/edit 的后端行为
- rail / drawer / draft-to-persisted handoff 的当前实现边界
- project context、global assets、settings 的读写关系

## 4. 边界

- 页面壳层只做编排。
- chat 相关逻辑优先落 hooks、adapters、components，不把 transport 细节塞回页面壳层。
- source / citation / stream 语义以 contract 和 current facts 为准，不从 UI 外观反推。
- 需要改项目头部、概览、资源或成员的数据来源时，先确认 `useProjectPageContext` 与 page helper 链路。

## 5. 热点文件

- `ProjectChatPage.tsx`
- `useProjectConversationTurn.ts`
- `projectChat.adapters.ts`
- `projectChatBubble.components.tsx`

## 6. 默认验证

- `pnpm --filter platform check-types`
- 需要时补跑与 project chat / project page 直接相关的测试

## 7. 文档同步

- 若改动 source/citation/stream 交互或项目页主数据链路，回推：
  - `docs/current/project-chat-sources.md`
  - `docs/contracts/chat-contract.md`
  - `apps/platform/README.md`
