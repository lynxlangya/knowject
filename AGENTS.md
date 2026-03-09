# AGENTS.md

## 0. 继承关系

- 默认继承全局规则：`/Users/langya/.codex/AGENTS.md`。
- 本文件仅定义 Knowject 项目的覆盖规则与项目上下文补充。
- 全局规则与本文件不冲突时，按全局规则执行。

## 1. 当前项目架构（2026-03-05）

```text
apps/
  platform/  前端应用（React + Vite）
  api/       后端应用（Express + TypeScript）
packages/
  request/   请求库（@knowject/request）
  ui/        UI 组件库（@knowject/ui）
```

## 2. 模块职责边界

- `apps/platform`：页面、路由、鉴权状态与前端 API 适配。
- `apps/api`：提供本地联调接口（health/auth/memory），不直接耦合前端实现细节。
- `packages/request`：HTTP 基础能力（拦截器、错误、去重、下载）。
- `packages/ui`：可复用 UI 组件，不承载业务语义。

## 3. 开发约束补充

- 新增业务页面默认放在 `apps/platform/src/pages`。
- 新增后端接口默认放在 `apps/api/src/routes`，并保持 `/api/*` 路由前缀。
- 涉及品牌文本必须使用：`知项 · Knowject` 与 `让项目知识，真正为团队所用。`。
- Tailwind 类名必须使用 canonical 写法：`!` 重要标记使用后缀形式（如 `mb-1!`），禁止前缀形式（如 `!mb-1`），避免触发 `suggestCanonicalClasses` 警告。

## 4. 页面与组件分层约定（2026-03-05）

- 登录页采用“编排 + 视图组件 + 常量配置”分层：
  - `apps/platform/src/pages/login/LoginPage.tsx` 仅负责状态、副作用与提交流程。
  - `apps/platform/src/pages/login/components/*` 负责纯展示结构。
  - `apps/platform/src/pages/login/constants.ts` 维护动画/文案/样式常量与本地存储工具函数。
- `SearchPanel` 的字段渲染与显示策略统一沉淀到 `packages/ui/src/components/SearchPanel/searchPanel.helpers.tsx`，主组件仅保留状态编排与事件处理。

## 5. 前端工作台与项目态约定（2026-03-05）

- 登录后默认落点调整为 `/home`，`/workspace` 仅保留为兼容入口并重定向到 `/home`。
- 平台主导航固定为：`/home`、`/knowledge`、`/skills`、`/agents`、`/members`、`/analytics`、`/settings`。
- 登录后布局采用“左侧全局侧栏 + 右侧内容区”结构：
  - 左侧固定包含品牌区、导航菜单、“我的项目”列表与添加入口。
  - 顶部全局 Header 不再作为登录后主导航承载。
- 项目状态由 `apps/platform/src/app/project/ProjectContext.tsx` 统一管理：
  - `projects` 持久化到 `localStorage`（键：`knowject_projects`）。
  - 项目创建入口采用弹框表单：项目名称 + 知识库/成员/智能体/技能（共享 Mock 资产源）。
  - 项目页 canonical 路由为 `/project/:projectId/*`，子路由包含：
    - `/project/:projectId/overview`
    - `/project/:projectId/chat`
    - `/project/:projectId/chat/:chatId`
    - `/project/:projectId/resources`
    - `/project/:projectId/members`
  - `/project/:projectId` 必须重定向到 `/project/:projectId/overview`。
  - 旧路径 `/project/:projectId/knowledge|skills|agents` 仅做兼容重定向，统一跳转到 `/project/:projectId/resources?focus=*`。
  - 旧路径 `/home/project/*` 仅做兼容重定向，不作为业务 canonical。
  - 项目内一级导航固定为：`概览`、`对话`、`资源`、`成员`。
  - 项目内 `资源` 页只展示已接入的全局资产；全局 `知识库 / 技能 / 智能体` 页面负责资产治理、版本与复用，不承载项目内编排。
- 主菜单在 `/project/*` 路由下不高亮“主页”（项目态与全局菜单态解耦）。
- 主页 `apps/platform/src/pages/home/HomePage.tsx` 仅承载首页空态引导，不再承载项目会话编排。
- 全局 `知识库 / 技能 / 智能体` 页首版定位为“全局资产管理中心”，需明确区分于项目内 `资源` 页。

## JavaScript REPL (Node)
- Use `js_repl` for Node-backed JavaScript with top-level await in a persistent kernel.
- `js_repl` is a freeform/custom tool. Direct `js_repl` calls must send raw JavaScript tool input (optionally with first-line `// codex-js-repl: timeout_ms=15000`). Do not wrap code in JSON (for example `{"code":"..."}`), quotes, or markdown code fences.
- Helpers: `codex.tmpDir` and `codex.tool(name, args?)`.
- `codex.tool` executes a normal tool call and resolves to the raw tool output object. Use it for shell and non-shell tools alike.
- To share generated images with the model, write a file under `codex.tmpDir`, call `await codex.tool("view_image", { path: "/absolute/path" })`, then delete the file.
- Top-level bindings persist across cells. If you hit `SyntaxError: Identifier 'x' has already been declared`, reuse the binding, pick a new name, wrap in `{ ... }` for block scope, or reset the kernel with `js_repl_reset`.
- Top-level static import declarations (for example `import x from "pkg"`) are currently unsupported in `js_repl`; use dynamic imports with `await import("pkg")` instead.
- Avoid direct access to `process.stdout` / `process.stderr` / `process.stdin`; it can corrupt the JSON line protocol. Use `console.log` and `codex.tool(...)`.

# ExecPlans

在编写复杂功能、迁移或重大重构时，从设计到实施阶段，请使用如.agent/PLANS.md中所述的执行计划。

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- canvas-design: Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations. (file: /Users/langya/.codex/skills/canvas-design/SKILL.md)
- find-skills: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. (file: /Users/langya/.codex/skills/find-skills/SKILL.md)
- frontend-design: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. (file: /Users/langya/.codex/skills/frontend-design/SKILL.md)
- ios-design-guidelines: Apple Human Interface Guidelines for iPhone. Use when building, reviewing, or refactoring SwiftUI/UIKit interfaces for iOS. Triggers on tasks involving iPhone UI, iOS components, accessibility, Dynamic Type, Dark Mode, or HIG compliance. (file: /Users/langya/.codex/skills/ios/SKILL.md)
- pdf: Use when tasks involve reading, creating, or reviewing PDF files where rendering and layout matter; prefer visual checks by rendering pages (Poppler) and use Python tools such as `reportlab`, `pdfplumber`, and `pypdf` for generation and extraction. (file: /Users/langya/.codex/skills/pdf/SKILL.md)
- twitter-algorithm-optimizer: Analyze and optimize tweets for maximum reach using Twitter's open-source algorithm insights. Rewrite and edit user tweets to improve engagement and visibility based on how the recommendation system ranks content. (file: /Users/langya/.codex/skills/twitter-algorithm-optimizer/SKILL.md)
- ui-ux-pro-max: UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient. Integrations: shadcn/ui MCP for component search and examples. (file: /Users/langya/.codex/skills/ui-ux-pro-max/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/langya/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/langya/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
