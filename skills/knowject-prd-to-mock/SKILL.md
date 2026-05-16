---
name: knowject-prd-to-mock
description: |
  Use when the user wants to turn a written product requirement into a single-page
  HTML mock anchored to the project's brand. Triggers on phrases like
  "/knowject mock", "把这段 PRD 出一个原型", "做个高保真 mock", "generate a mock
  from this spec", "用我们的品牌色出个原型", "我描述一下这个页面你出 HTML".
  Reads brand tokens (primary_color, font_family, voice, logo_path) and locale
  from knowject/context.yaml — output looks like the user's product, not a
  generic AI Tailwind page. Writes one self-contained .html file (no build
  required); never overwrites silently.
---

# `knowject-prd-to-mock`

You turn a written product requirement into a single-page HTML mock that uses the project's own brand tokens. The mock opens in a browser with no build step.

## Hard rules

1. **Refuse without `knowject/context.yaml`.** If missing, point at `knowject-context-init` and stop. Do not guess brand tokens.
2. **Refuse without `brand` block.** If `context.yaml` lacks `brand.primary_color` / `font_family` / `voice`, tell the user which fields are missing and ask them to update `context.yaml` first.
3. **Never write secrets** into the mock (no API endpoints, no tokens, no real customer data).
4. **Never overwrite existing files silently.** If the target path exists, diff first, ask the user to confirm.
5. **Use the user's language** for chat replies; document `lang="..."` follows `project.locale`.
6. **One file, no build.** See [`references/single-page-html-template.md`](./references/single-page-html-template.md) Hard rules.

## Flow

### Step 1 - Verify preconditions

Read `knowject/context.yaml`. Check:

- File exists. If not -> tell user to run `knowject-context-init`, stop.
- `brand.primary_color`, `brand.font_family`, `brand.voice` all present. If any missing -> list them and stop.

### Step 2 - Extract the brand brief

Run:

```bash
python3 <SKILLS_ROOT>/knowject-prd-to-mock/scripts/extract-brand-brief.py knowject/context.yaml
```

Cache the JSON in memory. This is the canonical brand input for the rest of the run.

### Step 3 - Read the user's PRD

The user provides the PRD as text in chat, or as a path to a markdown file. If they point at a file outside the repo (e.g. a Notion export), read it via the `Read` tool.

Parse the PRD into sections - match its structure 1:1 in the HTML output.

### Step 4 - Pick a target path

If the user specified one, use it. Otherwise default to `mocks/<kebab-slug-of-prd-title>.html`. Confirm the path with the user before writing.

### Step 5 - Generate the HTML

Apply, in order:

1. **Skeleton** from [`references/single-page-html-template.md`](./references/single-page-html-template.md).
2. **CSS variable shim** from [`references/brand-token-mapping.md`](./references/brand-token-mapping.md) with the brand brief values substituted in.
3. **Microcopy** matching `brand.voice` per [`references/voice-tone-guide.md`](./references/voice-tone-guide.md).
4. **Sections** matching the PRD structure 1:1 - semantic tags, no fake-looking specific data.

### Step 6 - Write and confirm

If the target path does not exist: write the file. Output a one-line summary in user's language plus `Open mocks/<slug>.html in your browser to preview.`

If the target path exists: show the unified diff in chat, ask "Overwrite this file?", proceed only on explicit confirmation.

## Failure modes

- **`knowject/context.yaml` missing:** point at `knowject-context-init`, stop.
- **`brand` block missing or incomplete:** name the missing fields verbatim, ask user to update `context.yaml`, stop.
- **PRD too vague to section** (no enumerated sections, single-paragraph dump): ask the user to give a 3-5 bullet structural outline, do not invent sections.
- **PRD requires real interactivity** (form validation, multi-step flow): explain this Skill outputs static HTML; offer to mock only the visual states and add `<!-- TODO -->` comments for the dynamic behavior.
- **Target path exists:** diff first, confirm, never overwrite silently.
- **PyYAML missing (extractor exit 3):** tell the user `pip install pyyaml`, stop.

## What this Skill does NOT do

- Does not run a build. Output is one `.html` opened directly.
- Does not generate React/Vue components. That is [`knowject-read-design`](../knowject-read-design/SKILL.md)'s job.
- Does not wire interactivity. The output is visual fidelity, not runtime behavior.
- Does not pick a brand color. The brand brief is authoritative; if missing, the Skill refuses.

## See also

- Brand brief contract: [`scripts/extract-brand-brief.py`](./scripts/extract-brand-brief.py)
- Token mapping: [`references/brand-token-mapping.md`](./references/brand-token-mapping.md)
- Voice table: [`references/voice-tone-guide.md`](./references/voice-tone-guide.md)
- HTML template: [`references/single-page-html-template.md`](./references/single-page-html-template.md)
- Examples: [`references/examples/`](./references/examples/)
- Schema reference: [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
