# UI/UX Reference Library

## Purpose

This library is a research layer sitting between "browsing the web for
inspiration" and "designing a new preset for a Studio LP." It exists so a
future Claude Code session (or a human) doesn't have to re-derive design
vocabulary from scratch every time a new visual direction is considered —
instead, it can read a small set of analyzed, structured references and
reason about *which patterns* are relevant, *why*, and *what the current
architecture would need* to express them.

It is Phase A of a longer intended pipeline (see below). It intentionally
stops short of proposing new presets, components, or `DesignConfig` values —
that is future work, done deliberately later, once a Design Direction is
chosen from the patterns catalogued here.

## What a Reference Is

A Reference is:

> an analytical record of useful design patterns observed in a real website.

It is **not**:

- a template
- a clone
- a component implementation
- a design preset
- a `DesignConfig`
- a screenshot collection
- source code

Each Reference document analyzes one real, currently-live website across a
fixed 22-section schema (layout, hero, typography, color, imagery,
navigation, CTA strategy, motion, responsive behavior, strengths,
weaknesses, and — critically — which *abstract patterns* can be extracted
from it, and how those patterns relate to *this repository's own*
`DesignConfig` vocabulary today). Every Reference ends with an explicit
Originality/Copyright Boundary section stating what is being learned versus
what must never be copied.

## Reference → Pattern Relationship

```text
Real Website
      ↓
Observation            (Sections 4–13 of each Reference: what is actually there)
      ↓
Pattern Analysis        (Sections 14–17: strengths, weaknesses, named patterns, principles)
      ↓
Abstract Design Principle   (Section 17: a principle stripped of any one brand's specifics)
      ↓
Future Design Direction     (NOT this phase — see "What Comes Next" below)
```

Nothing in this library skips straight from "Real Website" to "Clone" — every
document's Section 21 exists specifically to block that shortcut.

## Current Reference Index

| ID | Reference | Main Pattern | Visual Style | Reusability |
|----|-----------|--------------|--------------|-------------|
| 01 | [Secret Garden Stresa](references/01-secret-garden-stresa.md) | Alternating full-bleed photo / flat-panel rhythm | Cinematic, warm, editorial-quiet luxury hospitality | High for salon/spa; low for conversion-first LPs |
| 02 | [Amanda Braga](references/02-amanda-braga.md) | Color-chapter sectioning + outlined oversized type | Bold, saturated, experimental editorial portfolio | High for portfolio/agency; low for conversion-first LPs |
| 03 | [Stripe](references/03-stripe.md) | Claim-then-proof-card repetition + front-loaded proof | Structured, neutral, dense B2B/fintech conversion | High for product/professional-service LPs |
| 04 | [monday.com](references/04-monday-com.md) | Structural/decorative color split + self-segmentation | Bold, playful, illustrated SaaS conversion | High for product LPs; moderate for local service |
| 05 | [Aesop](references/05-aesop.md) | Desaturation as luxury signal + dual image roles | Minimal, muted, quiet-luxury product-led | High for salon/beauty; native e-commerce fit |
| 06 | [Boardroom Salon](references/06-boardroom-salon.md) | Multi-channel parallel conversion funnel | Bold, masculine, commercial local-service LP | High for salon/clinic/local service — same vertical |

## Pattern Coverage Matrix

Columns: **SG** = Secret Garden Stresa, **AB** = Amanda Braga, **ST** =
Stripe, **MC** = monday.com, **AE** = Aesop, **BR** = Boardroom Salon.
A ✓ means the pattern was directly observed in that Reference during this
research pass — this reflects actual findings, not a target coverage grid.

| Pattern | SG | AB | ST | MC | AE | BR |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Full-bleed photographic hero | ✓ | | | | | ✓ |
| Oversized / display-led hero typography | | ✓ | | | | ✓ |
| Color-block or color-chapter sectioning | ✓ | ✓ | | | | ✓ |
| Modular repeating card grid | | | ✓ | ✓ | ✓ | ✓ |
| Persistent vertical (non-horizontal) nav | | ✓ | | | | |
| Front-loaded social-proof wall | | | ✓ | ✓ (text-only) | | |
| Multiple simultaneous CTA channels | | | ✓ | ✓ | | ✓ |
| Single, low-frequency persistent CTA | ✓ | | | | ✓ | |
| Interactive self-segmentation control | | | | ✓ | | |
| Desaturated / muted minimal palette | ✓ (partial) | | | | ✓ | |
| Illustrated (non-photographic) imagery | | | ✓ (UI mockups) | ✓ | ✓ (hero only) | |
| Icon + claim scannable value-prop row | | | | | | ✓ |

