# Frontend Rules

## 组件分层约定

- 登录页采用"编排 + 视图组件 + 常量配置"分层：`LoginPage.tsx` 只做状态/副作用/提交流程，`components/*` 只做展示，`constants.ts` 维护动画与文案常量。
- `SettingsPage.tsx` 采用"页面壳层 + controller hook + tab components + constants"分层。
- `KnowledgeManagementPage.tsx` 采用"页面壳层 + 列表状态 hook + sidebar/detail tab components + domain hooks"分层。
- `ProjectChatPage.tsx` 采用"页面壳层 + settings/detail/turn/actions hooks + adapters/components"分层。
- `SearchPanel` 字段渲染与显示策略沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`，主组件仅保留状态编排与事件处理。

## 目录职责

- `app/auth/`：token 管理（`knowject_token`、`knowject_auth_user`）
- `app/guards/`：受保护路由守卫
- `app/layouts/`：登录后布局与侧栏（`AppSider.tsx` 是结构治理 hotspot）
- `app/navigation/`：路由、路径构建、兼容重定向
- `app/project/`：项目状态、共享类型、Mock 资产目录
- `app/providers/`：`LocaleProvider`（locale 解析顺序：`auth.user.locale → knowject_locale_guest → en`）、`AntdProvider`
- `api/`：所有后端请求封装，统一在此层解包 response envelope
- `pages/`：登录页、主页、项目页、全局资产页
- `i18n/`：i18next 初始化与运行时资源（6 个 namespace：auth/navigation/pages/project/api-errors/common）

## 路由约定

Canonical 路由：
- `/project/:projectId/overview|chat|chat/:chatId|resources|members`

兼容跳转（只做 redirect，不作为业务入口）：
- `/workspace` → `/home`
- `/home/project/*` → `/project/:projectId/*`

## i18n 约束

- 所有用户可见文案必须走 `react-i18next`，不能保留自然语言字面量
- helper / constants 产出可见文案时同样必须从 i18n 读取
- locale source guard 测试在 `apps/platform/tests/*.locale.test.ts`，改动文案时须通过

## Tailwind 约束

- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）

## 结构治理 Hotspot

每次改动前重新对齐职责：
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`

文件行数接近或超过 550 行且存在多重职责时，须触发结构治理判断。
