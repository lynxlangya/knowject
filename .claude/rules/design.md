---
paths:
  - "apps/platform/**/*.tsx"
  - "apps/platform/**/*.ts"
  - "apps/platform/**/*.css"
  - "packages/ui/**/*"
---

# Design System — 知项 · Knowject

本项目的 UI 拥有明确的设计系统，所有改动须符合本规范。

## 品牌色板

| Token                  | 色值      | 用途                   |
| ---------------------- | --------- | ---------------------- |
| `primary`              | `#28B8A0` | 主色调、图标、强调元素 |
| `primaryBorder`        | `#C2EDE6` | 卡片/面板边框          |
| `primarySurface`       | `#F2FDFB` | 薄荷绿背景（低饱和度） |
| `primaryText`          | `#1A8A77` | eyebrow、标签文字      |
| `primarySurfaceStrong` | `#EDFDF9` | 强背景色               |
| `textBody`             | `#4A6260` | 正文描述文字           |

品牌渐变（用于图标/徽章，**不可用于大面背景**）：

```ts
heroGradient: "linear-gradient(145deg, #1E3580 0%, #2A5F8F 35%, #28B8A0 100%)";
iconGradient: "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, #5DDDCF 30%, #28B8A0 100%)";
```

## 字体

- **Display / 标题**: `Syne`（Google Fonts）
- **Body / 正文**: `Plus Jakarta Sans`（Google Fonts），中文字体回退至 `Noto Sans SC`

## 圆角层级

| 用途             | 圆角值                                   |
| ---------------- | ---------------------------------------- |
| sidebar 项目按钮 | `var(--radius-sidebar-item)` (1rem)      |
| sidebar 面板     | `var(--radius-sidebar-panel)` (1.375rem) |
| 页面级卡片       | `1.375rem` (rounded-3xl)                 |
| 内容卡片         | `0.75rem` (rounded-card)                 |
| 小面板/标签      | `0.5rem` (rounded-panel)                 |

## 卡片层级规范

**三层卡片系统：**

1. **页面级卡片** — `rounded-3xl border border-[#C2EDE6] shadow-surface`
2. **内容卡片** — `rounded-card border border-slate-200 bg-white`
3. **悬浮卡片** — hover 时 `border-[#C2EDE6] shadow-[0_4px_16px_rgba(15,42,38,0.07)]`

**禁止**：

- hover 时使用 `translate-y`（会导致抖动）
- 卡片使用超过 2 层 glass-morphism 叠加

## 动效规范

**渐入动画**（指标卡、列表项）：

```css
@keyframes metricFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

使用 `animationDelay` 实现逐项错开（如 `index * 60ms`）。

**Hover 过渡**：

- 推荐：`box-shadow` _elevation_
- 避免：`translate-y`（密集列表中会产生抖动）
- 过渡时长：默认 `duration-200`

**顶部强调条**（指标卡可选）：

```jsx
<span
  className="absolute inset-x-0 top-0 h-0.5 rounded-b-full opacity-60 group-hover:opacity-100"
  style={{ backgroundColor: "#28B8A0" }}
/>
```

## i18n

- 所有用户可见文案必须走 `react-i18next`
- helper / constants 产出可见文案时同样必须从 i18n 读取
- 测试：`apps/platform/tests/*.locale.test.ts`

## Tailwind 约束

- `!` 重要标记使用**后缀形式**：`mb-1!`（正确），`!mb-1`（禁止）
- 优先使用品牌色而非 antd 默认色值（如 `text-slate-500` 而非 antd 默认）

## 组件分层约定

- **页面壳层** — 状态/副作用/事件编排
- **视图组件** — 仅做展示
- **domain hooks / helpers** — 业务逻辑与渲染策略分离

示例：

- `LoginPage.tsx` → 壳层，`components/*` → 视图，`constants.ts` → 动画与文案常量
- `ProjectChatPage.tsx` → 壳层 + hooks + adapters + components
- `KnowledgeManagementPage.tsx` → 壳层 + 列表状态 hook + sidebar/detail tab components

## 不要做什么

- **不要**引入与品牌色不一致的 UI 模式（如紫色渐变、emerald 默认色）
- **不要**使用 generic 字体（Inter、Roboto、Arial、Space Grotesk）
- **不要**在 hover 时用 `translate-y` 提升元素
- **不要**在非图标场景使用 `heroGradient`
- **不要**在 glass-morphism 中叠加超过 2 层透明背景
