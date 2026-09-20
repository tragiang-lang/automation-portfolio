# Design / Customization Audit — Coconala ¥2,500 Salon Template

**Scope:** Read-only audit of `apps/salon-portfolio/web/`. No source, test, GAS, or
Sheets changes were made to produce this document. See "Validation" at the
bottom for the diff-free proof.

**Question this answers:** Exactly how customizable is the current LP, where
are its biggest limitations, and what is the most efficient way to make one
codebase capable of producing many visually distinct salon websites for the
¥2,500 Coconala product?

**Repo note:** the prompt's paths (`web/app`, `web/config`, ...) are actually
at `apps/salon-portfolio/web/{app,components,config,lib,types,public}`. All
findings below reference real paths under that root.

---

## A. Current LP structure

### Composition root

`app/layout.tsx` always renders `SiteHeader` → `{children}` → `SiteFooter`,
wrapping every route. `app/page.tsx` (the homepage) renders sections as a
**literal, hard-coded JSX sequence** — there is no data structure (array,
config list) driving section order; reordering means cutting/pasting JSX
blocks in the composition root itself.

Current order (`app/page.tsx:41-97`):

```text
SiteHeader (layout.tsx, always)
Hero
Concept
Menu
Staff                    — conditional: features.staffSelection
Gallery
ReservationCtaBand #1    — conditional: features.reservation
SalonFeatures
CustomerFlow
FAQ
Access
Contact                  — conditional: features.contactForm
ReservationCtaBand #2    — conditional: features.reservation
SiteFooter (layout.tsx, always)
```

A code comment at `app/page.tsx:23-27` explicitly ties this order to
"Phase 2A §6" — i.e. it's a deliberate design spec, not an accident, but it
is enforced only by convention/comment, not by any type or config.

### Section inventory

| Section | Source (composition) | Component file(s) | Reusable | Props-driven | Static content | Runtime data | Variants | Layout hard-coded | Styling hard-coded | Content configurable | Visibility configurable |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Header | `app/layout.tsx` | `components/layout/SiteHeader.tsx`, `MobileNav.tsx` | Yes (1 instance) | Yes | Nav labels only | Business name, reservation flag | No | Yes | Yes | Partial (nav via demo-content.ts) | Always on |
| Hero | `app/page.tsx` | `components/sections/HeroSection.tsx` | Yes | Partial (headline/subheadline only) | Image path, CTA labels | `siteConfig.business.tagline` (itself frontend-only, see §C) | No | Yes | Yes | Low | Always on |
| Concept | `app/page.tsx` | `components/sections/ConceptSection.tsx` | Yes | Yes (eyebrow/title/paragraphs) | All copy hard-coded **in `app/page.tsx`**, not even `demo-content.ts` | None | No | Yes | Yes | Low (must edit composition root) | Not configurable |
| Menu | `app/page.tsx` | `MenuSection.tsx`, `MenuCategory.tsx`, `MenuRow.tsx` | Yes | Yes (`services: Service[]`) | Heading/subtitle text | `getServices` (GAS SERVICES sheet) | No | Yes | Yes | High (via Sheet) | Not configurable |
| Staff | `app/page.tsx` | `StaffSection.tsx`, `StaffCard.tsx`, `AnyAvailableStaffCard.tsx` | Yes | Yes (`staff: StaffMember[]`) | Heading text | `getStaff` (GAS STAFF sheet) | No | Yes | Yes | High (via Sheet) | **Yes** — `features.staffSelection` |
| Gallery | `app/page.tsx` | `GallerySection.tsx`, `GalleryImage.tsx` | Yes | Yes (`images: GalleryImageItem[]`) | Heading text | None — array lives in `config/demo-content.ts` | No | Yes | Yes | Medium (edit demo-content.ts) | Not configurable |
| Reservation CTA band | `app/page.tsx` (×2) | `ReservationCtaBand.tsx` | Yes (used twice) | Yes (heading/message) | Both call sites' copy hard-coded in `app/page.tsx` | None | No | Yes | Yes | Low (composition root) | **Yes** — `features.reservation` |
| Salon Features | `app/page.tsx` | `SalonFeaturesSection.tsx` | Yes | Yes (`features: SalonFeature[]`) | Heading text | None — array in `demo-content.ts` | No | Yes | Yes | Medium | Not configurable |
| Customer Flow | `app/page.tsx` | `CustomerFlowSection.tsx` | Yes | Yes (`steps: CustomerFlowStep[]`) | Heading text | None — array in `demo-content.ts` | No | Yes | Yes | Medium | Not configurable |
| FAQ | `app/page.tsx` | `FaqSection.tsx`, `FaqAccordionItem.tsx` | Yes | Yes (`items: FaqItem[]`) | Heading text | None — array in `demo-content.ts` | No | Yes | Yes | Medium | Not configurable |
| Access | `app/page.tsx` | `AccessSection.tsx` | Yes | Yes | Heading, map placeholder | `siteConfig.business`/`hours` (GAS) + `ACCESS_INFO` (demo-content.ts) | No | Yes | Yes | Medium-High | Not configurable |
| Contact | `app/page.tsx` | `ContactSection.tsx`, `components/forms/*` | Yes | Yes | Heading text | `siteConfig.business.phone` | No | Yes | Yes | Low-Medium | **Yes** — `features.contactForm` |
| Footer | `app/layout.tsx` | `components/layout/SiteFooter.tsx` | Yes (1 instance) | Yes | Legal link labels | Business info, hours, social links, reservation flag | No | Yes | Yes | Medium | Always on |

Other pages found but out of the LP-audit's primary section list (still
presentation, same architecture): `/contact`, `/privacy`, `/terms`,
`/reservation`, `/reservation/cancel`, `/thanks` — these use
`components/ui/PagePlaceholder.tsx` or the Reservation Wizard component tree
(`components/reservation/*`), which is a **separately styled, minimal
form-list UI** (radio-button option rows, not cards) that does **not** reuse
`MenuRow`/`StaffCard`. This is actually good news for design-customization
risk (see §17): changing the homepage's Menu/Staff *visual* presentation
cannot break the Reservation Wizard, because it already has its own
independent (simpler) rendering of the same `PublicService[]`/`PublicStaff[]`
data.

### Shared UI primitives (`components/ui/`)

