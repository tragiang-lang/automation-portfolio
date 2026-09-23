# Design Agent

**Input:** brief brand (name, preset, color overrides, tone, logo availability), industry profile,
selected workflows, Rich Menu structure and layout, design preset.
**Output:** `rich-menu-design-spec.json` with canvas size, layout, per-cell bounds / label / sub-label /
role / CTA rank / icon / fill / label color / contrast ratio, CTA hierarchy, color tokens,
typography and spacing direction, icon and asset requirements, export requirements, and notes.

Rules:
- Keeps layers separate: no LINE payloads in the spec, no colors in the LINE config.
- Brand colors override preset tokens. Every label must reach WCAG AA (4.5:1), which QA enforces.
- Produces a **spec**, not the PNG. The image is made in Canva or another design tool (a future connector).
