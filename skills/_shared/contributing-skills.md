# Contributing to Knowject Skills

Thanks for considering a contribution. This guide tells you whether your Skill belongs here, and how to ship it.

## Does my Skill belong here?

A Skill belongs in Knowject Skills if it satisfies at least one filter:

| Filter | Meaning |
|---|---|
| Reads project-specific resources | Uses `knowject/context.yaml` to anchor to the user's UI mocks, API docs, brand tokens, tech stack, or repo paths. |
| Cross-role translation | Input is one role's artifact (PRD, mock, API spec); output is another role's artifact (component code, HTML mock, typed client). |
| Strong opinionated pattern | Encodes "the right way" beyond what generic Skills can offer. |

A Skill is out of scope if it:

- Duplicates `superpowers:*`, `engineering:*`, `anthropic-skills:*`, or `frontend-design`.
- Is a generic methodology Skill such as brainstorming, debugging, code review, TDD, system design, incident response, or standup.
- Is an agent workflow Skill such as writing-plans or executing-plans.
- Operates only on document formats such as docx, pdf, xlsx, or pptx.
- Generates code from pure templates without reading project context.

When in doubt, open a discussion before writing the Skill.

## Skill structure

Every Knowject Skill follows this layout:

```text
skills/<skill-name>/
  SKILL.md                  required - Claude Code entry with frontmatter
  agents/openai.yaml        required - Codex adapter
  references/               optional - long-form docs loaded on demand
    *.md
    examples/
      *.yaml
```

Naming: prefix `knowject-` is mandatory. Use `knowject-<verb>-<object>` or `knowject-<concept>`.

## SKILL.md template

```markdown
---
name: knowject-<your-skill>
description: |
  Use when [trigger condition]. Triggers on phrases like "...", "...", "...".
  [What this Skill does in one sentence.]
---

# `knowject-<your-skill>`

[One-paragraph description of what this Skill does.]

## Hard rules

[Anything the Skill MUST do or NEVER do.]

## Flow

### Step 1 - [Name]

[Concrete actions.]

### Step 2 - [Name]

[Concrete actions.]

## Failure modes

[What to do when things go wrong.]

## See also

- [Cross-references to other Skills, schema, references]
```

The `description` is what triggers the Skill. Include both English and Chinese trigger phrases when the Skill is meant to work for both audiences.

## Codex adapter template

Mirror the Skill's public invocation into `agents/openai.yaml` using the repository's current Codex adapter shape:

```yaml
interface:
  display_name: "Knowject Example"
  short_description: "One short sentence describing when to use this Skill."
  default_prompt: "Use $knowject-example to ..."
```

Do not invent top-level keys unless Codex support is confirmed in a follow-up plan. `default_prompt` must reference the Skill with `$<skill-name>`.

## What to put in references

Use `references/` for:

- Long checklists or recipe tables, so `SKILL.md` stays focused on the workflow.
- Example fixtures.
- Per-format adapters, such as design-image notes or API-source format notes.

Load references on demand from the Skill body instead of making the main `SKILL.md` heavy.

## Validation

Before opening a PR:

```bash
bash skills/scripts/verify.sh
```

The script checks:

- `manifest.yaml` parses.
- Every `SKILL.md` has valid frontmatter.
- Every Codex `agents/openai.yaml` has an `interface` block with `display_name`, `short_description`, and `default_prompt`.
- `default_prompt` references the Skill with `$<name>`.
- Every example YAML validates against `_shared/schema.py`.

If you add a new Skill, also add it to `skills/manifest.yaml#skills`.

## PR checklist

- [ ] Skill satisfies at least one inclusion filter.
- [ ] Skill name uses the `knowject-` prefix.
- [ ] `SKILL.md` has `name` and `description` frontmatter.
- [ ] `agents/openai.yaml` mirrors `SKILL.md`.
- [ ] Trigger phrases in `description` cover the expected user languages.
- [ ] If the Skill consumes `context.yaml`, it documents which fields it reads.
- [ ] If the Skill produces files, it documents output paths and idempotency.
- [ ] `bash skills/scripts/verify.sh` passes.
- [ ] Skill is listed in `skills/manifest.yaml#skills`.
- [ ] Failure modes are documented in `SKILL.md`.
- [ ] No secrets, base URLs, or per-environment config appear in examples.

## Versioning

`knowject_version` in `context.yaml` is the schema version. If your Skill requires a new schema field:

1. Bump `knowject_version` in the spec doc.
2. Update `_shared/schema.py`.
3. Update `_shared/context-yaml-schema.md`.
4. Update `knowject-context-init` to handle migration from prior versions.
5. Update all examples.

Treat schema changes like API contract changes: they are load-bearing.
