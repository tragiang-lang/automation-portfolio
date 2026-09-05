# Phase 2A — UI/UX Specification: Salon Portfolio

Status: **DRAFT — design specification only. No UI code has been written.**
Depends on: Phase 1 (committed at `9114b03`, untouched by this document).
Grounding: color/typography/UX recommendations below were checked against
the `ui-ux-pro-max` design-intelligence database (Japanese Elegant and
Classic Elegant font pairings, Luxury/Premium Brand and Architecture/
Interior color palettes, Portfolio Grid landing pattern, and the
Touch/Forms/Performance UX-guideline set) rather than invented from scratch;
deviations from a raw database match are called out explicitly where they
happen, with the reason.

This document is a **specification**, not a design token file — when
Phase 2B implements it, the values below become the actual
`web/config/theme.ts` (or Tailwind theme) content, per the data/presentation
split in §18.

---

## 1. Design Concept

**Name for internal reference:** *Kinari to Sumi* (生成りと墨 — "unbleached
silk and ink") — the palette and mood are built from washi-paper neutrals,
ink-black text, and a single muted, traditional accent color, not from
"salon pink."

- **Overall visual direction:** Quiet luxury, not loud luxury. The site
  should read like a real Ginza or Kyoto nail/eyelash atelier's website —
  restrained, confident, unhurried — not like a Canva template or a SaaS
  marketing page wearing a kimono. Closest matched database styles:
  *Minimal & Direct* (generous whitespace, single strong CTA, no decorative
  clutter) blended with *Editorial Grid* typographic confidence, deliberately
  **without** that style's high-contrast pure-black/white starkness —
  softened into warm neutrals so it feels inviting rather than austere.
- **Mood:** Calm, tactile, unhurried, precise. The kind of site a customer
  reads slowly, not one they skim for a discount code.
- **Typography personality:** One quiet serif (Mincho-style for Japanese,
  an old-style Latin serif for English/numerals) for headings — confident
  but never shouting — paired with a clean, highly legible sans-serif for
  body text, forms, and UI chrome. See §3.
- **Spacing philosophy:** Generous, air-first. This is a marketing/portfolio
  site, not a dashboard — density dial is deliberately **low** (spacious),
  not the 8–32px dashboard-density range. Whitespace itself communicates
  "premium." See §4.
- **Border/radius philosophy:** Small, consistent radii only (buttons,
  cards, form fields) — never fully rounded "pill-everything" or
  zero-radius brutalist. A radius scale of `4px / 8px / 12px` covers every
  case; nothing in this design uses `9999px`/fully-pill buttons or 0px
  sharp-edged cards. Photography is the one place allowed a fully
  rectangular, un-rounded frame (see Image usage below) to read as
  intentional editorial photography rather than a "card UI" element.
- **Image usage:** Photography carries the emotional weight the copy
  doesn't have to. Real (or realistic-quality placeholder) photography only
  — no generic stock-icon illustrations, no 3D-render "beauty" clipart, no
  gradient blob backgrounds. Images are full-bleed or large within their
  section, never small decorative thumbnails competing with text. Every
  image needs a specific *purpose* (hero mood, actual nail-art result,
  actual space, actual staff) — decorative-only imagery is not used.
- **CTA philosophy:** One primary action — "ご予約はこちら" (Reserve here) —
  repeated at deliberate points in the scroll, never stacked with a
  competing secondary CTA of equal visual weight. See §12 for exactly how
  this avoids becoming repetitive/aggressive.

---

## 2. Color System

Grounded in the database's *Luxury/Premium Brand* and *Architecture/
Interior* palettes (warm near-black + muted gold-toned accent on a warm
off-white), adapted: the accent is shifted from gold to a muted traditional
Japanese red-brown (*enji-iro*, 臙脂色) — warmer, more textile/kimono-coded
than gold, and reads less "corporate law firm," which fits a nail/eyelash
salon better while staying restrained (single accent, low saturation, per
the brief's "not overly colorful").

| Token | Hex | Name | Usage |
|---|---|---|---|
| `--color-background` | `#FAF7F2` | Kinari (生成り) | Page background — warm washi-paper off-white, never pure `#FFFFFF` |
| `--color-surface` | `#FFFFFF` | — | Cards, elevated panels, form fields — one step lighter than background for quiet separation, no shadow needed at rest |
| `--color-surface-sunken` | `#F1ECE3` | — | Alternating section backgrounds (e.g. every other section), subtle recessed areas |
| `--color-primary` | `#2B2622` | Sumi (墨) | Headings, body text, primary button background |
| `--color-on-primary` | `#FAF7F2` | — | Text/icons on `--color-primary` backgrounds |
| `--color-secondary` | `#6B5F55` | — | Secondary text emphasis, secondary button borders, dividers with intent (not decorative hairlines) |
| `--color-accent` | `#9C4B3F` | Enji (臙脂) | CTA buttons, links, active states, small decorative accents (e.g. a single hairline under a section eyebrow) — used sparingly, never as a background fill larger than a button |
| `--color-on-accent` | `#FFFFFF` | — | Text/icons on `--color-accent` backgrounds |
| `--color-text` | `#2B2622` | — | Same as primary — body copy default |
| `--color-muted` | `#7A6F63` | — | Secondary/supporting text (captions, meta info, placeholder text) — verified ≥4.5:1 on background |
| `--color-border` | `#E3DCD1` | — | Hairline dividers, input borders, card outlines |
| `--color-success` | `#4B7A62` | — | Muted moss green — form success states, confirmation messaging |
| `--color-error` | `#B3261E` | — | Deliberately more saturated/orange-leaning than the accent so it reads unambiguously as "error" regardless of brand color — form errors, validation messages |

**Contrast check performed (WCAG relative-luminance formula), not assumed:**
`--color-primary` on `--color-background` ≈ **14:1**; `--color-muted` on
`--color-background` ≈ **4.6:1** (passes AA for normal text); `--color-accent`
as text on `--color-background` ≈ **5.6:1**; `--color-on-accent` (white) on
`--color-accent` button fill ≈ **6.0:1**; `--color-success`/`--color-error`
on `--color-background` ≈ **4.6:1 / 6.1:1**. All pass WCAG AA (4.5:1) for
normal text. Re-verify with a contrast tool at implementation time if any
of these values are adjusted even slightly — do not assume a hex tweak is
still safe.

**Explicitly avoided:** gradients as a design element, a second/competing
accent hue, dark mode (out of scope for v1 — this is a portfolio/marketing
site, not an app; §Q of Phase 0 doesn't require it and inventing a Japanese-
salon dark theme is unjustified scope for Phase 2A), neon/saturated colors,
using the accent color as a large background fill.

---

## 3. Typography

Grounded in the database's *Japanese Elegant* pairing (Noto Serif JP / Noto
Sans JP — direct match for "Japanese sites... elegant, traditional, modern")
for the Japanese-script strategy, and the *Classic Elegant* pairing
(Playfair Display / Inter) for the Latin-script mood — **adapted**, not
copied verbatim: Playfair Display's very high-contrast Didone strokes read
as "Western fashion editorial," which clashes with a Mincho heading rather
than harmonizing with it. Latin headings instead use an old-style serif
with moderate stroke contrast (calligraphic origin, closer to Mincho's
brush-derived shapes), so the two scripts feel like one typographic family
when they appear together (brand name in Latin next to a Japanese headline,
form labels, etc).

| Role | Japanese font | Latin font | Notes |
|---|---|---|---|
| Heading | **Shippori Mincho** (or **Noto Serif JP** as the safer fallback with broader family completeness) | **Cormorant Garamond** | Both are calligraphic-origin serifs with moderate contrast — pair visually, unlike Mincho + a Didone |
| Body / UI | **Noto Sans JP** | **Inter** | Highly legible at small sizes, needed for menu prices, form fields, footer text |

```
Google Fonts URL (implementation reference for Phase 2B):
https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap
```

Font loading strategy is specified in §20 (Performance) — this section only
defines the pairing and scale.

### Type scale (desktop → mobile)

Base body size is **16px minimum** on both breakpoints (accessibility
floor — never smaller for real body copy). Line-height 1.5–1.7 per role.

| Role | Desktop size / line-height | Mobile size / line-height | Weight | Tracking |
|---|---|---|---|---|
| H1 (hero headline) | 56px / 64px (1.14) | 34px / 42px (1.24) | 500 (Medium) | −0.01em |
| H2 (section title) | 40px / 48px (1.2) | 28px / 36px (1.28) | 500 | −0.005em |
| H3 (subsection / card title) | 26px / 34px (1.3) | 20px / 28px (1.4) | 500 | 0 |
| Body | 17px / 30px (1.76) | 16px / 27px (1.7) | 400 | 0 |
| Caption / meta | 14px / 20px (1.43) | 13px / 19px (1.46) | 400 | 0.01em |
| Button label | 16px / 20px | 15px / 20px | 500 | 0.02em |
| Navigation link | 15px / 20px | 16px / 24px (larger — it's a touch target on mobile) | 400 | 0.01em |

Japanese body text (Noto Sans JP) at a given pixel size optically reads
slightly larger than Latin text at the same size due to full-width glyphs —
implementation should verify this visually rather than trusting the number
alone, especially for `H1`/`H2` where Japanese line length differs a lot
from the Latin equivalent.

---

## 4. Spacing System

4px base unit, generous/"low density" scale (spacious marketing site, not a
dashboard — deliberately not the 8–32px dashboard-density range):

| Token | Value | Typical use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap, tightest spacing |
| `space-2` | 8px | Minimum gap between adjacent touch targets |
| `space-3` | 12px | Form field internal padding (vertical) |
| `space-4` | 16px | Base gap — paragraph spacing, card internal padding (mobile) |
| `space-6` | 24px | Card internal padding (desktop), gap between related elements |
| `space-8` | 32px | Gap between a heading and its content block |
| `space-12` | 48px | Gap between sub-sections within one page section |
| `space-16` | 64px | Section vertical padding (mobile) |
| `space-24` | 96px | Section vertical padding (desktop) |
| `space-32` | 128px | Section vertical padding (large desktop / hero) |

Every margin/padding in the implementation must resolve to one of these
tokens — no ad-hoc `13px`/`21px` values (matches the global spacing rule
already in force for this ecosystem's design conventions).

---

## 5. Responsive Breakpoints

| Name | Range | Reference width | Notes |
|---|---|---|---|
| Mobile | `< 640px` | 375px | Default/base styles — mobile-first, not a media-query override |
| Tablet | `640px – 1023px` | 768px | Two-column layouts start here (menu grid, gallery grid) |
| Desktop | `1024px – 1439px` | 1280px | Full navigation, multi-column sections |
| Large desktop | `≥ 1440px` | 1440px+ | Max content width caps out (see below) so lines of text don't stretch unreadably wide |

**Content max-width:** `1120px` for text-bearing sections (readability),
full-bleed (`100vw`) permitted only for hero imagery and the gallery
section. No section should let body text stretch edge-to-edge on a large
desktop monitor.

---

## 6. Page Structure

Order and purpose, in the exact sequence the brief specifies:

| # | Section | Purpose | Mandatory? |
|---|---|---|---|
| 1 | Header | Navigation + reservation CTA, always accessible | **Mandatory** |
| 2 | Hero | First impression — mood, headline, primary CTA | **Mandatory** |
| 3 | Concept | The salon's philosophy/story — why this salon, not just what it sells | **Mandatory** (content is CONFIG-editable, but every vertical needs *some* "why us" section) |
| 4 | Menu | Services + prices — the actual purchase decision | **Mandatory** |
| 5 | Staff | Builds trust/familiarity before booking | **Configurable** — hidden entirely when `features.staffSelection = false` (Phase 0 §K); a shared-calendar salon skips this section, not just the staff-picker step |
| 6 | Gallery | Visual proof of work quality | **Mandatory** — for a nail/eyelash salon this is arguably as important as the Menu |
| 7 | Reservation CTA (mid-page) | Re-offers the action once trust has been built | **Configurable** — only appears if `features.reservation = true`; see §12 |
| 8 | Salon Features | Practical reassurance (hygiene, private rooms, parking, etc.) | **Configurable** — vertical-specific content, but the section slot itself is reusable |
| 9 | Customer Flow | "What happens when I book" — reduces first-visit anxiety | **Configurable** — high value for salons/clinics, less relevant for e.g. a restaurant vertical |
| 10 | FAQ | Removes remaining objections before the final CTA | **Configurable** but recommended always-on |
| 11 | Access | Address, map, transit, hours — practical "can I get there" info | **Mandatory** if the business has a physical location (true for this vertical) |
| 12 | Contact | Non-reservation inquiries (per Phase 0 §L/§M `createInquiry`) | **Mandatory** — gated by `features.contactForm`, matching Phase 0 |
| 13 | Footer | Legal, secondary links, final trust signals | **Mandatory** |

**Mandatory vs. configurable is a content/visibility decision, not a
component decision** — every section is still built as one reusable
component (§17); "configurable" sections are the ones a CONFIG flag (or the
absence of data, e.g. no staff rows) can hide entirely for a different
vertical, per §18.

---

## 7. Header

- **Desktop navigation:** Logo/wordmark (left) — Concept / Menu / Staff /
  Gallery / Access / Contact (center or right, text links, no dropdowns —
  the site has no deep hierarchy that needs one) — primary reservation CTA
  button (far right, always visually distinct as the one filled/accent
  button in the header).
- **Mobile navigation:** Logo (left) + a single hamburger icon (right,
  44×44px minimum tap target). Reservation CTA is **not** hidden inside the
  hamburger menu — it either sits directly in the header (compact button)
  or is handled by the persistent mobile CTA bar described in §22, so
  booking is never more than one tap away behind a menu.
- **Reservation CTA:** Always the single filled/accent-colored control in
  the header — no other header element competes with it for visual weight.
- **Sticky behavior:** Header is sticky (`position: sticky; top: 0`) on all
  breakpoints. Per the grounded UX guideline on sticky nav, the first
  section below it gets padding-top equal to the header's rendered height
  so content is never obscured on load.
- **Scroll behavior:** On scroll down past the hero, the header compresses
  slightly (reduced vertical padding, e.g. 80px → 56px) and gains a subtle
  `--color-border` bottom hairline + a very light surface-tint background
  (it starts fully transparent over the hero image, per §8). No hide-on-
  scroll-down/show-on-scroll-up trick — that pattern is disorienting on a
  content-light marketing site and isn't worth the complexity here.

---

## 8. Hero

- **Layout:** Full-bleed photograph (or a curated multi-image composition —
  see below) as the background/majority of the viewport, with headline,
  subheadline, and CTAs positioned in the lower third or left-aligned third
  of the frame — never dead-centered over a busy part of the photo. Height:
  roughly 90vh on desktop, capped so the fold doesn't feel like an empty
  wall of image with no scroll affordance; ~100vh minus header height on
  mobile so the first fold is entirely hero.
- **Image composition:** One high-quality, editorially-lit photograph of
  either the actual salon space or a real nail/eyelash result — not a
  stock photo of a generic smiling model with jazz hands. A subtle, dark-
  to-transparent gradient scrim (`~15–35%` opacity) sits between the image
  and the text purely for text legibility — this is a legibility aid, not
  a decorative gradient (does not conflict with the "no gradients as a
  design element" rule in §2, which targets decorative gradients).
- **Headline (H1):** Short, emotive, in Japanese by default (e.g. a phrase
  about the feeling of the experience, not a feature list) — comes from
  CONFIG/content, not hard-coded (§18).
- **Subheadline:** One sentence, sets concrete expectation (what kind of
  salon this is, in plain terms) — Body-large size, `--color-on-primary`
  or a near-white tone for legibility over the image.
- **Primary CTA:** "ご予約はこちら" (Reserve here) — filled accent button,
  the single highest-contrast interactive element on the page.
- **Secondary CTA:** A quieter, outlined/text-style link — "メニューを見る"
  (View menu) or "コンセプトを見る" (See our concept) — visually subordinate
  to the primary CTA (no fill, thinner weight), scrolls to the relevant
  section rather than navigating away.
- **Mobile behavior:** Same photo (art-directed to a taller crop if needed
  so the subject isn't cropped out), headline/subhead stack full-width
  with generous side padding, both CTAs stack vertically at full width
  with `space-4` gap between them — never side-by-side on mobile, where
  they'd otherwise shrink below comfortable tap width.

---

## 9. Menu (Services)

- Services render as a **list**, not a card grid — a nail/eyelash menu is
  read top-to-bottom like a real salon menu board, and a grid of "product
  cards" reads as e-commerce, not salon.
- Each row: service name (H3-ish weight), a one-line description (Caption/
  Body-small, optional, only if `SERVICES.Name` needs it), duration
  (e.g. "60分"), and price — price is right-aligned on desktop, wraps to
  its own line under the name on mobile.
- Services group under a light category label when the salon has more than
  ~6 services (e.g. "ジェルネイル" / "まつげエクステ" as group headers) — this
  grouping is data-driven (derived from the SERVICES sheet, not hard-coded
  categories), and the grouping UI is simply not rendered when there's only
  one implicit category.
- A hairline `--color-border` divider separates rows — no card shadows,
  no boxed-in rows; this keeps it reading as a printed menu rather than a
  UI list.
- Each row (or the section as a whole) links/scrolls toward the reservation
  flow, but individual rows are **not** independently clickable buttons —
  avoids a "grid of 20 CTAs" feeling that undercuts §12.

---

## 10. Staff

Only rendered when `features.staffSelection = true` (Phase 0 §K) — this
section does not exist in the DOM at all for a shared-calendar salon, not
just visually hidden.

- **Staff card:** Portrait photo (consistent aspect ratio across all staff,
  e.g. 4:5, so the grid stays visually even even with mismatched source
  photos), name, and one short line (specialty or a one-sentence intro) —
  no fabricated "5-star rating" widgets or fake social-proof numbers on
  the card.
- Grid: 2 columns on mobile, 3–4 on tablet/desktop, consistent `space-6`
  gutter.
- **"Any available staff" (お任せ) representation:** Rendered as its own
  tile in the same grid — same card size and photo-frame proportions as a
  real staff card, but instead of a portrait it shows a simple, calm
  monogram/icon treatment (e.g. the salon's initial mark on a
  `--color-surface-sunken` fill) plus the label "指名なし（お任せ）" and a
  one-line reassurance ("空いているスタッフが対応いたします" — "an available
  staff member will assist you"). It is visually part of the *same*
  choice set as the named staff, not a separate "or skip this step" link —
  reinforces Phase 0's framing that "ANY" is a first-class option, not an
  escape hatch.

---

## 11. Gallery

Grounded in the database's *Portfolio Grid* pattern ("visuals first...
fast loading essential").

- **Desktop/tablet:** A masonry-style grid (variable image heights,
  CSS `columns` or a grid with row-span variation) — a strict uniform
  grid of identically-cropped squares reads as generic; masonry lets actual
  nail-art photography keep its natural aspect ratio.
- **Mobile behavior:** Collapses to a **single column**, full-width images
  stacked vertically — not a horizontal-scroll carousel (per the grounded
  UX guideline: avoid horizontal swipe on primary content, since it
  conflicts with the system's vertical scroll gesture and is easy to miss
  entirely on a marketing page).
- Every image lazy-loads below the fold (`loading="lazy"`), and every
  `<img>` reserves its aspect ratio up front (via `width`/`height` attrs or
  `aspect-ratio` CSS) so images loading in doesn't shift layout (Core Web
  Vitals — CLS, see §20).
- Optional lightbox-on-tap for a full-size view is acceptable but not
  required for Phase 2A — if added later, it must be keyboard-dismissible
  (`Esc`) and trap focus while open (§19).
- No fabricated "before/after" slider gimmick unless the salon actually
  supplies genuine before/after pairs — an empty/fake slider would violate
  the "realistic, high-quality" brief goal.

---

## 12. Reservation CTA (repetition without aggression)

The brief explicitly asks for CTAs that don't become "repetitive or
aggressive." The rule used throughout: **one CTA style, appearing at
narratively justified points, never as a popup/overlay/sticky-nag.**

Placements, each with a distinct *reason* to ask again rather than just
repeating the same button:

1. **Header** — always available, low-emphasis compact button (utility,
   not a pitch).
2. **Hero** — the first, highest-emphasis ask, right after the emotional
   opening.
3. **End of Menu** — right after the customer has seen prices, the natural
   moment they've decided what they want.
4. **End of Gallery** — right after the customer has seen proof of
   quality, the natural moment trust peaks.
5. **Final CTA (after FAQ, before Footer)** — a dedicated closing section
   with a short reassurance line, for the customer who scrolled all the
   way through and is now ready.

That's it — **no floating/sticky "Book Now" bar clinging to the bottom of
the screen** on desktop, and on mobile the persistent CTA is the *header's*
compact button, not an additional overlay (see §22) — one persistent
surface, not two competing ones. No exit-intent popups, no countdown-timer
urgency tricks — those read as generic conversion-funnel tactics, exactly
what this brief says to avoid.

---

## 13. FAQ

- **Interaction:** Accordion — one question visible per row collapsed,
  expands in place on click/tap. Only reveal answer content on demand
  (progressive disclosure) rather than showing all answers at once, which
  would make the page feel long and dense before the customer even asks
  the question.
- Multiple items may be open simultaneously (no forced single-open
  behavior) — nothing about salon FAQ content requires mutual exclusivity,
  and forcing it just adds surprise ("why did my open answer just close").
- Expand/collapse uses a height transition (150–250ms) with a rotating
  `+`/chevron icon, respecting `prefers-reduced-motion` (§21).
- **Mobile behavior:** Full-width rows, minimum 44px tap height on the
  question row itself (not just the icon), generous internal padding so
  adjacent questions don't feel cramped once several are expanded.
- Content (the actual Q&A pairs) is business content, not hard-coded copy
  — see §18.

---

## 14. Access

- **Address:** Full postal address as plain, selectable text (not baked
  into an image) — screen readers and copy-paste both need to work.
- **Map:** A **placeholder** in Phase 2A/2B — a static, styled map-shaped
  block (using the palette, e.g. a `--color-surface-sunken` panel with a
  simple pin icon and the label "地図"/"Map") rather than embedding a real
  Google Maps iframe. Embedding real maps is deferred: it pulls a third-
  party script, has its own loading-performance cost, and is explicitly a
  "later phase" concern once a real address exists (this stays consistent
  with the master doc's approach of not building integrations before
  they're needed).
- **Transportation:** A short list (2–4 lines) of transit directions
  ("○○駅から徒歩5分" style entries) — plain text list, not icons-only (transit
  icons without labels fail the accessibility bar in §19).
- **Business hours:** Rendered as a simple two-column table/list (day →
  hours), sourced from `CONFIG.hours.*` (Phase 0 §D) — never hard-coded,
  since this is exactly the kind of value an owner must be able to edit
  without a developer (Phase 0 §S). Closed days show "定休日" rather than
  being omitted, so the information is complete at a glance.

---

## 15. Contact

- Form fields, in order: Name, Email, Phone (optional), Subject (optional
  — only if the business wants it), Message (multi-line), then submit.
  Matches the `ContactRequest` shape in Phase 0 §F — the UI does not invent
  fields the backend contract doesn't have.
- Every field has a **visible label above the input**, not a placeholder-
  as-label (grounded accessibility/forms rule — placeholder text disappears
  on focus and fails as the only label).
- Inline validation on blur (grounded forms guideline: validate on blur,
  not submit-only) — an error message appears directly under the
  offending field, in `--color-error`, with an icon + text (never color
  alone, per §19).
- Submit button shows a loading state (spinner or disabled+label change,
  e.g. "送信中...") immediately on tap — per the grounded rule against
  "instant state changes (0ms)" leaving the user unsure whether their tap
  registered.
- Success state: the form is replaced by a calm confirmation message in
  place (not a jarring alert/modal) — consistent with the overall "quiet
  luxury" mood.
- The honeypot field and minimum-fill-time timestamp from Phase 0 §P are
  present in the DOM/state but **entirely invisible and non-focusable** to
  a real user — this is a UX spec note, not new scope: it confirms the
  anti-spam mechanism already decided in Phase 0 has no visible UI
  footprint.

---

## 16. Footer

- Three loose columns on desktop (stacking to one column on mobile):
  (1) salon name/logo + one-line tagline, (2) quick links (repeats primary
  nav — Concept/Menu/Access/Contact), (3) hours + phone/address summary.
- Bottom bar: copyright line + minimal legal links (privacy policy, terms —
  placeholders in Phase 2A/2B, real policy content is a later/business-
  owner concern, not a design-phase deliverable).
- Uses `--color-primary` (Sumi) as its background with `--color-on-primary`
  text — the one section allowed to invert the palette, giving the page a
  quiet "close" the way a printed brochure's back cover would, distinct
  from every light-background section above it.
- No social-icon wall of a dozen platforms — only the channels the
  business actually has, sourced from CONFIG-level business data, not a
  hard-coded default set of Instagram/Twitter/Facebook/TikTok/LINE icons.

---

## 17. Component Architecture (proposed, for Phase 2B)

Naming and folder targets match the structure already scaffolded in Phase 1
(`apps/salon-portfolio/web/components/{layout,sections,forms,reservation,ui}`).
This is a proposal for Phase 2B to implement — **no code is written now.**

```text
components/
  layout/
    SiteHeader.tsx           # sticky header, desktop+mobile nav, CTA
    MobileNav.tsx             # hamburger panel
    SiteFooter.tsx
  sections/
    HeroSection.tsx
    ConceptSection.tsx
    MenuSection.tsx           # renders MenuCategory + MenuRow
    MenuCategory.tsx
    MenuRow.tsx
    StaffSection.tsx          # renders StaffCard(s), hidden if disabled
    StaffCard.tsx
    AnyAvailableStaffCard.tsx # the "お任せ" tile from §10
    GallerySection.tsx        # masonry grid, mobile single-column
    GalleryImage.tsx
    ReservationCtaBand.tsx    # the reusable mid-page CTA block from §12
    SalonFeaturesSection.tsx
    CustomerFlowSection.tsx   # numbered-steps layout
    FaqSection.tsx
    FaqAccordionItem.tsx
    AccessSection.tsx
    ContactSection.tsx
  forms/
    ContactForm.tsx
    FormField.tsx              # label + input + inline error, shared shape
    HoneypotField.tsx          # the invisible anti-spam field from §15/Phase 0 §P
  reservation/
    (Phase 2A defines no reservation-flow components yet — the wizard
    itself is Phase 0 §I/§K business logic, out of scope until the
    reservation feature phase; this folder stays as scaffolded in Phase 1)
  ui/
    Button.tsx                 # primary/secondary/text variants, one component
    SectionHeading.tsx         # eyebrow + H2, reused by every section
    Container.tsx              # max-width wrapper (§5)
    Divider.tsx
    PagePlaceholder.tsx         # already exists from Phase 1 — retired once real sections land
```

Every `sections/*` component takes its content as **props/data**, never
imports business config directly — this is what makes the same component
tree reusable for a different vertical (§23).

---

## 18. Data vs. Presentation

Explicit classification, extending Phase 0 §V:

**Comes from business configuration/data (CONFIG / SERVICES / STAFF /
HOLIDAYS sheets, via `getConfig`/`getServices`/`getStaff`):**
business name, hero headline/subheadline copy, concept/story text, all
service names/descriptions/durations/prices, all staff names/photos/intro
lines, whether staff selection is offered at all, business hours, holidays,
address, transit directions text, phone/email, FAQ question/answer pairs,
salon-features list content, customer-flow step text, footer tagline and
social links, which optional sections are enabled at all.

**Presentation-only (lives in `web/config/theme.ts` or equivalent, per
Phase 0 §V):** the color tokens in §2, the type scale in §3, the spacing
scale in §4, breakpoints in §5, component layout/behavior (masonry vs.
grid, accordion vs. tabs, sticky header behavior) — i.e. everything *in
this document*.

**Salon-specific (Project 1 only, not part of the reusable core):** the
specific choice of Mincho/Garamond typography and the *enji* accent color
(a restaurant or consultant vertical gets its own palette/type pairing, not
this one); the Menu-as-list-not-grid decision (a restaurant vertical might
legitimately want a dish-photo grid instead); the "Any available staff"
card treatment (only exists where `features.staffSelection` is relevant at
all); all Japanese-specific copy and the bilingual Japanese/Latin
typographic pairing itself (a non-Japanese vertical needs its own font
strategy, not a hard requirement to keep Noto/Mincho).

**Reusable components (generic shape, works for any vertical):** `Button`,
`SectionHeading`, `Container`, `Divider`, `FaqSection`/`FaqAccordionItem`,
`ContactForm`/`FormField`, `SiteHeader`/`SiteFooter` shape (nav items and
CTA label are data), `GallerySection` (masonry-of-images is generic),
`ReservationCtaBand` (a reusable "restated CTA band" component regardless
of what's being reserved/ordered).

---

## 19. Accessibility

- **Keyboard navigation:** Every interactive element (nav links, CTA
  buttons, accordion headers, form fields, gallery lightbox if added) is
  reachable and operable via `Tab`/`Shift+Tab`/`Enter`/`Space` alone — no
  mouse-only or hover-only affordance (grounded rule: reliance on hover
  only is an anti-pattern).
- **Focus states:** A visible focus ring on every focusable element,
  using `--color-accent` at sufficient contrast against both light
  surfaces and the dark hero image — **never** `outline: none` without a
  custom replacement (grounded anti-pattern: "removing focus rings").
- **Contrast:** Every text/background pairing in §2 is pre-checked to
  ≥4.5:1 (normal text) or ≥3:1 (large text/graphical elements) — see the
  contrast note in §2. Re-check any color adjusted post-spec.
- **Semantic HTML:** One `<h1>` per page (the hero headline); section
  titles are `<h2>`; a real `<nav>` for the header links; `<button>` for
  actions, `<a>` for navigation (never a `<div onClick>` standing in for
  either); the FAQ accordion uses `<button aria-expanded>` controlling a
  region with `aria-controls`/`role="region"`, not a bare `<div>` toggle.
- **Form accessibility:** every input has a real `<label for>` (§15 already
  requires visible labels, which doubles as this), error messages are
  associated via `aria-describedby` and errors are announced (e.g.
  `aria-live="polite"` on the error container) — not color-only, always
  paired with an icon + text per §15.
- **Image alt text:** every meaningful image (hero, gallery, staff
  portraits) gets specific, descriptive `alt` text (e.g. "ジェルネイルのデザ
  イン例、ピンクのグラデーション" not "image1" or a blank `alt=""` used
  incorrectly) — `alt=""` is reserved only for genuinely decorative images
  that convey no content (e.g. a background texture with no informational
  role).

---

## 20. Performance

- **Image optimization:** Serve modern formats (WebP/AVIF via Next.js
  `<Image>` or equivalent) with responsive `srcset` sizes matched to the
  breakpoints in §5 — never ship one oversized image to every device.
- **Lazy loading:** Every image below the fold uses `loading="lazy"`
  (grounded rule) — only the hero's above-the-fold image loads eagerly
  (and should use Next.js's `priority` hint when implemented).
- **Font loading:** `font-display: swap` for all four font families in §3
  so text isn't invisible while fonts load (no FOIT); subset the Japanese
  fonts to only the characters actually used where feasible, since
  unsubsetted Noto Sans JP/Serif JP/Shippori Mincho are large — this is a
  real, named cost worth planning for at implementation, not a detail to
  discover later.
- **Animation constraints:** see §21 — kept subtle specifically because
  janky animation is both a UX and a performance/Core-Web-Vitals problem
  (main-thread cost).
- **Core Web Vitals considerations:** reserve image aspect ratio up front
  (CLS), avoid layout-shifting web-font swaps for headline text sizes
  (consider a close-enough fallback stack), keep the hero's largest
  contentful element (the photo) prioritized and appropriately sized
  (LCP), and keep interaction handlers (accordion, mobile nav, form) light
  — no heavy JS blocking the main thread on load (INP).

---

## 21. Animation

Subtle only — motion should feel like the site breathing, never like it's
performing.

- **Page-load animation:** A single, brief fade/slight-rise-in
  (`opacity 0→1`, `translateY 8px→0`, ~400ms) on the hero content only.
  Nothing else animates on initial load.
- **Scroll reveal:** Section headings and content blocks fade/rise in once
  as they enter the viewport (one-time, not re-triggering on scroll back
  up), 200–300ms, staggered slightly for grouped items (e.g. gallery tiles,
  FAQ rows) — matches the grounded "duration 150–300ms, motion conveys
  meaning" guideline; this reveal specifically communicates "new content
  has arrived," not decoration for its own sake.
- **Hover (desktop only):** Subtle — a slight brightness/opacity shift on
  images, an underline-grow on text links, a slight elevation/tone shift on
  buttons. No scale-bounce, no color-inversion tricks.
- **CTA interaction:** A quick (~150ms) press/active-state feedback
  (slight scale-down or tone-darken) on tap/click so the interaction feels
  acknowledged instantly — directly satisfies the grounded rule against
  "instant state changes (0ms)."
- **Mobile restrictions:** Hover-only effects are simply absent (no
  hover-state fallback triggered by tap). Scroll-reveal stagger delays are
  shortened or removed on mobile so content doesn't feel like it's making
  the user wait to read it while scrolling quickly. All motion respects
  `prefers-reduced-motion: reduce` — reveal/hover/press animations either
  shorten to near-zero or are skipped entirely (content still appears,
  just without the transition) for users who've asked for it.

---

## 22. Mobile-First UX

This is the primary target, not an adapted afterthought — every section
above was specified mobile-first and then scaled up, not the reverse.

- **Mobile header:** Compact height (~56–64px), logo + hamburger + a
  small reservation CTA button all fit in one row without crowding —
  if all three genuinely can't fit with comfortable spacing on the
  narrowest supported width (375px), the CTA label shortens (e.g. "予約"
  instead of the full phrase) rather than being dropped.
- **CTA placement:** Per §12 — the header's CTA is the one persistent
  mobile ask; section-level CTAs (§12 list) appear inline in the normal
  scroll flow, full-width buttons, not floating/fixed overlays that
  permanently steal screen real estate from content.
- **Button sizes:** Minimum 44×44px tap target on every interactive
  element (grounded rule), with at least 8px spacing between adjacent
  targets (e.g. the two hero CTAs stacked, §8) — never two small buttons
  side-by-side sized for a mouse cursor.
- **Section spacing:** Uses the mobile end of the spacing scale (§4) —
  `space-16` (64px) vertical section padding on mobile vs. `space-24`+ on
  desktop — enough to separate sections clearly without the page feeling
  like an endless, undifferentiated scroll.
- **Image behavior:** Hero and gallery images are art-directed for
  portrait/taller mobile crops where the desktop crop would cut off the
  subject (§8) — this is a real content requirement to flag for whoever
  sources/crops photography in Phase 2B, not just a CSS `object-fit`
  afterthought.
- **Form usability:** Inputs are full-width, generously tall (defined by
  the 44px target plus `space-3` internal padding — comfortably exceeds
  the minimum), correct `inputmode`/`type` per field (e.g. `type="tel"` for
  phone, `type="email"` for email) so mobile keyboards show the right
  layout, and the submit button is full-width and never below the visible
  viewport without scrolling being obvious (no submit button accidentally
  hidden under a mobile keyboard with no indication more form exists).

---

## 23. Coconala Reusability

The point of this whole visual system, per the brief's second purpose: **the
architecture, not this specific palette, is the product being demonstrated**
to future Coconala customers.

- **Another salon:** Swap CONFIG content (name, copy, hours, services,
  staff, photography) and the presentation-only theme tokens (§2/§3 colors
  and fonts) for a different palette/typeface pairing matching that salon's
  brand — every component in §17 stays the same; only theme.ts and content
  change. If the new salon doesn't offer staff selection, `StaffSection`
  simply doesn't render (§6/§10), with zero component changes needed.
- **Restaurant:** `MenuSection`/`MenuRow` are already a generic
  "item + description + price" primitive — a restaurant reuses them
  directly for dishes/courses instead of nail services. `StaffSection`
  likely disappears entirely (no staff-selection concept for most
  restaurant bookings — capacity/table-based instead, per Phase 0 §D's own
  note that a restaurant vertical would use a capacity-based availability
  strategy). `GallerySection` reuses as-is for food photography.
  `CustomerFlowSection` reuses as-is ("how a reservation works" applies
  equally). Only `AnyAvailableStaffCard` and the salon-specific "Concept"
  copy tone are not reused as-is.
- **Consultant / online lesson:** `MenuSection` becomes a service/package
  list (e.g. "60分オンライン相談"); `GallerySection` likely becomes a
  portfolio/case-study grid instead of photography-of-a-space (same masonry
  component, different image content); `AccessSection` either disappears
  (fully online business) or repurposes as "how the online session works"
  content instead of a physical map; `StaffSection` reuses directly for
  "consultants available," including the "any available" pattern if the
  business offers pooled consultants rather than picking one by name.
- **What stays 100% fixed across all three:** `SiteHeader`/`SiteFooter`
  shape, `Button`/`SectionHeading`/`Container`/`Divider`, `ContactForm`,
  `FaqSection`, the reservation-CTA repetition philosophy (§12), the
  spacing/breakpoint system (§4/§5), and the entire accessibility/
  performance/animation discipline (§19–§21) — none of that is
  salon-specific, all of it is exactly the "50–60% reusable core" the
  master instruction (and Phase 0 §A) calls for.

---

## 24. Design Anti-Patterns (explicit "do not")

- No excessive gradients as a decorative device (the hero scrim in §8 is a
  legibility aid, not decoration — don't extend gradients elsewhere).
- No excessive rounded "pill" cards/buttons — radius scale is capped at
  12px (§1); nothing is fully rounded.
- No dashboard-like layout — no sidebar-plus-content-panel chrome, no
  data-table-like rows of stats; this is a narrative scroll, not an app
  shell.
- No tiny typography — 16px body-text floor, no fine-print-sized real
  content (§3/§19).
- No weak visual hierarchy — every section has exactly one dominant
  element (a headline or a hero image), never three same-weight elements
  competing for the first glance.
- No more than the one accent color (§2) — no rainbow of category-coded
  tags/badges.
- No excessive animation — nothing beyond §21's fade/rise/hover/press set;
  no parallax scroll-jacking, no auto-playing carousels, no attention-
  grabbing bounce/shake effects on CTAs.
- No generic-template appearance — no icon-in-a-circle feature-grid
  (the classic "3 icons + heading + 2 lines" SaaS block) used as filler;
  every section's layout is specific to what it's actually showing (a menu
  reads like a menu, a gallery reads like a gallery).
- No generic-AI-landing-page tells — no gradient-blob hero background, no
  "trusted by" logo strip (this isn't a SaaS product), no fabricated
  numeric stats ("10,000+ happy customers") without real data behind them.
- No desktop-first layouts that break on mobile — every section in this
  document was specified mobile-first; nothing here assumes desktop is the
  default and mobile is an afterthought squeeze.

---

## 25. Visual Quality Checklist

For use during Phase 2B (and any future) visual review:

**Overall feel**
- [ ] Does this look like a real salon's website, not a template?
- [ ] Would a Japanese salon owner recognize the mood as "their" industry
      without needing pink/beauty clichés?
- [ ] Is there exactly one accent color in active use anywhere on screen?
- [ ] Is there exactly one dominant focal element per section?

**Typography**
- [ ] Is body text ≥16px everywhere, on both breakpoints?
- [ ] Do headings use the Mincho/Garamond pairing, body uses Noto Sans
      JP/Inter — no third font sneaking in?
- [ ] Does Japanese/Latin mixed text (e.g. brand name + tagline) look like
      one coherent typographic voice, not two unrelated fonts collided?

**Color & contrast**
- [ ] Does every text/background pairing meet the contrast levels in §2 —
      spot-checked, not assumed?
- [ ] Is the background genuinely warm off-white (`#FAF7F2`-family), never
      drifting to pure white or cool grey?
- [ ] No color used to convey information alone (errors/success always
      paired with icon + text)?

**Spacing & layout**
- [ ] Every margin/padding value traces to the §4 scale — no ad-hoc
      pixel values?
- [ ] Section vertical rhythm feels generous on desktop, still comfortable
      (not cramped) on mobile?
- [ ] Max content width caps text sections on large desktop monitors?

**Components**
- [ ] Menu reads as a menu (list), not an e-commerce card grid?
- [ ] Staff grid's "Any available" tile sits as a first-class option in
      the same grid, not a separate afterthought link?
- [ ] Gallery is masonry on desktop, clean single column on mobile — no
      horizontal-scroll carousel?
- [ ] FAQ accordion allows multiple open items, ≥44px tap row on mobile?

**CTAs**
- [ ] Reservation CTA appears at the five points in §12, nowhere else,
      and never as a floating/sticky overlay competing with the header?
- [ ] Is there ever more than one *equally weighted* CTA visible at once?
      (There should not be.)

**Accessibility**
- [ ] Every interactive element reachable and operable by keyboard alone?
- [ ] Visible focus ring present everywhere (including over the dark hero
      image)?
- [ ] Every image has real, specific alt text (or deliberate `alt=""` for
      genuinely decorative-only images)?
- [ ] Form labels are visible, not placeholder-only; errors are announced,
      not color-only?

**Performance & motion**
- [ ] Below-fold images lazy-load; hero image is prioritized?
- [ ] No layout shift as images/fonts load in (reserved aspect ratios,
      `font-display: swap`)?
- [ ] All motion respects `prefers-reduced-motion`?
- [ ] Nothing animates beyond fade/rise/hover/press — no scroll-jacking,
      no auto-playing carousels?

**Mobile-first**
- [ ] Every tap target ≥44×44px with ≥8px spacing from its neighbors?
- [ ] Nothing on mobile is a shrunk-down desktop layout — each section was
      actually designed at 375px width, not just scaled?
- [ ] Forms use correct mobile `inputmode`/`type` and the submit button is
      never obscured by the on-screen keyboard?

---

## Final Summary (A–K)

### A. Final design concept
*Kinari to Sumi* — quiet Japanese luxury built from washi-paper neutrals,
ink-black text, and one muted traditional red-brown accent (*enji-iro*).
Calm, tactile, unhurried; single strong CTA per moment, never a cluttered
SaaS-style feature grid; photography carries the emotional weight. Full
detail: §1.

### B. Exact color palette
`--color-background #FAF7F2` · `--color-surface #FFFFFF` ·
`--color-surface-sunken #F1ECE3` · `--color-primary #2B2622` ·
`--color-on-primary #FAF7F2` · `--color-secondary #6B5F55` ·
`--color-accent #9C4B3F` · `--color-on-accent #FFFFFF` ·
`--color-muted #7A6F63` · `--color-border #E3DCD1` ·
`--color-success #4B7A62` · `--color-error #B3261E`. Full detail
incl. contrast ratios: §2.

### C. Typography scale
Headings: Shippori Mincho (JP) / Cormorant Garamond (Latin). Body: Noto
Sans JP (JP) / Inter (Latin). H1 56/64px desktop → 34/42px mobile; H2
40/48 → 28/36; H3 26/34 → 20/28; Body 17/30 → 16/27 (16px floor always);
Caption 14/20 → 13/19; Button 16/20 → 15/20; Nav 15/20 → 16/24. Full
detail: §3.

### D. Spacing scale
4px base: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. Full detail: §4.

### E. Responsive breakpoints
Mobile `<640px` (375px ref) · Tablet `640–1023px` (768px ref) · Desktop
`1024–1439px` (1280px ref) · Large desktop `≥1440px`. Content max-width
1120px for text. Full detail: §5.

### F. Page section hierarchy
Header → Hero → Concept → Menu → Staff (configurable) → Gallery →
Reservation CTA band (configurable) → Salon Features (configurable) →
Customer Flow (configurable) → FAQ (configurable, recommended on) →
Access → Contact → Footer. Full detail incl. mandatory/configurable
rationale per section: §6.

### G. Component hierarchy
`layout/{SiteHeader, MobileNav, SiteFooter}`,
`sections/{Hero, Concept, Menu(+Category/Row), Staff(+Card/AnyAvailableCard),
Gallery(+Image), ReservationCtaBand, SalonFeatures, CustomerFlow,
Faq(+AccordionItem), Access, Contact}`, `forms/{ContactForm, FormField,
HoneypotField}`, `ui/{Button, SectionHeading, Container, Divider,
PagePlaceholder}`. Full detail: §17.

### H. Data/presentation separation
Business content (copy, prices, staff, hours, FAQ, etc.) → CONFIG/
SERVICES/STAFF sheets via API, never hard-coded. Presentation (colors,
type scale, spacing, breakpoints, component behavior) → `web/config/
theme.ts`, salon-agnostic. Salon-specific → the Mincho/Garamond/enji
choice itself, Menu-as-list, "Any available" card treatment, Japanese
copy. Reusable → every component in §17's shape. Full detail: §18.

### I. Accessibility checklist
Full keyboard operability; visible focus rings everywhere (incl. over
hero image); pre-verified ≥4.5:1 text contrast; one `<h1>`, real `<nav>`/
`<button>`/`<a>` semantics, accordion with `aria-expanded`/`aria-controls`;
visible form labels + `aria-describedby`/`aria-live` errors, never color-
only; specific `alt` text on every meaningful image. Full detail: §19,
review items in §25.

### J. Performance checklist
WebP/AVIF responsive images; lazy-load below the fold, prioritize hero;
`font-display: swap` + Japanese font subsetting considered; reserved
aspect ratios (CLS); light interaction JS (INP); animation kept to the
§21 subtle set so it never becomes a main-thread cost. Full detail: §20,
review items in §25.

### K. Visual review checklist
See §25 in full — organized by Overall feel / Typography / Color &
contrast / Spacing & layout / Components / CTAs / Accessibility /
Performance & motion / Mobile-first, each with concrete pass/fail items
grounded in the sections above rather than subjective taste calls.

---

**This document produces no code, installs no dependencies, and touches no
file from the Phase 1 foundation. Awaiting approval before Phase 2B
(implementation) begins.**
