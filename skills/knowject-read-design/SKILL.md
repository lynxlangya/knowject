---
name: knowject-read-design
description: |
  Use when the user wants to turn a UI design source (PNG screenshot, PDF page,
  Figma export, or sketch) into component skeleton code aligned to the project's
  UI library and file conventions. Triggers on phrases like "/knowject design",
  "把这张设计稿拆成组件", "convert this mockup to React components", "generate
  component skeletons from this design", "我贴一张图你出 antd 组件骨架". Reads
  stack.frontend (framework, ui, styling, language) and design.output from
  knowject/context.yaml. Two-phase: outputs a decomposition plan first for user
  confirmation, only then writes skeleton files. Never overwrites existing
  components silently. Phase 2 supports antd / mui / shadcn / chakra / naive /
  mantine UI libraries; other values fall back to plain React + Tailwind.
---

# `knowject-read-design`

You turn a UI design source into component skeleton code aligned to the project's stack. The Skill is **two-phase**: produce a decomposition plan first, write code only after the user confirms.

## Hard rules

1. **Refuse without `knowject/context.yaml`.** If missing, point at `knowject-context-init` and stop.
2. **Refuse without `stack.frontend` block.** If missing, name the missing fields and stop.
3. **Two-phase output is mandatory.** Plan first, files second. Do not write any component file before the user has confirmed the plan and answered every `(?)` question.
4. **Never overwrite existing component files silently.** Show a diff and ask before overwriting.
5. **No real data, no state, no tests in skeletons.** Per [`references/component-skeleton-template.md`](./references/component-skeleton-template.md).
6. **Use the user's language** for plan + chat replies; component code stays English (file names, prop names, component names) regardless of locale.
7. **Respect Tailwind importance suffix form:** `mb-1!`, not `!mb-1`. Same goes for shipped projects.

## Flow

### Step 1 - Verify preconditions

Read `knowject/context.yaml`. Check:

- File exists. Else -> point at `knowject-context-init`, stop.
- `stack.frontend.framework`, `stack.frontend.ui`, `stack.frontend.language` present. Else -> list missing fields, stop.
- `design.output.components_dir` present. Else -> ask the user where to write components, do not assume.

### Step 2 - Extract the framework profile

Run:

```bash
python3 <SKILLS_ROOT>/knowject-read-design/scripts/extract-framework-profile.py knowject/context.yaml
```

Cache the JSON. This is the canonical codegen profile for the rest of the run.

### Step 3 - Ingest the design source

Read [`references/source-format-recipes.md`](./references/source-format-recipes.md). Pick the recipe matching `design.sources[*].format` (the user typically gives one source per Skill invocation). For unsupported formats (`sketch`, `url`) -> refuse with the documented message and stop.

### Step 4 - Build the decomposition plan

Apply [`references/decomposition-rubric.md`](./references/decomposition-rubric.md). Produce the markdown plan in the user's language:

```markdown
# Decomposition plan for <design source>

## Page-level component
- Name: <PageName>
- File: <pages_dir>/<page-kebab>/index.<extension>

## Composed components
1. **<ComponentName>** — <purpose>
   - Library primitive: <per ui-library-profiles.md>
   - Slots: <list>
   - Repeats: <yes/no>
2. ...

## Open questions
- <Any (?) flagged during ingestion>

## Files I will create (after your confirmation)
- <components_dir>/<ComponentName>/index.<extension>
- ...
```

### Step 5 - User confirmation gate

After producing the plan, **stop**. Ask the user explicitly:

> "Confirm this plan? (yes / edit / cancel) — and please answer the open questions above."

Wait for explicit confirmation. Apply any edits (rename components, drop components, change slot lists, change file paths). Re-display the updated plan if changes happened, ask again. Loop until the user says "yes" or "cancel".

If "cancel" -> stop, do not write anything.

### Step 6 - Write skeleton files

Apply [`references/component-skeleton-template.md`](./references/component-skeleton-template.md) using the framework profile + decomposition plan + matching profile in [`references/ui-library-profiles.md`](./references/ui-library-profiles.md).

For each file:

- If the target path does not exist -> write it.
- If the target path exists -> show a unified diff, ask the user "Overwrite this file?", proceed only on explicit confirmation. Skip without erroring if user says no.

### Step 7 - Summarize

Output a list of files written and any files skipped (with reason). End with:

> "Next: wire these components into your page route, and add tests per your project's test workflow. I do not generate tests or stories."

## Failure modes

- **`knowject/context.yaml` missing or `stack.frontend` incomplete:** point at `knowject-context-init`, stop.
- **`design.output.components_dir` missing:** ask the user, do not assume.
- **Unsupported source format** (`sketch`, `url`, or anything not in `references/source-format-recipes.md`): refuse with the documented message.
- **`ui_library` is unknown** (not in the profile table): emit plain React + Tailwind per the fallback in [`references/ui-library-profiles.md`](./references/ui-library-profiles.md), and add a TODO header to each generated file.
- **User does not confirm the plan (Step 5):** loop until "yes" or "cancel". Never short-circuit the gate.
- **Target file exists and user declines overwrite:** skip that file, continue with the rest, list it as "skipped" in the summary.
- **PyYAML missing (extractor exit 3):** tell the user `pip install pyyaml`, stop.
- **Design source is too ambiguous to decompose** (single dense screen with no clear regions, marketing splash page with no UI primitives): tell the user the source looks like a marketing visual rather than a component layout; ask them to either annotate component boundaries or skip the Skill.

## What this Skill does NOT do

- Does not generate request/response types (Tier 2 `knowject-api-to-types`).
- Does not wire routing or state. Skeletons are stateless.
- Does not run tests, lint, or typecheck. The user runs the project's own workflow after generation.
- Does not modify the project's UI library imports or theme configuration.
- Does not produce design tokens. Brand tokens are mocked via [`knowject-prd-to-mock`](../knowject-prd-to-mock/SKILL.md), not here.

## See also

- Framework profile: [`scripts/extract-framework-profile.py`](./scripts/extract-framework-profile.py)
- Source recipes: [`references/source-format-recipes.md`](./references/source-format-recipes.md)
- Rubric: [`references/decomposition-rubric.md`](./references/decomposition-rubric.md)
- Library profiles: [`references/ui-library-profiles.md`](./references/ui-library-profiles.md)
- Template: [`references/component-skeleton-template.md`](./references/component-skeleton-template.md)
- Examples: [`references/examples/`](./references/examples/)
- Schema reference: [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
