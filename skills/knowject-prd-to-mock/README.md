# knowject-prd-to-mock

## What It Does

`knowject-prd-to-mock` turns a written PRD or product requirement into a single self-contained HTML mock. It uses the project's brand tokens from `knowject/context.yaml` so the output looks like the target product instead of a generic page.

The mock is a browser-openable HTML file. It is for visual alignment and product discussion, not runtime implementation.

## When To Use

- You have a written feature requirement and want a high-fidelity HTML mock.
- A PM or founder wants to preview a page before frontend implementation.
- You want a static, shareable mock that follows project brand color, font, locale, and voice.

## Inputs

- `knowject/context.yaml` with `brand.primary_color`, `brand.font_family`, and `brand.voice`.
- PRD text pasted in chat, or a path to a markdown requirement file.
- Optional target path. If omitted, the Skill defaults to `mocks/<slug>.html`.

## Outputs

- One self-contained `.html` mock file.
- A summary pointing to the generated file.
- A unified diff and overwrite confirmation if the target file already exists.

## Example

User asks:

```text
/knowject mock docs/product/settings-page-prd.md
```

Expected result:

```text
The Skill reads the PRD, extracts the project brand brief, proposes mocks/settings-page.html, and writes a static HTML mock after confirming the target path.
```

## Safety Rules

- Refuse without `knowject/context.yaml`.
- Refuse when required `brand` fields are missing.
- Never include secrets, API endpoints, tokens, or real customer data in the mock.
- Never overwrite an existing file silently; show a diff and ask first.
- Do not implement runtime interactivity, form validation, or multi-step behavior. Mock visual states only.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`scripts/extract-brand-brief.py`](./scripts/extract-brand-brief.py)
- [`references/brand-token-mapping.md`](./references/brand-token-mapping.md)
- [`references/single-page-html-template.md`](./references/single-page-html-template.md)
- [`references/voice-tone-guide.md`](./references/voice-tone-guide.md)
- [`references/examples/`](./references/examples/)