| Component | Purpose | Already variant-capable? |
|---|---|---|
| `Button.tsx` | Every CTA/button in the site | **Yes** — `variant: "primary" \| "secondary" \| "text"`, `fullWidth` |
| `Container.tsx` | Max-width wrapper | **Partial** — `narrow` boolean (760px vs 1120px) |
| `SectionHeading.tsx` | Eyebrow + H2 + optional subtitle | **Partial** — `align: "left" \| "center"` |
| `Divider.tsx` | Hairline `<hr>` | No (trivial) |
| `Reveal.tsx` | Scroll-in-view fade/rise wrapper | N/A (behavior, not visual variant) |
| `PlaceholderImage.tsx` | `next/image` wrapper with fixed aspect-ratio box | No — always `object-cover`, fill; `objectPosition` is the only visual knob |

**Finding:** `Button` and `SectionHeading` are the only components in the
entire codebase already built with the `variant`/`align`-prop pattern that
`HeroVariant`/`MenuVariant`/etc. would need. Every section-level component
(`HeroSection`, `MenuSection`, `StaffSection`, `GallerySection`,
`SiteHeader`) has exactly one hard-coded layout with no variant switch of
any kind. This is the single most important architectural fact for the
whole audit: **variant-based design plurality is not "half-built and needs
finishing" — it doesn't exist yet above the UI-primitive layer.**

---

## B. Current customization inventory (what a buyer can already change)

Everything here is **Level A** unless noted.

| What | Mechanism | Notes |
|---|---|---|
| Business name, phone, email, address | `CONFIG` Google Sheet (`business.*` keys) | Flows through `getConfig` → `resolveSiteConfig` → Header/Footer/Access/metadata |
| Business hours (per day) | `CONFIG` Sheet (`hours.*` keys) | Renders in Access + Footer |
| Feature flags: contact form / reservation / staff selection | `CONFIG` Sheet (`features.*`) | Structurally hides/shows Staff, both CTA bands, Contact — the *only* sections with real visibility control today |
| "指名なし（お任せ）" any-staff option | `CONFIG` Sheet (`staff.anyAvailableOption`) | |
| Reservation slot size / lead time / booking window | `CONFIG` Sheet (`reservation.*`) | Affects Reservation Wizard, not LP visuals |
| Menu items: name, duration, price, active flag, display order | `SERVICES` Google Sheet | Row add/remove/edit — no source touch needed |
| Staff members: name, active flag, display order | `STAFF` Google Sheet | Row add/remove/edit |
| Accent color | `app/globals.css`, one CSS custom property (`--color-accent`) | Already centralized; documented in the shipped `05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md` guide (see §E) |
| Hero/Concept/Salon-Features/Gallery/Staff images | Replace the file at the existing path under `public/images/...` (same filename) | Level A if filename kept identical; Level B if the buyer wants a different filename (then a source edit is required — see §C) |
| Gallery image set (add/remove/reorder) | `config/demo-content.ts` → `GALLERY_IMAGES` array | Requires opening a `.ts` file, but the array is a plain, well-commented data literal — **A/B borderline**, scored B below because it's a source file edit even though the edit itself is trivial |

**Everything else in the page is not exposed as "Level A" at all** — it is
either Level B (a documented but code-level file to edit) or Level C
(architecturally locked). See §C and the full matrix in §D.

---

## C. Hard-coded design inventory

### Design tokens — centralized (good)

| Decision | Where defined | Centralized? | Could become config? | Complexity if it did | Meaningful visual variation? |
|---|---|---|---|---|---|
| Color palette (12 vars: background/surface/surface-sunken/primary/on-primary/secondary/accent/on-accent/text/muted/border/success/error) | `app/globals.css` `:root` + mirrored into `@theme inline` | **Yes, single file** | Yes — this is the cleanest lever in the codebase | Small (swap ~12 hex values) | **Very high** — primary/secondary/accent together control nearly every text and background color site-wide |
| Border radius scale (4/8/12px) | `app/globals.css` | Yes | Yes | Small | Low-medium (subtle, but consistent across every card/button/image) |
| `xl` breakpoint override (1440px) | `app/globals.css` `@theme inline` | Yes | Rarely worth exposing | — | Low |
| Spacing scale (`SPACING_PX`, 4px-based) | `config/theme.ts` | Yes, but **unused as a lever** — components use literal Tailwind classes (`py-16`, `gap-6`), not this export; it exists only for the rare JS numeric need (e.g. `IntersectionObserver` margin) | No practical benefit — see §12 finding | — | — |
| Breakpoints (`BREAKPOINTS_PX`) | `config/theme.ts` | Yes, mirrors Tailwind's own breakpoints | No | — | — |
| Animation durations (`MOTION_MS`) | `config/theme.ts` | Yes | Low value to expose | — | Low |
| Content max-width (`CONTENT_MAX_WIDTH_PX` = 1120px) | `config/theme.ts`, consumed via `Container.tsx` | Yes (single component) | Yes, trivially | Small | Low-medium |

### Design tokens — NOT centralized (fragmented)

