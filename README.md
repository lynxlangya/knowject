# 知项 · Knowject

让项目知识，真正为团队所用。

知项（Knowject）是一个面向开发团队的项目级 AI 知识助手，帮助团队把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作都建立在真实项目语境之上。

## 项目结构

```text
apps/
  platform/   前端应用（React + Vite + Ant Design）
  api/        后端服务（Express + TypeScript）
packages/
  request/    HTTP 请求封装（@knowject/request）
  ui/         通用 UI 组件（@knowject/ui）
```

## 运行要求

- Node.js >= 22
- pnpm 10

## 本地开发

```bash
pnpm install
pnpm dev
```

默认端口：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 关键接口（占位）

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/memory/overview`（需 Bearer Token）
- `POST /api/memory/query`（需 Bearer Token）

## 验证命令

```bash
pnpm check-types
pnpm build
```
