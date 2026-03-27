# CLAUDE.md

项目知识管理平台：**知项 · Knowject** — 让项目知识真正为团队所用。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite 7 + Ant Design 6 + Tailwind CSS 4 |
| 后端 | Express 4 + TypeScript + MongoDB Node.js Driver |
| 索引 | FastAPI + uv |
| 向量 | Chroma |
| 仓库 | pnpm + Turborepo (monorepo) |

## 目录结构

```
apps/
  platform/   # 前端 React 应用
  api/        # 后端 Express API
  indexers-py/ # Python 索引服务
packages/
  request/   # Axios 请求封装
  ui/        # 通用 UI 组件
docker/      # 容器化
docs/        # 唯一正式文档主源
```

详细的前端目录职责、后端模块、路由约定见对应规则文件。

## 事实源优先级

1. `docs/current/architecture.md` + 源码 = 当前实现事实
2. `docs/standards/` = 工程治理规则
3. `docs/contracts/` = 接口契约
4. `docs/plans/` = 执行计划
5. `AGENTS.md` = 项目级协作长期指令

## 协作约定

| 主题 | 规范文件 |
|---|---|
| 前端 UI / 设计系统 | [.claude/rules/design.md](.claude/rules/design.md) |
| 前端工程规范 | [.claude/rules/frontend.md](.claude/rules/frontend.md) |
| 后端工程规范 | [.claude/rules/backend.md](.claude/rules/backend.md) |
| 安全红线 | [.claude/rules/safety.md](.claude/rules/safety.md) |
| Git 约定 | [.claude/rules/git.md](.claude/rules/git.md) |

## 常用命令

```bash
pnpm dev                  # 全量启动
pnpm dev:web              # 仅前端
pnpm dev:api              # 仅后端
pnpm dev:deps:up/down     # Docker 依赖服务
pnpm --filter platform check-types && pnpm --filter platform build  # 前端验证
pnpm --filter api check-types && pnpm --filter api build            # 后端验证
```

## 结构治理 Hotspot

文件行数接近或超过 550 行且存在多重职责时，须触发结构治理判断：

- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`
- `apps/api/src/modules/knowledge/knowledge.repository.ts`

这三个文件的详细说明见 [.claude/rules/frontend.md](.claude/rules/frontend.md) 和 [.claude/rules/backend.md](.claude/rules/backend.md)。
