# AGENTS.md

## 1. 目录职责

- 本目录只覆盖项目域与 conversation runtime：项目模型、会话读写、SSE turn orchestration、provider runtime、citation/source 事件与 message 持久化。
- 不扩展到 knowledge 索引实现细节。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/api/AGENTS.md`
3. `docs/contracts/chat-contract.md`
4. `docs/current/project-chat-sources.md`
5. `apps/api/README.md` 中 project conversation 相关段落

## 3. 本层不能猜的事实

- SSE 事件顺序与字段
- `clientRequestId` 与 `targetUserMessageId`
- replay/edit 的裁剪与持久化规则
- `sources_seed / delta / done / citation_patch / error` 的职责分配
- provider/runtime 只是生成层，不拥有业务主状态

## 4. 边界

- router 负责 transport；service/turn runtime 负责业务流程；provider 负责上游模型兼容。
- persisted conversation/message 真相在业务层，不在前端 draft，也不在 provider stream。
- source/citation 的字段和时序先看 contract，再看实现。

## 5. 默认验证

- 优先跑 `projects` 模块测试，尤其是 SSE/stream、provider timeout、citation 与 replay/edit 相关测试。
- 至少补一项与本次改动直接相关的 `projects.service.test.ts` 或 router/stream 测试。

## 6. 文档同步

- 若改动项目对话 contract、SSE 事件、replay/edit 语义或 citation/source 行为，回推：
  - `docs/contracts/chat-contract.md`
  - `docs/current/project-chat-sources.md`
  - `apps/api/README.md`