**Reading the matrix:** no single reference dominates more than 4 of the 12
rows, and no row is checked in more than 4 of the 6 references — the
selection deliberately avoids convergence on one dominant trend (see
Diversity Assessment below).

## Diversity Assessment

The six references were chosen, and later checked against each other, on
these axes:

- **Visual tone:** cinematic-luxury (01), experimental-bold (02),
  neutral-structured (03), playful-bright (04), quiet-minimal (05),
  masculine-commercial (06) — six distinct tones, no repeats.
- **Typography:** single-face serif with scale/tracking hierarchy (01);
  sans-only with outlined/collision treatments (02); humanist sans with
  gradient-text accents (03); rounded/heavy sans (04); quiet light serif
  wordmark + plain sans (05); bold condensed all-caps (06) — no two
  references share a typographic strategy.
- **Color:** cream/sage/gold (01); teal→orange hard-cut chapters (02);
  near-white/navy + reserved rainbow gradient (03); white + candy-bright
  illustration layer (04); olive/cream desaturated (05); navy/brown/orange
  (06) — no palette repeats, and three different "how many backgrounds does
  the page use" strategies are represented (2–3 alternating, hard-cut
  chapters, and a static neutral ground).
- **CTA philosophy:** near-absent (01); absent/deferred-to-nav (02);
  front-loaded once (03); repeated at every boundary (04); low-key/outlined
  (05); three parallel channels at once (06) — this spectrum is arguably
  the single most useful cross-cutting finding in the whole library (see
  Section 11 of each document), and it is fully populated from one extreme
  to the other.
- **Navigation shape:** overlaid-transparent (01); persistent vertical
  (02); solid dropdown-heavy (03, 04); two-tier centered (05); hybrid
  always-visible-plus-hamburger (06) — five distinct shapes across six
  references.

No two references converge on "large hero + serif font + beige background +
image grid," the failure mode the research brief specifically warned
against. The library is judged to have sufficient diversity for Phase A's
purpose without needing rejection/replacement.

## Architecture Gaps Observed (Cross-Reference Summary)

Each Reference's own Section 19/20 makes a specific, cited claim against
today's `DesignConfig` vocabulary
(`preset`/`theme`/`typography`/`heroVariant`/`menuVariant`/`staffVariant`/
`galleryVariant`/`sectionVisibility`/`sectionOrder`). Recurring signals
across multiple references, summarized here for convenience only — see each
document's own Section 20 for the sourced version:

- **No CTA-composition axis.** Nothing in `DesignConfig` today represents
  "how many parallel conversion channels are visible at once" or "primary
  vs. objection-handling microcopy under a CTA" — raised by References 01,
  03, 04, and 06 independently.
- **No navigation-shape axis.** `SiteHeader` is a single fixed shape; every
  alternative observed here (persistent vertical nav, two-tier centered nav,
  always-visible-plus-hamburger) would need a structural change, not a
  token change — raised by References 02, 05, and 06.
- **No per-section background/media-treatment axis.** Full-bleed
  photographic bands, color-chapter cuts, and illustrated-vs-photographic
  hero choices are all currently impossible without a new per-section
  primitive — raised by References 01, 02, and 05.
- **No general-purpose "claim + proof card" or "logo wall" section.** The
  closest existing primitive (`MenuVariant: "card-grid"`) is scoped to
  menu/service items only — raised by Reference 03.
- **No interactive self-segmentation control.** No section lets a visitor
  filter homepage content before reaching a CTA — raised by Reference 04.

None of these gaps are implemented anywhere in this repository as a result
of this research pass. They are recorded here strictly as observations for
a future Design Direction / Phase B session to weigh.

## What Comes Next (Not Part of This Phase)

```text
                 WEB
                  │
                  ▼
        ┌───────────────────┐
        │ Reference Library │   ← this document and its 6 references (Phase A)
        └───────────────────┘
                  │
                  │  ← future Phase B
                  ▼
        ┌───────────────────┐
        │ Design Directions │
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ DesignConfig /    │
        │ Design Vocabulary │
        └───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Original LP       │
        └───────────────────┘
```

This library does not create a `design-directions/` directory, propose new
presets, or modify `apps/salon-portfolio/` or
`product/coconala-salon-template/` in any way. It is a foundation for later,
separate work.

## Copyright / Originality Note

Every Reference document's Section 21 states explicitly what is being
learned (an abstract structural or visual technique) versus what must never
be copied (a specific site's copy, exact color values, photography, or
brand marks). No HTML, CSS, JavaScript, or React code was copied from any
source. No verbatim body copy longer than a short, attributed marketing
tagline (used for identification, as design criticism/commentary would) was
reproduced in any document. Source links are listed in every document's
Section 22.
