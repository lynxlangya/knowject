# Frontend Rules

## 组件分层约定

- **页面壳层** — 状态/副作用/事件编排
- **视图组件** — 仅做展示
- **domain hooks / helpers** — 业务逻辑与渲染策略分离

| 页面 | 分层模式 |
|---|---|
| LoginPage | 壳层 + `components/*` + `constants.ts` |
| SettingsPage | 壳层 + controller hook + tab components + constants |
| KnowledgeManagementPage | 壳层 + 列表状态 hook + sidebar/detail tab components + domain hooks |
| ProjectChatPage | 壳层 + settings/detail/turn/actions hooks + adapters/components |
| ProjectMembersPage | 壳层（无复杂状态则可合并） |

SearchPanel 字段渲染与显示策略沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`。

## 结构治理 Hotspot

每次改动前重新对齐职责：
- `apps/platform/src/pages/project/ProjectChatPage.tsx`
- `apps/platform/src/app/layouts/components/AppSider.tsx`

文件行数接近或超过 550 行且存在多重职责时，须触发结构治理判断。

## i18n 约束

- 所有用户可见文案必须走 `react-i18next`，不能保留自然语言字面量
- helper / constants 产出可见文案时同样必须从 i18n 读取
- locale source guard 测试在 `apps/platform/tests/*.locale.test.ts`，改动文案时须通过

## Tailwind 约束

- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`）