| Decision | Where defined | Centralized? | Notes |
|---|---|---|---|
| Font families (Shippori Mincho / Cormorant Garamond / Noto Sans JP / Inter) | **Two files must stay in sync**: `next/font/google` loader calls in `app/layout.tsx` (imports, weights, `--font-*` variable names) + the `--font-heading-ja`/`--font-heading-en`/`--font-body-ja`/`--font-body-en` mapping in `app/globals.css` | **No** | Changing a font means editing a Next.js font-loader import (choosing a real Google Fonts family, matching Latin/JP pairing) *and* the CSS mapping. This is the highest-friction "should be easy but isn't" item found in the whole audit. |
| Section vertical rhythm (`py-16 lg:py-24`) | Repeated as a literal Tailwind class string in **every one of the 10+ section components** | **No** | No shared "section padding" constant/class exists; a "denser" or "more spacious" preset would require touching every section file individually today. |
| Section eyebrow/heading/body type scale (`text-[28px] leading-[1.28] ... lg:text-[40px]`, etc.) | Centralized in `SectionHeading.tsx` for H2s; but H1 (Hero) and every card/row type size is a separate literal in its own component | **Partial** | Hero's H1 size (`text-[34px] ... lg:text-[56px]`) lives only in `HeroSection.tsx`; MenuRow's `h3` size lives only in `MenuRow.tsx`. No single type-scale source of truth. |
| Button visual treatment (padding, radius, hover color `#833d33`) | `components/ui/Button.tsx` `base`/`variants` | Yes — this one *is* centralized, in the one file | The `hover:bg-[#833d33]` primary hover color is a literal hex, not derived from `--color-accent`, so an accent color change does **not** automatically re-tint the hover state — a latent inconsistency worth documenting, not fixing here. |
| Image aspect ratios / object-position | Per-component literals (Hero 900×1200 mobile / 1600×1000 desktop with different `objectPosition`; Staff 800×1000; Concept/Salon Features 1400×933) | No | Each is a deliberate, documented art-direction choice (see Hero's own code comments) — not accidental, but also not swappable without editing the component. |

### Content that is not config at all (source-code-only)

| Content | Where it lives | Why it matters |
|---|---|---|
| Hero subheadline | Literal string prop in `app/page.tsx:45` | Second-most prominent text on the site; not in `demo-content.ts`, not in any Sheet |
| Concept eyebrow/title/2 paragraphs | Literal string props in `app/page.tsx:49-54` | A full editorial block, hard-coded in the composition root, not a content file |
| Both `ReservationCtaBand` heading+message pairs | Literal string props in `app/page.tsx:70-71,93-94` | |
| `SITE_CONFIG.business.tagline` / `.nameLatin` / `.postalCode` / `.socialLinks` | `config/demo-content.ts` | **These are never overridden by the real GAS `CONFIG` sheet** — `PublicRuntimeConfig` (the `getConfig` contract) simply has no `tagline`/`nameLatin`/`postalCode`/`socialLinks` fields (`types/runtime-config.ts:12-17`), so `resolveSiteConfig.ts:17-22` always pulls these four from the frontend-only demo constant, *even in full production/runtime mode*. A buyer who fills in their real Sheets still ships the demo tagline/social links unless they also hand-edit `config/demo-content.ts`. This is a real gap between "what the buyer thinks is centrally configured" and "what actually is." |
| `GALLERY_IMAGES`, `SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`, `ACCESS_INFO`, `NAV_ITEMS` | `config/demo-content.ts` | No sheet/config backing exists for any of these — deliberate per the Phase 5.1 comments (not part of the `getConfig` contract), but worth naming explicitly as **the entire lower two-thirds of the homepage's editorial content has no non-code editing path.** |

### The runtime-data ceiling (important, cross-cutting finding)

The `SERVICES` and `STAFF` Google Sheets (`product/coconala-salon-template/03_GOOGLE_SHEETS/templates/{SERVICES,STAFF}.csv`) have these columns only:

```text
SERVICES: ServiceID, Name, DurationMinutes, Price, Active, StaffRequired, DisplayOrder
STAFF:    StaffID, Name, Active, CalendarID, DisplayOrder
```

`lib/config/resolveCatalog.ts` maps the GAS wire types (`PublicService`,
`PublicStaff` — themselves column-matched to those sheets, see
`types/reservation.ts:53-65`) onto the presentation types
(`types/content.ts`'s `Service`/`StaffMember`), and **explicitly, by design,
leaves `description`/`category` (Service) and `role`/`introduction`/
`photoSrc`/`photoAlt` (StaffMember) undefined** — the code comment at
`resolveCatalog.ts:6-10` says so outright, because there is no sheet column
to source them from.

Effect on the shipped LP: `StaffCard.tsx:24-33` already has a graceful
fallback (initial-letter tile) for exactly this case. So **once a real buyer
connects their actual GAS backend — the entire point of the product — every
staff member on their live site renders as a plain colored initial instead
of a photo, with no role/bio line, and every menu row loses its description
line.** This is not a bug (it degrades gracefully, no broken image, no
crash) but it is a significant, currently-undocumented gap between the demo
the buyer evaluates before purchase and what their own live site looks like
after they wire up Sheets — and it works *against* "make each buyer's site
feel distinct," not for it, because every buyer's staff grid converges on
the same plain-initials look. Fixing this would require adding columns to
the `STAFF`/`SERVICES` sheet schemas and GAS mapping code — explicitly out
of this audit's scope — but it is flagged here because it directly bears on
the business question in §23/§25.

---

## D. Design / Customization Matrix

Legend — **Level**: A = customer-editable now, B = technically possible but
inconvenient, C = not realistically customizable without dev work. **Impact**
1–5 (visual impact), **Effort** 1–5 (customer effort), **Cost**: S/M/L/XL
(implementation cost if we were to improve it), **Value**: Low/Med/High/VHigh.

| Category | Customization | Current State | Customer Method | Impact | Effort | Cost | Value | ¥2,500? | Setup/Custom? |
|---|---|---|---|---:|---:|---|---|---|---|
| Content | Business name/phone/email/address | Runtime, Sheet-backed | Edit CONFIG sheet | 1 | 1 | — | Low | Yes | Self-service |
| Content | Business hours | Runtime, Sheet-backed | Edit CONFIG sheet | 1 | 1 | — | Low | Yes | Self-service |
| Content | Menu items (name/duration/price) | Runtime, Sheet-backed | Edit SERVICES sheet | 3 | 2 | — | High | Yes | Self-service |
| Content | Menu description/category | **Not available via runtime data (Level C)** | N/A — sheet has no column | 3 | — | XL (GAS+Sheets) | Med | No | Custom Service |
| Content | Staff names | Runtime, Sheet-backed | Edit STAFF sheet | 2 | 2 | — | Med | Yes | Self-service |
| Content | Staff role/bio | **Not available via runtime data (Level C)** | N/A — sheet has no column | 3 | — | XL (GAS+Sheets) | Med | No | Custom Service |
| Content | Business tagline (Hero H1) | **B** — frontend-only constant, ignores Sheets | Edit `config/demo-content.ts` | 4 | 3 | S (add field to `getConfig` contract) | VHigh | Documented only | Setup Support |
| Content | `nameLatin` / postal code / social links | B — frontend-only constant | Edit `config/demo-content.ts` | 2 | 3 | S | Med | Documented only | Setup Support |
| Content | Hero subheadline | B — literal prop in `app/page.tsx` | Edit `app/page.tsx` | 3 | 4 | S (move to content file) | Med | Documented only | Setup Support |
| Content | Concept eyebrow/title/paragraphs | B — literal props in `app/page.tsx` | Edit `app/page.tsx` | 4 | 4 | S | High | Documented only | Setup Support |
| Content | Reservation CTA band heading/message (×2) | B — literal props in `app/page.tsx` | Edit `app/page.tsx` | 2 | 4 | S | Low | Documented only | Setup Support |
| Content | Gallery captions/alt text | B | Edit `config/demo-content.ts` | 1 | 3 | — | Low | Documented only | Setup Support |
| Content | Salon Features (4 reassurance bullets) | B | Edit `config/demo-content.ts` | 3 | 3 | — | Med | Documented only | Setup Support |
| Content | Customer Flow steps | B | Edit `config/demo-content.ts` | 2 | 3 | — | Low | Documented only | Setup Support |
| Content | FAQ items | B | Edit `config/demo-content.ts` | 3 | 3 | — | Med | Documented only | Setup Support |
| Content | Access / transit directions | B | Edit `config/demo-content.ts` | 2 | 3 | — | Low | Documented only | Setup Support |
| Content | Nav item labels/anchors | B | Edit `config/demo-content.ts` | 2 | 3 | — | Low | Documented only | Setup Support |
| Content | CTA button label text ("ご予約はこちら" etc.) | B — repeated literal across ~6 files | Edit each component | 2 | 4 | S (centralize as constants) | Low | Documented only | Setup Support |
| Images | Hero image | A (same filename) / B (new filename) | Replace file under `public/images/hero/` | 5 | 1–2 | — | VHigh | Yes | Self-service |
| Images | Concept image | A/B | Replace file under `public/images/salon/` | 3 | 1–2 | — | Med | Yes | Self-service |
| Images | Salon Features image | A/B | Replace file under `public/images/salon/` | 3 | 1–2 | — | Med | Yes | Self-service |
| Images | Gallery images (set + count) | A | Edit array in `config/demo-content.ts` + add files | 4 | 2 | — | High | Yes | Self-service |
| Images | Staff photos | **A only in demo mode; C once real GAS is wired** | N/A for real data | 4 | — | XL (GAS+Sheets) | VHigh | No (flag it) | Custom Service |
| Images | Logo image | **C — no logo slot exists**, header renders text name only | N/A | 4 | — | M (new header layout branch) | High | No | Preset/Guided |
| Branding | Accent color | B, single CSS var, already documented | Edit `app/globals.css` `@theme inline` | 3 | 2 | — | High | Documented only | Setup Support (already is) |
| Branding | Full color palette (12 vars) | B, single file, but no contrast-safety guidance | Edit `app/globals.css` | 4 | 3 | S (curated presets) | VHigh | No — risk of broken AA contrast | Preset |
| Branding | Font families | B, **two files must stay in sync**, requires Google Fonts knowledge | Edit `app/layout.tsx` + `app/globals.css` | 5 | 4 | M (curated pairing presets) | VHigh | No | Preset |
| Branding | Border radius scale | B | Edit `app/globals.css` | 2 | 2 | S | Low | Documented only | Setup Support |
| Branding | Button style (padding/radius/hover) | B, centralized in one file | Edit `components/ui/Button.tsx` | 3 | 3 | S | Med | No | Preset/Guided |
| Branding | Section vertical rhythm/density | **C — no single lever, repeated per-file** | N/A | 3 | — | L (sweep 10+ files or introduce a CSS var) | Med | No | Custom Service |
| Layout | Hero arrangement (only 1 exists) | **C — no variant** | N/A | 5 | — | M (new self-contained layout branch) | VHigh | No | Preset (post-V1.1) |
| Layout | Menu layout (only "editorial list" exists) | **C — no variant** | N/A | 4 | — | M | High | No | Preset (post-V1.1) |
| Layout | Staff layout (only "portrait grid" exists) | **C — no variant** | N/A | 4 | — | M | Med-High | No | Preset (post-V1.1) |
| Layout | Gallery layout (only "masonry" exists) | **C — no variant** | N/A | 3 | — | M | Med | No | Preset (post-V1.1) |
| Layout | Header style (only 1 exists) | **C — no variant** | N/A | 3 | — | M | Med | No | Preset (post-V1.1) |
| Layout | Section widths (1120/760px) | B, centralized in `Container.tsx` | Edit one file | 2 | 1 | S | Low | Documented only | Setup Support |
| Structure | Section order | **C — hard-coded JSX sequence, not data-driven** | N/A safely; risky manual JSX edit | 5 | — | M (order-registry refactor) | VHigh | No | Preset (post-V1.1) |
| Structure | Section visibility — Staff/Contact/Reservation CTA | **A** — already flag-gated | Edit CONFIG sheet | 4 | 1 | — | High | Yes | Self-service (already shipped) |
| Structure | Section visibility — Concept/Gallery/SalonFeatures/CustomerFlow/FAQ/Access | **C — no flag exists** | N/A | 4 | — | S per section (new boolean + prop) | High | No | Preset (near-term) |
| Structure | Number of gallery images | A | Array length | 3 | 1 | — | Med | Yes | Self-service |
| Structure | Number of staff members | A | Sheet rows | 2 | 1 | — | Low | Yes | Self-service |
| Structure | Number of FAQ items | A/B | Array length | 2 | 2 | — | Low | Yes (via docs) | Self-service |
| Behavior | Feature flags (contact/reservation/staff selection) | A | CONFIG sheet | 4 | 1 | — | High | Yes | Self-service (already shipped) |
| Behavior | Reservation CTA destination (`/reservation`) | Fixed by design | N/A | — | — | — | — | N/A (must stay stable) | Not a customization point |
| Behavior | Mobile nav visual style | **C — one pattern only** | N/A | 2 | — | M | Low | No | Custom Service |
| Excluded | Arbitrary CSS/animation/new JS behavior | Always possible by editing source | Edit any file | varies | 5 | — | — | No | Custom Service (see §20) |

---

## E. Current architecture assessment

**Bottom line: the codebase is well-prepared for *content* productization
(shipped, works) and *color-token* productization (one clean lever exists,
already documented to buyers), but is not yet prepared for *layout/variant*
productization — that layer doesn't exist at all, not even scaffolding.**

What's already strong:

1. **Runtime/GAS boundary is clean.** `getConfig`/`getServices`/`getStaff`
   feed a validation layer (`lib/validation/*Validator.ts`) → a mapping layer
   (`resolveSiteConfig.ts`, `resolveCatalog.ts`) → presentation types
   (`types/content.ts`). No section component imports GAS types or calls the
   GAS client directly — every section only ever receives already-shaped
   props. This means **any presentation-layer redesign work (themes,
   layouts, section order) can proceed without touching `getConfig`,
   `getServices`, `getStaff`, `createReservation`, Calendar, Sheets, or the
   reservation domain at all** — confirmed by reading every call site; see
   §17.
2. **Color tokens are already centralized** in one CSS file
   (`app/globals.css`), already documented to buyers
   (`05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`, which already exists in
   the shipped v1.0.0 package under `product/coconala-salon-template/`).
   This is the cheapest possible lever and it's already in the product.
3. **The Reservation Wizard has its own independent, simpler rendering**
   (`components/reservation/ServiceSelection.tsx`,
   `StaffSelection.tsx` — plain radio rows, not cards) of the same catalog
   data the homepage Menu/Staff sections render. Redesigning
   `MenuSection`/`StaffSection` visuals cannot regress the booking flow,
   because the two are already decoupled.

What's missing/fragile:

1. **No variant mechanism exists above `Button`/`Container`/
   `SectionHeading`.** Every section component (Hero, Menu, Staff, Gallery,
   Header) has exactly one layout, hard-coded. This is the actual gap
   behind "buyers will look identical" — not missing content config (which
   is already good), but missing *layout* plurality.
2. **Section order is imperative JSX, not declarative data.** There is no
   `sections: SectionConfig[]` array anywhere; reordering means editing
   `app/page.tsx` by hand, which is both Level-C-inconvenient for a buyer
   and fragile (easy to break the `Promise.all`/props wiring above it while
   doing so).
3. **Two content-ownership gaps work against the "make it feel like your
   own site" goal specifically**: (a) the four business-presentation
   fields (`tagline`, `nameLatin`, `postalCode`, `socialLinks`) silently
   stay on the demo value forever because `PublicRuntimeConfig` doesn't
   carry them — a buyer who diligently fills in their Sheets can still ship
   the demo salon's tagline without realizing it; (b) five full content
   blocks (Gallery captions, Salon Features, Customer Flow, FAQ, Access)
   plus the Concept section's entire editorial copy have **no** non-code
   editing path, and some of that copy lives directly in the composition
   root (`app/page.tsx`) rather than the already-documented
   `config/demo-content.ts`, so even a buyer following the current
   `05_CUSTOMIZATION/CONTENT_CUSTOMIZATION_JA.md` guide would need to know
   to look in the *page file itself*, not just the content file, for some
   copy.
4. **Font-family customization is two files that must be kept in sync**
   (`app/layout.tsx` font loaders + `app/globals.css` variable mapping),
   and requires actual Next.js `next/font/google` knowledge — this sits
   well above the "technically capable buyer" bar assumed by the product
   brief, and is not currently documented at all beyond "here's where the
   tokens are."

---

## F. Proposed design dimensions

| Dimension | Current capability | Potential variants | Visual impact | Impl. cost | Customer effort (if exposed as a preset choice) | Compat. risk | Recommendation |
|---|---|---|---|---:|---:|---|---|
| **Color theme** | 1 palette, centralized | 5–8 curated palettes (swap the same 12 CSS vars) | High | S | Very low (pick a name) | None — pure CSS var swap, contrast-checked once per preset | **Do first** |
| **Typography** | 1 font pairing, 2 files | 3–4 curated pairings (JP heading/body × Latin heading/body) | Very high | M | Very low if bundled into the same preset picker; High if done manually | Low if bundled as a preset (font loading stays server-side, no runtime cost change) | Bundle into the theme preset, don't expose raw font editing |
| **Hero layout** | 1 layout | 2 alternates (e.g. current full-bleed-bottom-left; a centered/split variant) | Very high | M | Low (preset choice) | Low — self-contained component, no shared state | High priority for V1.1 |
| **Header style** | 1 style (transparent-over-hero, fixed) | 1–2 alternates (e.g. always-solid bar, centered logo) | Medium | M | Low | Low-medium — header touches every page, so more test surface | Medium priority |
| **Menu layout** | 1 layout (editorial list) | 1–2 alternates (card grid) | High | M | Low | Low — isolated to 3 files, decoupled from Reservation Wizard | High priority for V1.1 |
| **Staff layout** | 1 layout (portrait grid) | 1–2 alternates | Medium-high | M | Low | Low — same decoupling as Menu; capped in value by the photo/bio data ceiling (§C) | Medium priority, note the data ceiling |
| **Gallery layout** | 1 layout (masonry) | 1–2 alternates (uniform grid, optional lightbox) | Medium | M | Low | Low | Lower priority than Hero/Menu |
| **Section order** | Hard-coded, single order | 2–3 vetted alternate orders (not arbitrary permutation) | Very high | M (needs a small order-registry, not a free-for-all) | Low if preset; High if manual JSX edit (today's only option) | Medium — must keep narrative dependencies intact (see §14) | High priority, but curated not freeform |
| **Section visibility** | 3 of 12 sections gated | Extend gating to the other 6 static-content sections | High | S per section | Low (boolean per section) | Low | High priority, cheap |
| **Button style** | 1 style, centralized | 2 alternates (e.g. sharp vs. rounded, filled vs. outlined-first) | Medium | S | Low if bundled with theme | Low | Bundle into theme preset |
| **Image treatment** | Fixed aspect ratios/positions per section | Could vary crop/aspect ratio per preset | Medium | M | Low if bundled | Low-medium (art-direction quality risk if not curated) | Low priority — current choices are already deliberate |
| **Spacing density** | Fixed `py-16 lg:py-24` per section, no lever | Compact/Standard/Relaxed | Medium | L (no centralized token today — see §C) | Low if exposed as a toggle after the token exists | Medium — touches every section file once to introduce the token | Low priority relative to cost |

---

## G. Proposed design preset candidates (5–8)

These are **content/theme-and-layout compositions**, not new components.
Each assumes the V1.1 scope in §J has shipped (a handful of curated theme
tokens + 1–2 layout variants per section + section-order/visibility
presets). Presets marked "(theme-only today)" describe what's achievable
purely with the *existing* architecture (§D-level B items you'd curate into
a preset picker), without waiting for any new layout variant work.

**01. 凛 (Rin) — Quiet Luxury Japanese** *(the current default, formalized as a preset)*
Target: nail/eyelash salons wanting a hushed, editorial feel.
Color: warm off-white / sumi-black / muted terracotta accent (current
palette). Typography: Shippori Mincho + Cormorant Garamond serif pairing.
Hero: full-bleed photo, bottom-left text (current). Menu: editorial list.
Staff: portrait grid. Gallery: masonry. Section order: current (A).
Personality: restrained, spacious, high-contrast typography moments.

**02. 白磁 (Hakuji) — Clinical Minimal** *(theme-only today)*
Target: medical-adjacent aesthetic clinics, minimalist nail bars.
Color: near-white background, cool grey secondary, a single desaturated
blue-grey or sage accent instead of terracotta. Typography: swap the serif
Latin pairing for a geometric sans (Inter-only, no Cormorant). Hero/Menu/
Staff/Gallery: same layouts as preset 01 (achievable now). Personality:
sparse, clinical-calm, more whitespace-forward than warm.

**03. 桜庵 (Sakuran) — Soft Pastel Contemporary**
Target: younger-skewing nail/eyelash salons.
Color: blush background, soft rose accent, warm grey text (still meets AA
if curated). Typography: rounder sans body pairing. Hero: **needs the
centered/split hero variant** (V1.1). Menu: card-grid variant. Staff:
portrait grid (unchanged). Gallery: uniform grid, not masonry. Section
order: Gallery moved earlier, right after Hero (needs order-registry).
Personality: friendly, photo-forward, less text-dense.

**04. 墨 (Sumi) — Bold Editorial Dark**
Target: barbershops, men's grooming, high-end hair salons.
Color: invert the current palette's role — dark warm-black background,
off-white text, a brighter accent (current design explicitly excludes dark
mode per Phase 2A — this preset is a deliberate *dark-first* theme, not a
toggleable dark mode; needs its own contrast pass, not a free palette swap).
Typography: bolder sans headings. Hero: full-bleed, large type (current
layout works, just re-themed). Menu: editorial list (current). Staff:
portrait grid. Personality: dramatic, high-contrast, fewer sections visible
(hide Salon Features/Customer Flow via the new visibility flags to keep it
terse).

**05. 木漏れ日 (Komorebi) — Warm Organic / Botanical**
Target: relaxation/spa-adjacent salons, botanical-themed interiors.
Color: sage green + warm cream + soft brown accent. Typography: current
serif/sans pairing kept, slightly larger line-height. Hero: current layout.
Menu: editorial list. Staff: **needs staff-with-bio-line variant** (bounded
by the data ceiling in §C unless STAFF sheet gains a bio column — flag this
to the buyer). Gallery: masonry (current). Personality: soft, natural,
generous whitespace.

**06. 都会 (Tokai) — Monochrome Urban**
Target: unisex hair salons, barbershops in urban settings.
Color: greyscale palette with one sharp accent (e.g. deep red or electric
blue) used sparingly. Typography: sans-only pairing (no serif). Hero:
**needs the split/centered variant**. Menu: card-grid variant. Header:
**needs the always-solid header variant** (V1.1) instead of transparent-
over-hero, since this preset's hero may not always be a full photo.
Personality: graphic, confident, fewer soft transitions.

*(6 presets shown; 7th/8th — e.g. a bridal/formal preset and a
kids/family-salon preset — are plausible future additions once the V1.1
layout variants exist, but are not detailed here since they'd only be
theme re-skins of presets already listed, adding little genuine
distinctiveness on top of 01–06.)*

---

## H. Top 10 highest-ROI improvements

Ranked by (visual impact) × (low customer effort) × (low-to-medium
implementation cost), per the brief's stated priority.

**#1 — Curated color-theme presets (5–8), swappable as one named choice**
Why it matters: single biggest lever already in the codebase (§C), just not
packaged as a choice yet — today a buyer must hand-edit hex values in
`globals.css` with no contrast guidance.
Impact: High · Effort: Very low (pick a name) · Cost: S · Architecture
impact: None (still just the same 12 CSS vars + font loader swap) ·
Recommended phase: V1.1, first.

**#2 — Bundle font-pairing choice into the same preset (don't expose raw font editing)**
Why it matters: font family is scored Impact 5 / Effort 4 today — the
single worst effort-to-impact ratio in the whole matrix, purely because it
spans two files and requires Next.js font-loader knowledge.
Impact: Very high · Effort: today Very high, becomes Very low if bundled ·
Cost: M (small font-loader registry keyed by preset) · Architecture
impact: Low (still build-time `next/font/google`, no runtime cost) ·
Recommended phase: V1.1, alongside #1.

**#3 — Section visibility flags for the remaining 6 static-content sections**
Why it matters: Concept/Gallery/SalonFeatures/CustomerFlow/FAQ/Access
currently cannot be hidden at all; a shorter, denser page reads completely
differently from a long one, and this is nearly free (the pattern already
exists for Staff/Contact/Reservation-CTA).
Impact: High · Effort: Very low (toggle) · Cost: S per section · Architecture
impact: None (frontend-only booleans, no GAS change needed if kept out of
the `getConfig` contract, e.g. a new small `design.ts`/`sections.ts` config
object) · Recommended phase: V1.1.

**#4 — Move all `app/page.tsx`-embedded copy (Hero subheadline, Concept
block, both CTA-band pairs) into the content file**
Why it matters: not a visual change, but removes the current trap where a
buyer following `CONTENT_CUSTOMIZATION_JA.md` edits `config/demo-content.ts`
and is surprised that several highly visible strings live elsewhere; also
lowers the risk of a buyer breaking the `Promise.all` composition while
trying to edit copy.
Impact: Medium (content correctness, not new visuals) · Effort: today High
(must find the right file), becomes Low once centralized · Cost: S ·
Architecture impact: None · Recommended phase: V1.1, do alongside #3.

**#5 — One curated Hero layout alternative (e.g. centered or split, vs. today's single full-bleed-bottom-left)**
Why it matters: Hero is scored Impact 5 across the board (first impression);
currently zero layout alternatives exist anywhere in the codebase for it.
Impact: Very high · Effort: Low once built (preset choice) · Cost: M
(self-contained new component branch, same props contract) · Architecture
impact: Low (isolated to `HeroSection.tsx`) · Recommended phase: V1.1/V1.2.

**#6 — 2–3 vetted alternate section orders (not freeform reordering)**
Why it matters: section order is scored Impact 5, and today is entirely
inaccessible except by risky hand-edits to the composition root.
Impact: Very high · Effort: Low if exposed as a named choice · Cost: M
(needs a small order-registry / config-driven `page.tsx`, careful to
preserve narrative dependencies — see §14) · Architecture impact: Low-
medium (touches the composition root, the one file with the most existing
"this order is deliberate" documentation) · Recommended phase: V1.2 (after
#1–#5 prove the preset-picker pattern).

**#7 — One Menu layout alternative (card-grid vs. today's single editorial list)**
Why it matters: Menu is one of the two data-heavy, always-visible sections;
a genuinely different treatment changes the page's whole first two screens.
Impact: High · Effort: Low (preset choice) · Cost: M (3 files:
`MenuSection`/`MenuCategory`/`MenuRow`) · Architecture impact: Low
(decoupled from Reservation Wizard, confirmed in §17) · Recommended phase:
V1.2.

**#8 — Centralize the repeated CTA button label strings**
Why it matters: "ご予約はこちら" (and variants) is currently a literal
string duplicated across ~6 component files; a buyer wanting different CTA
wording today has to find and edit all of them consistently.
Impact: Low-medium (correctness/consistency, not a new visual) · Effort:
today Medium-high (must find every instance) · Cost: S · Architecture
impact: None · Recommended phase: V1.1, cheap enough to bundle with #4.

**#9 — One Staff layout alternative, explicitly documented against the data ceiling**
Why it matters: high visual impact, but must be shipped with a clear note
that role/bio/photo only exist in demo mode until the STAFF sheet schema
changes (out of this audit's scope) — shipping the variant without that
caveat would create support tickets from buyers expecting bios that their
data can't carry.
Impact: Medium-high · Effort: Low · Cost: M · Architecture impact: Low ·
Recommended phase: V1.2, with a documentation note, not a code fix to the
data ceiling.

**#10 — One Gallery layout alternative (uniform grid vs. masonry)**
Why it matters: lower ceiling than Hero/Menu/Staff (Gallery already varies
naturally per buyer just from their own photos), but cheap and rounds out
"every major visual section has ≥2 looks."
Impact: Medium · Effort: Low · Cost: M · Architecture impact: Low ·
Recommended phase: V1.2/V1.3, lowest priority of the layout-variant work.

---

## I. Recommended ¥2,500 customization boundary

**Self-service (buyer edits data, no source-code literacy needed beyond
opening a spreadsheet or replacing a file):**
Business info, hours, feature flags, Menu rows, Staff rows, Gallery image
files (same filename), Hero/Concept/Salon-Features image files (same
filename), staff-selection/contact-form/reservation visibility (already
shipped).

**Preset (buyer picks a name from a curated list; we built the options,
they don't design anything):**
Color theme + font pairing (recommendation #1/#2), a Hero layout variant
(#5), a Menu layout variant (#7), a Staff layout variant (#9), a Gallery
layout variant (#10), a vetted section-order choice (#6), section-
visibility toggles for the 6 currently-ungated sections (#3).

**Guided (documented, buyer edits source with a clear "here's exactly what
to change" doc — today's `05_CUSTOMIZATION/*.md` pattern, extended):**
Accent/full color palette if they don't like any preset, button style
tweaks, border radius, section max-width, CTA button label text (#8, once
centralized to one constants file), the presentation-only business fields
(tagline/nameLatin/postal code/social links) once moved out of the
composition root (#4).

**Exclude from ¥2,500 — Setup Support:**
Anything requiring the buyer to correctly edit `app/page.tsx`'s composition
root as it exists today (Concept copy, both CTA-band copy pairs, Hero
subheadline) *before* recommendation #4 ships; font-family changes *before*
#2 ships (genuinely requires Next.js font-loader knowledge today).

**Exclude from ¥2,500 — Custom Service:**
New section types, new interactive features (lightbox, filtering,
carousels), arbitrary CSS/animation work, a genuinely different page
architecture, spacing-density system (§C, no centralized lever exists —
would require sweeping every section file), staff bio/photo support for
real (live) data (requires a Sheets schema + GAS change, out of this
audit's scope entirely), arbitrary component restructuring. These require
either meaningful implementation work or changes outside the frontend
presentation layer (GAS/Sheets), matching §20's framing exactly — this is
where genuine dev-hours belong, not the base package.

---

## J. Recommended V1.1 scope

Based on the matrix (§D) and ROI ranking (§H), the smallest scope that
meaningfully answers the business question ("stop buyers from looking
identical") without touching GAS/Sheets/reservation logic:

1. **5–6 color-theme + font-pairing presets** (H#1 + H#2 combined into one
   preset picker — don't ship them separately, since a color-only change
   without a type-pairing change under-delivers on "feels different").
2. **Section visibility flags** for the 6 currently-ungated static sections
   (H#3).
3. **Move composition-root-embedded copy into the content file** (H#4) and
   **centralize CTA label strings** (H#8) — both cheap, both fix real
   "documented customization guide doesn't match reality" gaps, do these
   *before* or *alongside* the preset work so the preset picker has a
   single, complete content surface to describe.
4. **Stop here for V1.1.** Do **not** attempt Hero/Menu/Staff/Gallery
   layout variants or section-order presets in V1.1 — those are all
   correctly scored Cost M (multi-file, new-component-branch work) and
   carry the most compatibility risk of anything in the matrix. Prove the
   preset-picker pattern (config shape, how a buyer selects a preset, how
   it's documented) on the cheap theme/visibility/content work first.

**V1.2 (next, not V1.1):** one Hero layout variant (H#5), one Menu layout
variant (H#7), one vetted section-order alternative (H#6) — these are the
three highest-impact remaining items and are each self-contained enough to
ship independently rather than as one big-bang release.

**Explicitly deferred, no target phase set:** Staff layout variant (blocked
on documenting the data ceiling first), Gallery layout variant (lowest ROI
of the layout work), spacing-density system (no centralized lever exists
yet, highest cost-to-value ratio in the whole matrix), header style
variants (touches every page).

This is smaller than the prompt's illustrative "6 presets + several layout
variants + section ordering + section visibility + brand customization" —
the audit's finding is that **brand customization (color+font) and section
visibility are both cheap and ready now, while layout variants and section
ordering are real, multi-file component work that should follow, not lead,
so that the preset-picker mechanism itself is validated on low-risk changes
first.**

---

## K. Visual variation capacity

**Conservative (V1.1 as scoped in §J — theme/font presets + section
visibility + content completeness, no new layouts):**
5–6 curated theme presets × on/off for 6 optional sections (a buyer
realistically toggles 0–3 of them, not all 2⁶ combinations meaningfully) ≈
**roughly 15–25 genuinely distinguishable base configurations**, before
counting each buyer's own unique photos/copy/menu/staff — which, per §C,
are the actual biggest driver of feeling "like your own site" once the
literal duplicate-looking-theme problem is solved.

**Realistic (V1.2 shipped — theme/font presets + 1 Hero variant + 1 Menu
variant + 1 vetted section-order alternative + section visibility, curated
as bundled preset compositions rather than a free mix-and-match matrix, per
§26's "don't optimize for setting count" principle):**
Each of the 5–6 presets in §G is defined as a *bundle* (its own hero
layout + menu layout + section order + visibility defaults), not
independently mixable knobs — this keeps every combination curated-quality.
That yields **the 5–6 presets themselves as the realistic count of
genuinely distinct "looks,"** each then further varied by the buyer's own
content/photos/section-visibility toggles for **on the order of 30–50
meaningfully distinct-feeling live sites** across a modest buyer base,
without any two buyers who picked different presets ever looking alike.

**Theoretical (full combinatorial, freely mixing every independent knob —
6 themes × 2 hero layouts × 2 menu layouts × 2 staff layouts × 2 gallery
layouts × 2–3 section orders × 2⁶ visibility toggles):**
Raw multiplication exceeds 10,000. This number is **explicitly not
meaningful** — most of that space is either visually indistinguishable
(swapping only the Gallery layout while everything else matches barely
registers) or actively bad (a mismatched theme/layout/order combination
that no one curated). Per §26, this number should never be quoted to the
business as "how many designs we support" — the bundled-preset count in
"Realistic" above is the honest answer.

**Answer to the core business question:** yes, the architecture can
realistically produce enough genuinely distinct-looking sites to solve the
"buyers look identical" concern — but only if the investment goes into a
**small number of hand-curated, bundled presets** (theme + layout +
order + defaults shipped together) rather than either (a) doing nothing
beyond content (today's state — real risk of duplicate-looking sites) or
(b) building every dimension as an independently-mixable buyer-facing knob
(over-engineering that would also generate bad-looking combinations no one
tested).

---

## L. Risks

**Duplicated websites (current state, before any V1.1 work):** Real risk
today. Every buyer who doesn't hand-edit CSS/fonts/JSX ships the same
theme, same fonts, same Hero/Menu/Staff/Gallery layout, same section order.
The only guaranteed-different elements are their own business
name/hours/menu-text/staff-names/photos (Gallery, and Hero/Concept/Salon-
Features images if they rename files) — real but visually modest
differentiation for a ¥2,500 listing.

**Duplicated websites (if only §H#1/#2 ship, no layout variants ever):**
Reduced but not eliminated — 5–6 buyers who each pick a different color
theme will look different from each other, but the *N+1*th buyer converges
back onto an already-used theme. Section visibility + content completeness
(§J items 2–3) meaningfully help here too, since two buyers with the same
theme but different section sets/lengths already read as different sites.

**Confusing customization if knobs are exposed independently rather than
bundled:** A buyer picking "Sakura theme" + "Sumi dark hero" + "editorial
menu" could produce a genuinely ugly, low-contrast combination no one
tested. §K's "bundle as presets" recommendation exists specifically to
prevent this — expose *preset names*, not independent sliders, to a ¥2,500
buyer.

**Excessive code complexity / maintenance burden:** The matrix in §D shows
several places where a "quick win" (e.g., spacing density) has a
disproportionately high implementation cost because no centralized lever
exists yet (repeated literals across 10+ files). Building presets on top of
that *without* first centralizing (as §H#4/#8 recommend for content/CTA
labels) would compound the fragmentation rather than fix it — do the
centralization items before or alongside the preset work, not after.

**Maintenance problems from variant proliferation:** Every new Hero/Menu/
Staff/Gallery layout variant is a second (or third) real component to keep
in sync with prop-contract changes, accessibility fixes, and responsive
behavior. §J's phased approach (theme/content first, one layout variant
per section at a time in V1.2+) is deliberately conservative about this —
building all four section variants simultaneously was explicitly not
recommended.

**Broken reservation functionality:** Verified low risk for presentation-
layer work specifically. §17/§E confirm the Reservation Wizard already
renders its own independent, simpler UI for the same catalog data, and
every homepage section only ever receives already-validated, already-mapped
props — no section component imports a GAS type or calls the GAS client.
The one place this discipline could slip is if a future "section order"
implementation moved the Reservation CTA relative to the
`features.reservation` gating logic carelessly — worth a specific test case
when #6 is implemented, not a blocker today.

**Poor customer experience from the runtime-data ceiling (§C):** Not a
design-system risk, but flagged because it directly undercuts the business
goal: once a real buyer wires up their GAS backend, their Staff section
silently degrades to plain initials with no bios, and Menu rows silently
lose descriptions — the opposite of "make it feel like your own." This is
already handled gracefully (no crash, no broken image) but is currently
**undocumented** as a known limitation. Recommend documenting it in
`05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`/`MENU_CUSTOMIZATION_JA.md`
regardless of whether/when the underlying Sheets schema is ever extended —
that's a docs-only fix, no code change, and still out of this audit's
read-only scope to make.

---

## Validation

- **No source files modified:** `git status -s` before and after this audit
  shows only the same pre-existing untracked directories
  (`.evidence/...`, `docs/superpowers/plans/...`, `product/`) that were
  present at session start — no tracked file changed, and the only new file
  is this document itself (`docs/design-customization-audit.md`).
- **No tests modified.**
- **No GAS changes.** `apps/salon-portfolio/gas/` was not opened for
  editing; only its Sheet **templates** (`product/.../03_GOOGLE_SHEETS/
  templates/*.csv`, already-shipped v1.0.0 package artifacts) were read to
  confirm the SERVICES/STAFF column ceiling described in §C.
- **No commits, no push, no merge.**
- **Method:** every claim above traces to a specific file read in this
  session (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`,
  `config/theme.ts`, `config/demo-content.ts`, `types/content.ts`,
  `types/runtime-config.ts`, `types/reservation.ts`,
  `lib/config/resolveSiteConfig.ts`, `lib/config/resolveCatalog.ts`,
  `lib/config/runtimeConfig.ts`, `lib/config/runtimeCatalog.ts`,
  `lib/validation/runtimeConfigValidator.ts`, every file under
  `components/sections/`, `components/layout/`, `components/ui/`, the
  Reservation Wizard's `StaffSelection.tsx`/`ServiceSelection.tsx`, the
  Contact form components, `package.json`, `next.config.ts`,
  `tsconfig.json`, the shipped `05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`
  guide, and the `SERVICES.csv`/`STAFF.csv`/`CONFIG.csv` sheet templates) —
  no claim is based on a prior task description or assumption about the
  codebase.
