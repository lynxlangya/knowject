# Engineering Governance Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Knowject's long-term engineering governance foundation by creating the `standards/` source of truth, wiring the review checklist, and syncing every affected documentation entry point before any code cleanup work starts.

**Architecture:** This implementation is documentation-first. First create `docs/standards/` and move the long-lived governance rules there, then update repository entry points and architecture facts so the new directory is discoverable and authoritative, and finally rewire existing implementation plans to reference the standards instead of restating governance rationale. This keeps `standards/` for durable rules, `plans/` for staged execution, and `current/` for repository facts.

**Tech Stack:** Markdown, `docs/*`, `AGENTS.md`, git, Prettier

---

**Scope note:** This plan implements the governance foundation itself. It does **not** execute the downstream code-structure cleanup, config audit, or frontend refactor tasks. Those follow in separate execution plans after the standards land.

**Workspace note:** `apps/platform/src/pages/project/ProjectChatPage.tsx` currently has an unrelated unstaged change in the worktree. Do not stage, revert, or fold that file into this plan's commits.

### Task 1: Create the Standards Directory and Core Overview

**Files:**
- Create: `docs/standards/engineering-governance-overview.md`
- Create: `docs/standards/review-checklist.md`
- Reference: `docs/plans/tasks-engineering-governance-foundation.md`
- Reference: `docs/templates/PLANS.md`

- [ ] **Step 1: Re-read the approved spec and confirm the standards boundary**

Run:

```bash
sed -n '1,260p' docs/plans/tasks-engineering-governance-foundation.md
```

Expected: the spec confirms `standards/` is the long-term home for governance rules, while `plans/` stays execution-only.

- [ ] **Step 2: Create `docs/standards/engineering-governance-overview.md` with the agreed top-level structure**

Write this skeleton first, then fill each section with repository-specific content from the approved spec:

```md
# 工程治理总纲

## 1. 目标与适用范围
## 2. 规则分级
## 3. 例外机制
## 4. 评审门禁
## 5. 标准包索引
## 6. 与 plans / current / contracts 的边界
## 7. 第一阶段主线与后续衔接
```

- [ ] **Step 3: Create `docs/standards/review-checklist.md` as a reusable review gate**

Start with a checklist that can be applied to any future task:

```md
# 工程治理评审清单

## 结构治理
- [ ] 是否触发巨石文件评估
- [ ] 是否存在职责失真

## 注释治理
- [ ] 核心流程是否需要中文意图注释

## 配置与安全
- [ ] 是否引入新的 secrets / 暴露面风险

## 前端通用封装
- [ ] 是否出现稳定复用模式

## 文档同步
- [ ] 是否触发 current / plans / contracts / README / AGENTS 更新

## 例外记录
- [ ] 若延期处理，是否记录位置 / 原因 / 风险 / 去向
```

- [ ] **Step 4: Format the two new docs**

Run:

```bash
pnpm exec prettier --write docs/standards/engineering-governance-overview.md docs/standards/review-checklist.md
```

Expected: Prettier rewrites the files in place without errors.

- [ ] **Step 5: Commit the new standards entry docs**

Run:

```bash
git add -f docs/standards/engineering-governance-overview.md docs/standards/review-checklist.md
git commit -m "docs(codex): add governance overview and review checklist"
```

Expected: one docs-only commit containing the overview and checklist.

### Task 2: Write the Code Structure and Commenting Standards

**Files:**
- Create: `docs/standards/code-structure-governance.md`
- Create: `docs/standards/core-code-commenting.md`
- Reference: `docs/plans/tasks-platform-frontend-refactor.md`
- Reference: `docs/plans/tasks-service-indexing-refactor.md`

- [ ] **Step 1: Capture the file-size threshold and structure smells from the existing plans**

Run:

```bash
rg -n "ProjectChatPage|AppSider|knowledge.repository|巨石|结构治理" docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-service-indexing-refactor.md docs/plans/tasks-engineering-governance-foundation.md
```

Expected: concrete examples and wording that can be reused in the standard.

- [ ] **Step 2: Write `docs/standards/code-structure-governance.md`**

The document must include these exact section headings:

```md
# 代码结构治理标准

## 1. 目标
## 2. 触发条件
## 3. 坏味道判定
## 4. 推荐动作
## 5. 允许例外
## 6. 文档同步要求
## 7. 当前代表性治理对象
```

- [ ] **Step 3: Write `docs/standards/core-code-commenting.md`**

Use this skeleton and keep the emphasis on intent comments instead of noisy inline narration:

```md
# 核心代码中文注释标准

## 1. 目标
## 2. 适用范围
## 3. 必须补注释的场景
## 4. 注释写法要求
## 5. 禁止写法
## 6. 允许例外
## 7. 文档同步要求
```

- [ ] **Step 4: Verify both docs contain the shared governance template sections**

Run:

