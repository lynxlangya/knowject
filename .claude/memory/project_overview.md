---
name: 项目概览
description: Knowject 的快速上下文入口，只做摘要，不作为事实源
type: project
---

## 项目阶段

- 当前处于“主链路已打通、AI 体验与运行时持续收口”的阶段。
- 正式事实仍以 `docs/current/*` 与源码为准；本文件只负责帮助 agent 快速进入上下文。

## 技术栈

- 前端：React 19 + Vite 7 + Ant Design 6 + Tailwind CSS 4
- 后端：Express 4 + TypeScript + MongoDB
- 索引：FastAPI + uv + Chroma
- 仓库：pnpm workspace + Turborepo

## 主体边界

- `apps/platform`：登录后产品壳、项目页、全局资产页、设置中心
- `apps/api`：正式业务 API、auth/envelope/locale、项目/知识/技能/智能体模块
- `apps/indexer-py`：文档解析、分块、embedding、Chroma 写删侧
- `packages/request`：共享请求封装

## 先读哪些事实

- 仓库级现状：`docs/current/architecture.md`
- 项目对话与 source/citation：`docs/current/project-chat-sources.md`
- 接口契约：`docs/contracts/*`
- 工程治理：`docs/standards/*`

## 当前热点

- 前端热点：`apps/platform/src/pages/project/ProjectChatPage.tsx`
- 前端热点：`apps/platform/src/pages/project/useProjectConversationTurn.ts`
- 前端热点：`apps/platform/src/app/layouts/components/AppSider.tsx`
- 后端热点：`apps/api/src/modules/knowledge/knowledge.repository.ts`
- 后端热点：`apps/api/src/modules/projects/*`

## 协作提示

- 根 `AGENTS.md` 负责总入口；进入 `apps/platform`、`apps/api`、`apps/indexer-py` 及对应热点目录后，继续读最近的子目录 `AGENTS.md`。
- `.claude/*` 只做加速摘要，不覆盖 `docs/current/*`、`docs/contracts/*` 与源码。
