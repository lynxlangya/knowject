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

Body lands in Task 9. Do not consume yet.
