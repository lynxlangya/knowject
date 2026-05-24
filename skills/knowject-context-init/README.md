# knowject-context-init

## What It Does

`knowject-context-init` sets up Knowject Skills inside a project by creating or updating `knowject/context.yaml` and `knowject/README.md`. It scans the repo first, reports what it detected, asks only for missing fields, and validates the final YAML against the shared schema.

Use it before any other `knowject-*` Skill when the project does not yet have a Knowject context file.

## When To Use

- You want to enable Knowject Skills in an existing repo.
- Another Knowject Skill refuses because `knowject/context.yaml` is missing.
- Your stack, design folder, API source, or brand context changed and the context file needs a refresh.

## Inputs

- Project files such as `package.json`, `pyproject.toml`, `tsconfig.json`, `tailwind.config.*`, source directories, and `README.md`.
- User confirmation for detected values.
- User answers for fields that cannot be detected, such as brand voice or optional design sources.

## Outputs

- `knowject/context.yaml`
- `knowject/README.md`
- A short setup summary and next-step suggestions.
- In update mode, a focused diff for changed fields before writing.

## Example

User asks:

```text
/knowject init
```

Expected result:

```text
The Skill scans the repo, reports the detected stack and paths, asks for missing brand or API details, then writes and validates knowject/context.yaml.
```

## Safety Rules

- Never write secrets, base URLs, API keys, tokens, DB strings, or per-environment values to `context.yaml`.
- Detect before asking; do not make users answer questions the repo can answer.
- Ask with concrete candidate choices when information is missing.
- If `knowject/context.yaml` already exists, switch to reentrant update mode and show the diff before changing fields.
- Never delete the user's file on validation failure.

## Related Files

- [`SKILL.md`](./SKILL.md)
- [`agents/openai.yaml`](./agents/openai.yaml)
- [`references/detection-recipes.md`](./references/detection-recipes.md)
- [`references/examples/`](./references/examples/)
- [`../_shared/context-yaml-schema.md`](../_shared/context-yaml-schema.md)