```bash
rg -n "## 1. 目标|## 4. 推荐动作|## 5. 允许例外|## 6. 文档同步要求" docs/standards/code-structure-governance.md docs/standards/core-code-commenting.md
```

Expected: both files report all required section headings.

- [ ] **Step 5: Format and commit the two standards**

Run:

```bash
pnpm exec prettier --write docs/standards/code-structure-governance.md docs/standards/core-code-commenting.md
git add -f docs/standards/code-structure-governance.md docs/standards/core-code-commenting.md
git commit -m "docs(codex): add structure and commenting standards"
```

Expected: a second docs-only commit for the first two standards.

### Task 3: Write the Config Security and Frontend Abstractions Standards

**Files:**
- Create: `docs/standards/config-security-governance.md`
- Create: `docs/standards/frontend-shared-abstractions.md`
- Reference: `docs/current/docker-usage.md`
- Reference: `docs/contracts/auth-contract.md`
- Reference: `docs/plans/tasks-platform-frontend-refactor.md`

- [ ] **Step 1: Pull the existing configuration and frontend reuse facts**

Run:

```bash
rg -n "secret|internal|暴露|token|shared|token 化|通用|复用" docs/current/docker-usage.md docs/contracts/auth-contract.md docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-engineering-governance-foundation.md
```

Expected: concrete repository terminology for the two standards.

- [ ] **Step 2: Write `docs/standards/config-security-governance.md`**

Include at least:

```md
# 配置与安全治理标准

## 1. 目标
## 2. 触发条件
## 3. 红线风险
## 4. 推荐巡检动作
## 5. 允许例外
## 6. 文档同步要求
```

- [ ] **Step 3: Write `docs/standards/frontend-shared-abstractions.md`**

Include at least:

```md
# 前端通用封装治理标准

## 1. 目标
## 2. 触发条件
## 3. 适合抽离的对象
## 4. 不应过早抽象的场景
## 5. 推荐动作
## 6. 允许例外
## 7. 文档同步要求
```

- [ ] **Step 4: Format and sanity-check the two standards**

Run:

```bash
pnpm exec prettier --write docs/standards/config-security-governance.md docs/standards/frontend-shared-abstractions.md
rg -n "允许例外|文档同步要求" docs/standards/config-security-governance.md docs/standards/frontend-shared-abstractions.md
```

Expected: Prettier succeeds and both docs expose the standard governance sections.

- [ ] **Step 5: Commit the config/frontend standards**

Run:

```bash
git add -f docs/standards/config-security-governance.md docs/standards/frontend-shared-abstractions.md
git commit -m "docs(codex): add config and frontend governance standards"
```

Expected: a third docs-only commit for the config/frontend standards.

### Task 4: Write the Document Sync Standard and Finalize the Standards Index

**Files:**
- Create: `docs/standards/document-sync-governance.md`
- Modify: `docs/standards/engineering-governance-overview.md`
- Modify: `docs/standards/review-checklist.md`
- Reference: `AGENTS.md`
- Reference: `docs/README.md`
- Reference: `docs/current/architecture.md`

- [ ] **Step 1: Extract the existing sync rules from the project instructions**

Run:

```bash
rg -n "必须同步|同步检查并更新文档|更新 `docs|AGENTS.md|README.md" AGENTS.md docs/README.md
```

Expected: the command surfaces the current sync matrix wording that the new standard must absorb.

- [ ] **Step 2: Write `docs/standards/document-sync-governance.md`**

Include the matrix headings below and map each change type to the correct doc family:

```md
# 文档同步治理标准

