# Decomposition rubric

Output of Phase 1 (decomposition plan). This rubric is how the agent decides where to split components.

## Inputs

- Visual structure from [`source-format-recipes.md`](./source-format-recipes.md).
- Framework profile JSON from `extract-framework-profile.py`.

## Output shape

A markdown document the user can read top-to-bottom before any code is written:

```markdown
# Decomposition plan for <design source>

## Page-level component
- Name: <PageName>
- File: <pages_dir>/<page-kebab>/index.tsx

## Composed components
1. **<ComponentName>** — <one-sentence purpose>
   - Library primitive: <antd Card / shadcn Card / mui Card / none>
   - Slots: <list of variable content regions>
   - Repeats: <yes/no — if a list of cards, the card is one component instantiated N times>
2. ...

## Open questions
- <Any (?) flagged from source recipes — phrase as a yes/no the user can answer in one sentence>
```

## Splitting heuristics

Make a component when any **two** of these are true:

1. The block has a clear visual boundary (border, background, distinct spacing).
2. The block contains 2+ child slots that look variable (name, count, image, status).
3. The block repeats in the design (grids, lists, tabs).
4. The block would be reused on another page if extrapolated.

Do **not** make a component for:

- Single-text elements (just put them inline in the parent).
- Layout grids that exist only to position other components.
- Anything below ~50px in the rendered design - too small to merit a file.

## Naming

- PascalCase, English (even when `project.locale` is `zh`).
- Suffix by role when ambiguous: `UserCard` not `User`, `OrderRow` not `Order`.
- Avoid library names in the component name: not `AntdCard`, just `OrderCard`.

## File layout

| Profile field | Used as |
|---|---|
| `components_dir` | One folder per component: `<components_dir>/<ComponentName>/index.<ext>`, plus a stub `<components_dir>/<ComponentName>/<ComponentName>.tsx` if the framework prefers named files |
| `pages_dir` | One folder for the page-level wrapper: `<pages_dir>/<page-kebab>/index.<ext>` |
| `component_extension` | `tsx` for typescript, `jsx` for javascript |

For Phase 2, use the index.<ext> pattern uniformly - keep the file layout opinion minimal so the Skill matches the largest set of projects.

## User confirmation gate

After writing the plan, **stop and wait** for the user to:

- Confirm the component list (yes / no / edit).
- Answer all `(?)` questions.
- Approve the file layout (target paths).

Only then proceed to Phase 2 (skeleton file writes). Do not skip this gate even if the plan looks obvious.
