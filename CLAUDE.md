# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 事实源与文档优先级

- **当前实现事实**：`docs/current/architecture.md` + 源码，优先于任何蓝图文档
- **工程治理规则**：`docs/standards/`，核心文件是 `engineering-governance-overview.md` 与 `code-structure-governance.md`
- **接口契约**：`docs/contracts/`（auth、chat、chroma）
- **执行计划**：`docs/plans/`
- **AGENTS.md**：项目级协作长期指令入口
- 快速接手阅读顺序见 `docs/handoff/handoff-guide.md`

## 常用命令

```bash
# 开发
pnpm dev:web              # 仅启动前端
pnpm dev:api              # 仅启动 API
pnpm dev                  # turbo 全量启动

# 依赖服务（Docker）
pnpm dev:deps:up          # 启动 mongodb + chroma
pnpm dev:deps:down        # 停止
pnpm dev:deps:health      # 健康检查

# 前端
pnpm --filter platform dev
pnpm --filter platform check-types
pnpm --filter platform build

# API
pnpm --filter api dev
pnpm --filter api check-types
pnpm --filter api build

# 验证（仓库根）
pnpm verify:global-assets-foundation
pnpm verify:index-ops-project-consumption

# 构建全量
pnpm build
```

## 架构概览

### Monorepo 结构

```
apps/platform/    前端：React 19 + Vite 7 + Ant Design 6 + Tailwind CSS 4
apps/api/         后端：Express 4 + TypeScript + MongoDB Node.js Driver
apps/indexer-py/  索引服务：FastAPI + uv（解析/分块/向量写删）
packages/request/ @knowject/request：Axios 请求封装
packages/ui/      @knowject/ui：通用 UI 组件
docker/           容器化基线（compose、反代、初始化）
scripts/          仓库命令统一入口
docs/             唯一正式文档主源
```

### 前端核心目录（`apps/platform/src/`）

- `app/auth/`：token 管理（`knowject_token`、`knowject_auth_user`）
- `app/guards/`：受保护路由守卫
- `app/layouts/`：登录后布局与侧栏（`AppSider.tsx` 是结构治理 hotspot）
- `app/navigation/`：路由、路径构建、兼容重定向
- `app/project/`：项目状态、共享类型、Mock 资产目录
- `app/providers/`：`LocaleProvider`（locale 解析顺序：`auth.user.locale → knowject_locale_guest → en`）、`AntdProvider`
- `api/`：所有后端请求封装，统一在此层解包 response envelope
- `pages/`：登录页、主页、项目页、全局资产页
- `i18n/`：i18next 初始化与运行时资源（6 个 namespace：auth/navigation/pages/project/api-errors/common）

### 后端模块（`apps/api/src/modules/`）

当前已落地：`auth`、`projects`（含成员接口）、`members`、`knowledge`、`skills`、`agents`、`settings`

### 当前主要路由

Canonical 路由：
- `/project/:projectId/overview|chat|chat/:chatId|resources|members`

兼容跳转（只做 redirect，不作为业务入口）：
- `/workspace` → `/home`
- `/home/project/*` → `/project/:projectId/*`

### 数据存储

- **MongoDB**：唯一正式结构化存储，数据库名 `knowject`，应用用户 `knowject_app`
- **Chroma**：向量存储，collection 命名与检索边界见 `docs/contracts/chroma-decision.md`

## 环境变量

- 仓库只提交 `.env.example`；本地真实值放 `.env.local`，不进 git
- 运行时按 `.env → .env.local` 顺序加载
- Secret 键支持 `<NAME>_FILE` 形式：`MONGODB_URI_FILE`、`JWT_SECRET_FILE`、`SETTINGS_ENCRYPTION_KEY_FILE`、`KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE`
- 同一 env 文件中禁止同时定义 `NAME` 和 `NAME_FILE`

## 前端规范

详细规范见 [.claude/rules/frontend.md](.claude/rules/frontend.md)

## 后端规范

详细规范见 [.claude/rules/backend.md](.claude/rules/backend.md)

## 安全红线

详细规范见 [.claude/rules/safety.md](.claude/rules/safety.md)

## Git 约定

详细规范见 [.claude/rules/git.md](.claude/rules/git.md)
