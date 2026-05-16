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

Body lands in Task 10. Do not consume yet.
