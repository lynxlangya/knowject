# knowject-read-design

## What It Does

`knowject-read-design` turns a UI design source into a component decomposition plan and then, after confirmation, component skeleton code aligned with the project's frontend stack.

It is intentionally two-phase: first it explains the page and component breakdown, then it writes files only after the user confirms the plan and answers open questions.

## When To Use

- You have a UI screenshot, PDF page, Figma export, or sketch and want a component plan.
- You want React component skeletons that match the project's UI library and output folders.
- You need a design-to-code starting point without state, routing, tests, or real data.

## Inputs

- `knowject/context.yaml`.
- `stack.frontend.framework`, `stack.frontend.ui`, and `stack.frontend.language`.
- `design.output.components_dir`, and usually a page output directory.
- A supported design source such as PNG screenshot, PDF page, or Figma export.

## Outputs

- A decomposition plan with page-level and composed components.
- Component skeleton files after explicit confirmation.
- A summary of files written or skipped.
- Diffs and overwrite confirmations for any existing target files.

## Example

User asks:

```text
/knowject design files/designs/user-dashboard.png
```

Expected result:

```text
The Skill reads the frontend profile, produces a component decomposition plan, asks for confirmation, then writes skeleton components under the configured components directory.
```

## Safety Rules

- Refuse without `knowject/context.yaml`.
- Refuse when the frontend stack block is missing or incomplete.
- Always plan first; never write components before confirmation.
- Never overwrite existing component files silently.
- Do not add real data, state management, routing, tests, or stories.
- Preserve the repo Tailwind convention for important classes, such as `mb-1!`.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`scripts/extract-framework-profile.py`](./scripts/extract-framework-profile.py)
- [`references/source-format-recipes.md`](./references/source-format-recipes.md)
- [`references/decomposition-rubric.md`](./references/decomposition-rubric.md)
- [`references/ui-library-profiles.md`](./references/ui-library-profiles.md)
- [`references/component-skeleton-template.md`](./references/component-skeleton-template.md)
- [`references/examples/`](./references/examples/)
