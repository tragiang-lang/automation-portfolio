# Implementation Plan — Phase 5.1 → LP Design Customization V1.1

## Goal
Turn the current single-layout salon template into a product with meaningful visual differentiation while keeping reservation/GAS business logic stable.

## Current baseline
- Phase 5 reservation UI/E2E complete.
- Phase 5.1 homepage Menu/Staff runtime integration implemented on branch and ready for review/commit/merge.
- Homepage and Reservation Wizard use the same GAS actions for Services/Staff.
- Reservation engine is already transactional and must remain design-agnostic.
- Coconala ¥2,500 package targets technically capable buyers; it should ship full functionality, not a crippled demo.
- Existing audit: `docs/design-customization-audit.md`.

## Strategic V1.1 scope
V1.1 should include both cheap customization and a small number of high-impact layout variants. Do not defer all layout variation to V1.2.

### Workstreams
1. Baseline / Phase 5.1 finalization
2. Presentation Configuration Layer
3. Theme presets
4. Typography presets
5. Section visibility
6. Content/runtime schema fixes
7. High-impact layout variants
8. Preset combinations
9. Customer customization documentation
10. Regression / package validation

## Task breakdown

### Task 0 — Phase 5.1 finalization
- Review diff.
- Run tests/typecheck/lint/build.
- Commit and merge only after explicit approval.
- Preserve runtime/demo/error semantics.

### Task 1 — Presentation Configuration Layer
Create a typed design configuration independent from reservation logic.
Suggested conceptual shape:
- `design.preset`
- `design.theme`
- `design.typography`
- `design.heroVariant`
- `design.menuVariant`
- `design.staffVariant`
- `design.galleryVariant`
- `design.sectionVisibility`
- `design.sectionOrder`

Requirements:
- Centralized defaults.
- Strong TypeScript types and validation.
- Safe fallback to default preset.
- No GAS/reservation dependency.
- Avoid a giant generic builder abstraction.

### Task 2 — Theme presets
Implement ~6 visually distinct presets using the existing centralized theme architecture.
Candidate directions:
- Kinari — quiet Japanese luxury
- Femme — soft/feminine
- Noir — premium black
- Editorial — fashion/editorial
- Natural — organic/relaxing
- Modern — clean/minimal

Each preset should materially alter visual identity, not just one accent color.

### Task 3 — Typography presets
Implement a small controlled typography system.
- Japanese-friendly font pairing.
- Editorial/elegant pairing.
- Modern/minimal pairing.
- Do not expose dozens of font choices.
- Keep loading/performance reasonable.
- Design config selects the typography preset.

### Task 4 — Section visibility
Allow selected homepage sections to be enabled/disabled through configuration.
Candidate sections:
- concept
- menu
- staff
- gallery
- reservation CTA
- salon features
- customer flow
- FAQ
- access
- contact

Requirements:
- Type-safe.
- Sensible defaults.
- Required/core sections cannot accidentally disappear.
- Reservation flow remains accessible.

### Task 5 — Content/runtime schema fixes
Fix audit findings that affect production fidelity:
- Real CONFIG should provide `tagline`, `nameLatin`, `postalCode`, `socialLinks` instead of silently retaining demo values.
- Decide/document the canonical source for these fields.
- Extend SERVICES/STAFF public schema only as needed to support production-quality cards, e.g. description/category/role/introduction/photo.
- Update CSV/setup/docs/tests consistently.
- Keep server-side validation authoritative.

### Task 6 — Hero variants
Implement 2–3 variants with clearly different composition.
Recommended:
- Fullscreen
- Split
- Editorial

Variant selection must be presentation-only.

### Task 7 — Menu variants
Implement 2–3 variants.
Recommended:
- Editorial List
- Card Grid
- Minimal Price List

Use the same runtime service data; only presentation changes.

### Task 8 — Staff variants
Implement 2 variants initially.
Recommended:
- Portrait Grid
- Horizontal Profile

Use runtime staff data. Do not duplicate staff models.

### Task 9 — Gallery variants
Implement 2–3 variants.
Recommended:
- Grid
- Masonry
- Large Feature / Editorial

Reuse the existing image source model.

### Task 10 — Section ordering
Introduce controlled section order through typed configuration.
- Do not make the entire homepage an arbitrary drag-and-drop builder.
- Define an allow-listed section registry.
- Preserve required structural/header/footer boundaries.
- Test representative preset orders.

### Task 11 — Design presets
Combine the above into ~6 curated presets.
Each preset should intentionally combine:
- theme
- typography
- hero variant
- menu variant
- staff variant
- gallery variant
- visibility/order

Presets should look meaningfully different when rendered with the same content/images.

### Task 12 — Customer customization docs
Update package docs so a ¥2,500 buyer can:
1. choose a preset;
2. change brand/content/images;
3. enable/disable supported sections;
4. understand which changes are easy vs code-level;
5. avoid touching reservation/GAS logic for visual customization.

Do not market as no-code/no-expertise-needed.

### Task 13 — Validation
For every task:
- focused tests
- GAS regression tests where relevant
- web tests
- typecheck
- lint
- build

Final:
- verify representative presets/pages
- verify runtime Menu/Staff still work
- verify reservation wizard unchanged
- verify `/api/gas` security boundary unchanged
- verify no demo values leak into production runtime fields
- rebuild Coconala package and validate fresh-copy install/build/test

## Recommended execution order
Phase A: 0 → 1 → 2 → 3 → 4
Phase B: 5
Phase C: 6 → 7 → 8 → 9
Phase D: 10 → 11
Phase E: 12 → 13

## Branching
Recommended branch per coherent milestone, or one feature branch with one commit per task. Never commit/push/merge unless explicitly instructed.

Suggested branch:
`feature/v1-1-design-customization`

## Non-goals for V1.1
- Full drag-and-drop website builder
- Dozens of customer-facing knobs
- Arbitrary CSS editor
- User authentication/dashboard
- Supabase
- Changes to reservation transaction semantics
- Changes to Calendar/LockService/idempotency behavior unless a regression is discovered
- Rebuilding the GAS API for design purposes

## Definition of Done
V1.1 is done when a technically capable Coconala buyer can select among ~6 presets and obtain visibly different salon sites using the same underlying content and reservation system, while reservation/GAS behavior remains unchanged and the package/docs accurately explain customization boundaries.

## V1.2 candidates after market feedback
- More layout variants
- More presets
- More section-order combinations
- Additional niche-specific compositions
- Advanced combinations only where customers actually request them
