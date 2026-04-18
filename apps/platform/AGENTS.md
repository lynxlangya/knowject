# AGENTS.md

## 1. 目录职责

- 本目录负责 Knowject 前端产品行为：认证后壳层、全局资产页、项目态页面、设置中心，以及与后端正式接口的 UI 编排。
- 这里不定义后端契约真相；接口、SSE 与错误语义以 `docs/contracts/*` 和 `apps/api` 实现为准。

## 2. 先读什么

1. 根 `AGENTS.md`
2. `apps/platform/README.md`
3. `docs/current/architecture.md`
4. 若任务在项目页，再读 `src/pages/project/AGENTS.md`

## 3. 本层不能猜的事实

- 路由与页面职责边界
- i18n 文案来源、locale 行为与 guard 测试要求
- Tailwind canonical 写法
- 页面壳层 / 视图组件 / domain hooks 的分层职责
- 项目对话的 SSE、source、citation 语义

## 4. 边界

- 页面壳层负责状态、副作用、事件编排。
- 展示组件只负责视图，不埋业务流程判断。
- 可复用抽象进入 `src/app/*` 或共享目录前，先确认是否已有稳定复用压力。
- 与 `apps/api` 的交互优先经 `src/api/*`，不要在页面层手写 transport 细节。

## 5. 默认验证

- `pnpm --filter platform check-types`
- 需要回归 UI 构建或路由装配时：`pnpm --filter platform build`

## 6. 文档同步

- 路由、页面命名、数据流、storage key、layout 边界变化时，回推：
  - `docs/current/architecture.md`
  - `apps/platform/README.md`
  - 必要时 `docs/current/project-chat-sources.md`
