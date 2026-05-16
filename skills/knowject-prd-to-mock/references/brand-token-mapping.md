# Brand token mapping

The brand brief from `extract-brand-brief.py` maps to the HTML output as follows.

## CSS variables (always emit, in `<style>`)

| Brief field | CSS variable | Default if null |
|---|---|---|
| `primary_color` | `--brand` | `#1677ff` |
| `font_family` | `--brand-font` | `Inter, system-ui, sans-serif` |

Derive a 50-shade tint from `--brand` and emit it as `--brand-50` (approximately 10% saturation against white). Use it for hover backgrounds, badges, soft accents.

## Tailwind utility shims

Always include this `<style>` block immediately after the Tailwind CDN script, **before** any markup:

```html
<style>
  :root {
    --brand: <primary_color or default>;
    --brand-50: <derived tint>;
    --brand-font: <font_family or default>;
  }
  body { font-family: var(--brand-font); }
  .text-brand   { color: var(--brand); }
  .bg-brand     { background-color: var(--brand); }
  .bg-brand-50  { background-color: var(--brand-50); }
  .border-brand { border-color: var(--brand); }
  .ring-brand   { --tw-ring-color: var(--brand); }
</style>
```

## Logo

If `logo_path` is set, reference it via a relative path:

```html
<img src="<logo_path>" alt="<project_name> logo" class="h-8" />
```

If `logo_path` is null, emit a placeholder square `<div class="h-8 w-8 rounded bg-brand"></div>`.

## UI library hint

`ui_library` does **not** change the HTML output - Tailwind CDN keeps the mock library-agnostic. The value is a hint for prose (e.g., "this mock previews a layout that maps to antd 6 components"). Do not import the actual library; mocks must run by opening the .html file in a browser, no build step.

## Locale

Drive the document language attribute and copy direction:

```html
<html lang="<locale or 'en'>">
```

If `locale` starts with `zh`, default to `lang="zh"`. If `en`, `lang="en"`. Hybrid (`zh-en` / `en-zh`) -> use the primary half.
