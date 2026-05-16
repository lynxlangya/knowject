# Source format recipes

`knowject/context.yaml#design.sources[*].format` drives which recipe to follow.

## `format: png` (screenshot, PNG, JPEG)

1. The user usually pastes the image inline or points at a path under `design.sources[*].path`.
2. Read with the platform's image-viewing capability (Claude Code's image attachment, Codex's Vision API, etc.).
3. Mark all detected sections, list every visible UI primitive (buttons, inputs, cards, badges, etc.), and note repeated patterns (lists of cards = one component repeated).
4. Approximate spacing in `space-y-` / `gap-` Tailwind buckets (`gap-2 / 4 / 6 / 8`), not pixel-exact.
5. Colors: only use the values from `context.yaml#brand` (via the Skill body - do not pull colors from the image; vision color sampling is unreliable for our use case).

## `format: figma-export` (URL to a Figma frame, exported zip, or `.fig` link)

1. If the user supplies a public Figma URL, ask whether they have an exported PNG/PDF - vision over the rendered image is faster than parsing `.fig` payloads.
2. If they have a Figma JSON export, parse it for layer hierarchy -> that hierarchy maps 1:1 onto the component tree. **Do not** import any Figma color directly; use brand tokens.
3. Component naming preference: Figma layer names trump the rubric's heuristic - if a layer is named `ProductCard`, the component is `ProductCard`.

## `format: pdf` (slide deck export, PRD with embedded design)

1. Convert to per-page images first (Claude Code: read the PDF; Codex: ask the user to attach as image pages).
2. Treat each page as one PNG and follow the `format: png` recipe.
3. Multi-page sources produce multiple component sets - the decomposition plan must group them per page (e.g., `## Page 1`, `## Page 2`).

## `format: sketch` (Sketch app export)

Out of scope for Phase 2 - tell the user we do not yet support `.sketch` files and ask them to export to PNG or PDF.

## `format: url` (a web URL to scrape)

Out of scope for Phase 2 - refuse and explain the Skill needs a static design source, not a live site. Suggest `prd-to-mock` if they want to recreate a layout from scratch.

## Visual fidelity rules

- **Approximate, don't pixel-match.** Skeleton output captures structure + library mapping, not exact spacing or shadow values.
- **Library primitives win over custom CSS.** If antd's `<Card>` matches the design's card shape, use it - do not hand-roll the equivalent in Tailwind.
- **Ignore platform chrome.** Browser address bar, mobile status bar, screen edges -> not part of the component.
- **Flag uncertainty.** If a section's role is ambiguous (is it a stat or a CTA?), put it in the decomposition plan with a `(?)` and ask the user during Phase 1.
