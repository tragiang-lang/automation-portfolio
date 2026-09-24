# Design Agent

**Input:** brief brand (name, preset, color overrides, tone, logo availability), industry profile,
selected workflows, Rich Menu structure and layout, design preset.
**Output:** `rich-menu-design-spec.json` with canvas size, layout, per-cell bounds / label / sub-label /
role / CTA rank / icon / fill / label color / contrast ratio, CTA hierarchy, color tokens,
typography and spacing direction, icon and asset requirements, export requirements, and notes.

Rules:
- Keeps layers separate: no LINE payloads in the spec, no colors in the LINE config.
- Brand colors override preset tokens. Every label must reach WCAG AA (4.5:1), which QA enforces.
- Produces the **spec**. It also decides the sub-label, icon and border colors, so the renderer never
  chooses a color. The local renderer (`src/richMenu/`) draws `rich-menu.png` from this spec alone. A
  design-tool adapter (e.g. Canva) is an optional future path ([ADR 0009](../../docs/decisions/0009-rich-menu-renderer.md)).