## 1. 目标
## 2. 触发条件
## 3. 同步矩阵
## 4. 推荐动作
## 5. 允许例外
## 6. 文档同步要求
```

- [ ] **Step 3: Back-link the overview and review checklist to all five standards**

Update `docs/standards/engineering-governance-overview.md` so it links to each standard doc, and update `docs/standards/review-checklist.md` so every checklist group points back to its owning standard.

- [ ] **Step 4: Format and validate the standards directory**

Run:

```bash
pnpm exec prettier --write docs/standards/*.md
rg -n "code-structure-governance|core-code-commenting|config-security-governance|frontend-shared-abstractions|document-sync-governance" docs/standards/engineering-governance-overview.md docs/standards/review-checklist.md
```

Expected: the overview and checklist both reference all five standards by file name.

- [ ] **Step 5: Commit the standards directory completion**

Run:

```bash
git add -f docs/standards/document-sync-governance.md docs/standards/engineering-governance-overview.md docs/standards/review-checklist.md
git commit -m "docs(codex): add document sync governance standard"
```

Expected: a fourth docs-only commit finishing the `standards/` source of truth.

### Task 5: Sync Repository Entry Points and Current Facts

**Files:**
- Modify: `docs/README.md`
- Modify: `.codex/README.md`
- Modify: `.codex/MIGRATION.md`
- Modify: `docs/current/architecture.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the docs index to include `standards/` in structure, reading order, and maintenance rules**

Add `standards/` to `docs/README.md` in:

- the directory tree;
- the category table;
- the reading order;
- the maintenance boundary section.

- [ ] **Step 2: Update `.codex/README.md` and `.codex/MIGRATION.md` for the new directory responsibility**

Both docs must clearly state that:

- `docs/standards/` now holds long-lived engineering governance rules;
- `docs/plans/` remains the execution-plan layer;
- `.agent/` still stays deprecated and out of the new governance flow.

- [ ] **Step 3: Update `AGENTS.md` and `docs/current/architecture.md`**

Add `docs/standards/` to the documented project tree and sync the doc-maintenance rules so future structure or collaboration-rule changes mention the new directory.

- [ ] **Step 4: Format and review all entry-point docs**

Run:

```bash
pnpm exec prettier --write docs/README.md .codex/README.md .codex/MIGRATION.md docs/current/architecture.md AGENTS.md
rg -n "standards/" docs/README.md .codex/README.md .codex/MIGRATION.md docs/current/architecture.md AGENTS.md
```

Expected: each entry-point doc now references `standards/` at least once.

- [ ] **Step 5: Commit the entry-point sync**

Run:

```bash
git add -f docs/README.md .codex/README.md .codex/MIGRATION.md docs/current/architecture.md
git add AGENTS.md
git commit -m "docs(codex): register governance standards across entry docs"
```

Expected: one commit containing the directory and maintenance rule sync.

### Task 6: Rewire Existing Implementation Plans to the Standards

**Files:**
- Modify: `docs/plans/tasks-platform-frontend-refactor.md`
- Modify: `docs/plans/tasks-service-indexing-refactor.md`
- Reference: `docs/standards/code-structure-governance.md`
- Reference: `docs/standards/config-security-governance.md`
- Reference: `docs/standards/review-checklist.md`

- [ ] **Step 1: Add an explicit governance dependency section to the frontend refactor plan**

Update `docs/plans/tasks-platform-frontend-refactor.md` so it states that execution must follow:

- `docs/standards/code-structure-governance.md`
- `docs/standards/frontend-shared-abstractions.md`
- `docs/standards/review-checklist.md`

- [ ] **Step 2: Add an explicit governance dependency section to the service/indexing refactor plan**

Update `docs/plans/tasks-service-indexing-refactor.md` so it states that execution must follow:

- `docs/standards/code-structure-governance.md`
- `docs/standards/config-security-governance.md`
- `docs/standards/review-checklist.md`

- [ ] **Step 3: Make the references concrete instead of generic**

Do not write vague wording like "follow the new standards." Name the exact files and explain which standard governs which plan behavior.

- [ ] **Step 4: Format and diff-check the two implementation plans**

Run:

```bash
pnpm exec prettier --write docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-service-indexing-refactor.md
git diff --check -- docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-service-indexing-refactor.md
```

Expected: formatting succeeds and diff-check reports no whitespace errors.

- [ ] **Step 5: Commit the standards wiring**

Run:

```bash
git add -f docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-service-indexing-refactor.md
git commit -m "docs(codex): align refactor plans with governance standards"
```

Expected: the existing execution plans now point at the durable governance rules.

### Task 7: Final Verification and Handoff

**Files:**
- Review: `docs/standards/*.md`
- Review: `docs/README.md`
- Review: `.codex/README.md`
- Review: `.codex/MIGRATION.md`
- Review: `docs/current/architecture.md`
- Review: `AGENTS.md`
- Review: `docs/plans/tasks-platform-frontend-refactor.md`
- Review: `docs/plans/tasks-service-indexing-refactor.md`

- [ ] **Step 1: Run the full markdown formatting check for all touched docs**

Run:

```bash
pnpm exec prettier --check docs/standards/*.md docs/README.md .codex/README.md .codex/MIGRATION.md docs/current/architecture.md AGENTS.md docs/plans/tasks-platform-frontend-refactor.md docs/plans/tasks-service-indexing-refactor.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 2: Run a repository diff sanity check**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. If you committed after each task as instructed, the only remaining change should be the unrelated `apps/platform/src/pages/project/ProjectChatPage.tsx` worktree edit noted at the top of this plan, or the tree should otherwise be clean.

- [ ] **Step 3: Verify the standards directory is discoverable from the main entry points**

Run:

```bash
rg -n "standards/" docs/README.md .codex/README.md .codex/MIGRATION.md docs/current/architecture.md AGENTS.md
```

Expected: every entry point references the new directory.

- [ ] **Step 4: Write a short execution summary in the implementation issue/PR body**

Capture:

- which standards were created;
- which entry points were updated;
- which downstream plans were rewired;
- that no product code or runtime config changed.

- [ ] **Step 5: Record the handoff state instead of forcing a duplicate commit**

Run:

```bash
git log --oneline -5
```

Expected: the latest commit stack clearly shows the incremental governance foundation work. If you intentionally skipped the per-task commits, create one final docs-only commit here instead; otherwise do not create a no-op duplicate commit.
