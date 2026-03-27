---
paths:
  - "apps/api/**/*.ts"
  - "apps/indexer-py/**/*.py"
---

# Backend Rules

## 模块职责

当前已落地模块（`apps/api/src/modules/`）：
- `auth`、`projects`（含成员接口）、`members`、`knowledge`、`skills`、`agents`、`settings`

## 模块拆分约定

- `apps/api/src/modules/settings/settings.service.ts` 与 `apps/api/src/modules/knowledge/knowledge.service.ts` 保持 facade；复杂逻辑下沉到 helper 子模块。
- facade + helper submodules 拆分 service / repository 内部职责，对外接口保持不变

## 路由模式

验证新路由使用已建立模式：
- `requireAuth` where appropriate
- `asyncHandler(...)`
- `getRequiredAuthUser(...)` for actor extraction
- `sendSuccess(...)` / `sendCreated(...)` for JSON responses

## 数据存储

- **MongoDB**：唯一正式结构化存储，数据库名 `knowject`，应用用户 `knowject_app`
- **Chroma**：向量存储，collection 命名与检索边界见 `docs/contracts/chroma-decision.md`

## API 挂载约定

新增正式业务后端接口默认按模块放在 `apps/api/src/modules/*`，并在 `apps/api/src/app/create-app.ts` 统一挂载 `/api/*` 路由；`health`、`memory` 这类系统 / 演示路由可继续放在 `apps/api/src/routes`。

## internal 路由安全

- internal 路由在非 development 环境须 fail-close
- 见 `apps/indexer-py` 实现

## 验证命令

```bash
pnpm --filter api check-types
pnpm --filter api build
```

## 结构治理 Hotspot

完整列表见 [CLAUDE.md](../CLAUDE.md) 中的"结构治理 Hotspot"段落。
