# Reference: Stripe

## 1. Source

- Website: https://stripe.com (Japan-localized homepage served at `/en-jp`)
- Source gallery: none — selected directly as a widely cited reference for structured B2B/SaaS conversion design (corroborated by multiple industry sources during research, e.g. Superside's and Unbounce's 2026 landing-page-examples roundups naming Stripe as a benchmark for conversion-focused SaaS design)
- Category: Structured B2B conversion / fintech platform homepage
- Approximate year/date if available: not published on-site; reviewed as currently live
- Accessed: 2026-09-13 (live site, desktop viewport ~1376px)
- Original site purpose: Primary marketing/conversion homepage for Stripe's payments and financial-infrastructure platform

## 2. Why This Reference Was Selected

It is the clearest example in this library of a page optimized for information density and credibility signaling over mood-building — the opposite end of the spectrum from References 01 and 02. It demonstrates a repeatable "modular card" system for showing many distinct product capabilities on one page without the page feeling like a wall of text, and a logo-wall social-proof pattern placed directly under the hero fold.

## 3. Core Design Concept

A dense, gradient-branded hero making one broad value claim, immediately backed by a wall of recognizable customer logos, followed by a modular grid of self-contained "capability cards" — each card pairing a short headline with a small, realistic product-UI illustration — so the page communicates platform breadth through repetition of one card pattern rather than through long-form copy.

## 4. Layout Pattern

- Page width: content constrained to a comfortable reading/scan width; hero copy sits in roughly the left half of the viewport with a large abstract gradient graphic occupying the right half and bleeding past the fold.
- Grid: a clear 2- and 3-column card grid drives the entire body of the page below the hero — cards are consistent-height rounded rectangles with generous internal padding.
- Alignment: left-aligned headlines and body copy throughout; cards themselves are edge-aligned to a shared grid, not staggered.
- Whitespace: moderate — enough padding to keep each card legible, but density is clearly prioritized over the airy pacing of References 01/02.
- Asymmetry: mostly symmetric grid, with the hero being the one asymmetric moment (text-left, graphic-right).
- Section rhythm: hero → logo wall (proof) → headline + 2-column feature-card row → additional card rows (payment UI mockups, billing UI mockups, a data-visualization card, a world-map "reach" card) — a steady cadence of "claim, then a card proving it."
- Content density: high relative to References 01/02 — nearly every viewport height contains a headline, supporting copy, and a populated UI mockup.
- Vertical rhythm: shorter, more frequent sections than the luxury/editorial references — this page assumes a scanning reader, not a slow-reading one.
- Full-width vs constrained: the hero's background gradient bleeds full-width behind a constrained text column; card sections are constrained to a shared max-width grid.

## 5. Hero Pattern

- Hero height: shorter than a full 100vh — closer to a "headline + proof strip" fold that intentionally shows the logo wall partially on first paint, cueing the visitor to keep scrolling.
- Text placement: left-aligned, upper-left of the fold, with a small live-updating stat line ("Global GDP running on Stripe: X%") above the headline as a first-impression credibility hook.
- Image placement: a large abstract, colorful ribbon/gradient graphic occupies the right portion of the hero and bleeds toward the lower-right, functioning as brand texture rather than a literal product screenshot.
- Typography scale: a large but not oversized headline (noticeably smaller than References 01/02's display type), colored with a two-tone gradient-text treatment across the sentence — the color mixing between deep purple/blue and blue-grey functions as a secondary brand signal even in plain text.
- CTA placement: two buttons directly under the headline — a solid primary ("Get started") and a secondary Google-sign-up shortcut — both above the fold, immediately actionable.
- Navigation relationship: a conventional solid (non-transparent) header sits above the hero, not overlaid on it — a deliberate contrast to References 01/02's hero-integrated headers.
- Visual focal point: the headline's gradient-colored text, reinforced by the color-matched ribbon graphic behind it.
- Mobile transformation: not sufficiently verified in this session.

## 6. Typography Pattern

- A single clean, humanist sans face is used throughout — no serif anywhere, no display/body contrast beyond size and color.
- Hierarchy is carried by size, weight, and a gradient-text color treatment applied selectively to key phrases within the headline (not the whole headline) — a subtler, more surgical use of color-in-type than Reference 02's monolithic outlined type.
- Body/support copy uses a muted blue-grey rather than pure black, softening dense text blocks so they don't compete visually with the card UI mockups.
- Card headlines are noticeably smaller and more restrained than the page's own hero type — internal hierarchy within cards is deliberately quiet so the embedded product-UI graphic (not the card's own headline) carries visual weight.
- No unusual capitalization, letter-spacing, or display flourishes anywhere — typography is functional, not identity-driven, which fits a platform serving many different customer brands rather than expressing one designer's voice.

## 7. Color Pattern

- Dominant palette: a near-white/very light lavender background throughout the body, with the brand's signature multi-hue gradient (deep indigo → orange → magenta/pink) reserved for the hero graphic and used sparingly elsewhere as thin accent bands or small illustration details.
- Contrast: dark navy/near-black text on light backgrounds for maximum scan legibility; the gradient is decorative, never used for body text contrast.
- Accent usage: a single saturated indigo/violet is the primary interactive-element color (primary buttons, links, one card's icon accents) — the wider rainbow gradient is reserved for brand moments only (hero, and one full-bleed gradient band later in the page), preventing the "gradient everywhere" fatigue some fintech sites fall into.
- Background strategy: overwhelmingly light/neutral, letting the product-UI mockups (which have their own internal colors) provide visual variety without the page background competing with them.
- Monochrome vs multi-color: the base page is close to monochrome (near-white, navy text); multi-color is deployed only in the hero and in illustrative card content.
- Light/dark relationship: entirely light-mode in this pass; no dark-mode toggle or dark section was observed in the captured scroll depth.

## 8. Image / Media Pattern

- Photography style: none — Stripe uses illustrated abstract gradients and realistic *product UI* mockups (a phone tap-to-pay screen, a checkout form, a billing dashboard card, a particle-rendered world map) instead of photography anywhere in the captured depth.
- Aspect ratios: card-internal graphics vary per card (a tall phone mockup, a wide checkout-flow mockup, a square-ish dashboard chart) but each card's own container is a consistent rounded rectangle.
- Crop behavior: UI mockups are shown complete/uncropped inside their cards, sometimes overflowing slightly past the card edge into the surrounding gradient background for depth.
- Image density: high relative to References 01/02 — nearly every content block includes a graphic, but every graphic is a small, purposeful illustration rather than a large mood photograph.
- Full-bleed vs contained: card graphics are contained within their card boundary (with intentional slight overflow bleed in a few cases); only the hero and one later gradient band are full-bleed.
- Editorial vs product imagery: 100% product/illustrative — this is the clearest "product-led" imagery approach in the library, versus the "editorial/mood" imagery of References 01 and 02.

## 9. Section Composition

Observed order: Hero (claim + stat + dual CTA + gradient graphic) → customer logo wall (Amazon, Google, Toyota, Slack, OpenAI, Shopify, and several Japan-market brands like SmartHR/sansan/ANA, signaling this is the JP-localized homepage) → "Flexible solutions for every business model" headline → 2-column card row (payments UI mockup card; billing/usage-meter card with a small bar chart) → further card rows including a subscription/checkout mockup and an abstract particle-globe card. The page's core structural device is "one plain-language claim, immediately followed by one visual proof card" repeated as many times as there are product pillars to cover — a very different rhythm from the alternating-mood or color-chapter approaches in References 01/02.

## 10. Navigation Pattern

- Header structure: logo far-left; a row of dropdown menu items (Products, Solutions, Developers, Resources, Pricing) center-left; Sign in (text/ghost) and a solid "Contact sales" button, far-right.
- Menu behavior: dropdown-capable top-level items (indicated by chevron icons) — a materially more complex nav than any other reference in this library, appropriate for a platform with many distinct product lines.
- Sticky/fixed: header is solid (not transparent) from first paint, and remained visible/fixed during scroll in this session.
- Mobile navigation: not sufficiently verified.
- CTA in navigation: yes, prominently — "Contact sales" is a persistent solid-color button distinct from the ghost-style "Sign in," a clear two-tier CTA hierarchy (self-serve sign-in vs. enterprise sales contact) baked directly into the header.
- Relationship to hero: the header sits above/separate from the hero, with a hard visual boundary — never overlaid on hero imagery, unlike References 01/02.

## 11. CTA / Conversion Pattern

- Primary CTA: solid "Get started" button, immediately under the hero headline, above the fold.
- Secondary CTA: "Sign up with Google" as a low-friction alternate path directly beside the primary button — an explicit two-path conversion offer (full signup vs. one-click OAuth) not seen in any other reference in this library.
- Additional CTA: "Contact sales" in the header serves a *different* audience (enterprise buyers) than the hero's self-serve buttons — a deliberate dual-funnel structure.
- Placement: CTAs are front-loaded (hero + header) rather than repeated throughout the body content in the captured depth — the card sections focus on proof/education, deferring the conversion ask back to the persistent header CTA.
- Prominence: high-contrast solid-fill primary button; ghost/outline treatment for lower-priority actions — a clear visual CTA hierarchy.
- Conversion hierarchy: self-serve ("Get started"/Google sign-up) is visually primary; enterprise ("Contact sales") is present but secondary in the hero, primary-weighted only in the header.

## 12. Interaction / Motion Pattern

- A live-updating statistic ("Global GDP running on Stripe: 1.71455764%") in the hero implies real-time or animated-counter behavior, a small but effective trust/scale signal.
- Card "expand" icons (a small diagonal-arrow glyph in two of the captured cards) suggest an interactive lightbox/detail-view affordance on the product cards, though the expanded state itself was not opened in this pass.
- No scroll-triggered reveal animation was distinctly observed at normal scroll speed in the captured range; sections appeared to render normally rather than fade/slide in.

## 13. Responsive / Mobile Pattern

Mobile behavior not sufficiently verified in this session — no mobile-width capture was successfully obtained. Given the multi-column card grid and dropdown-heavy header, a collapse to a single-column card stack and a hamburger/drawer navigation would be the expected pattern for a site of this structural type, but this is inference, not observation.

## 14. Design Strengths

- The repeating "claim + proof card" rhythm scales to an arbitrarily large number of product pillars without the page feeling repetitive, because each card's internal UI mockup differs.
- Logo-wall social proof placed immediately under the hero (before any feature explanation) front-loads credibility for a skeptical B2B/finance audience.
- A single saturated accent color for interactive elements, with the full rainbow gradient reserved for brand-only moments, avoids gradient fatigue while still keeping a distinctive visual signature.
- The dual self-serve/enterprise CTA structure serves two very different buyer types on the same homepage without either path feeling like an afterthought.
- Product-UI-mockup cards double as both proof and light onboarding preview — a visitor sees roughly what the actual product looks like before signing up.

## 15. Potential Weaknesses

- High information density and many small cards ask more scanning effort of the visitor than the slower, single-idea-per-screen references in this library — not suited to a browsing/inspirational visit.
- The subtlety of the gradient-text treatment (applied to only part of a headline) is easy to get wrong without careful contrast testing — a poorly executed version reads as a color/contrast bug rather than an intentional accent.
- Relying on product-UI mockups as the primary imagery requires an actual product with a polished UI to photograph/illustrate — not transferable to a business with no software product (e.g. a salon) without adapting the *pattern*, not the *content*, of the cards.
- A two-tier header CTA (self-serve + enterprise) adds nav complexity that a smaller local-service business would not need and could over-complicate a simpler booking-focused LP.

## 16. Extracted Patterns

### Pattern A — Claim-Then-Proof-Card Repetition

Each section pairs one short plain-language claim with one self-contained card containing a concrete visual proof (a UI mockup, a chart, an illustration), repeated as many times as there are distinct capabilities to cover.

### Pattern B — Front-Loaded Social Proof Wall

A row of recognizable customer/partner logos is placed immediately below the hero, before any feature explanation, to establish credibility before asking for engagement.

### Pattern C — Dual-Path CTA for Two Buyer Types

Two visually distinct CTAs address two different audiences on the same page (a low-friction self-serve action and a higher-touch "talk to sales" action), rather than forcing every visitor down one funnel.

### Pattern D — Reserved-Gradient Branding

A signature multi-color gradient is used only in brand-defining moments (the hero, one full-bleed band) while the rest of the page stays neutral, so the gradient keeps its impact instead of becoming wallpaper.

## 17. Reusable Design Principles

- Repetition of one well-designed "claim + proof" card format scales better across many features than writing unique layouts for each one.
- Placing social proof immediately after the hero (not buried mid-page) matters most for skeptical, considered-purchase audiences.
- Reserve a signature gradient/brand color for a few deliberate moments rather than spreading it thin across the whole page.
- Two audiences with different intents can be served by two differently weighted CTAs on the same page, rather than compromising on one generic CTA.

## 18. Applicability to Future Business LPs

| Dimension | Score 0–3 | Notes |
|---|---:|---|
| Salon | 1 | Card-grid/proof-density approach reads as too "software platform" for a warm, personal-care brand without significant softening |
| Clinic | 2 | The logo-wall/credibility-first structure and claim-then-proof rhythm suit a trust-driven vertical well |
| Local service business | 1 | Overall density and dual-funnel CTA are more than most local-service LPs need |
| Professional service | 3 | Claim+proof cards and front-loaded credibility signals map directly onto professional-service positioning |
| Product landing page | 3 | This is the native use case for the pattern |
| Portfolio / agency | 1 | Density and self-serve CTA framing don't fit a portfolio's slower, showcase-first pacing |
| Mobile suitability | 1 (not verified) | No evidence collected; multi-column card grids are typically the most collapse-heavy pattern on mobile |
| Conversion suitability | 3 | Purpose-built for conversion; the strongest reference in this library on this dimension |

## 19. Relationship to Current Salon Architecture

```text
Claim-then-proof-card grid:
Not currently supported as a distinct section type. MenuVariant's
"card-grid" option is the closest existing primitive (a grid of cards), but
it is scoped specifically to menu/service items, not a general-purpose
"claim + illustrative card" section usable for arbitrary content.

Front-loaded social-proof logo wall:
Not currently supported. No HomeSection in the current union represents a
customer/partner logo strip; the Menu/Staff/Gallery sections are the closest
"proof" sections today, but none is a logo-wall pattern.

Dual-path CTA (self-serve vs. contact-sales-equivalent):
Not currently supported. features.reservation/contactForm are visibility
flags for existing single-purpose sections (ReservationCtaBand, Contact),
not a two-tier "primary self-serve action vs. secondary high-touch action"
CTA composition within one section.

Reserved-gradient/accent-only-in-key-moments branding:
Partially supported — ThemeTokens already centralizes a single `accent`
value per theme, which is the right token to carry a "used sparingly, in
key moments" role; today's components apply it fairly uniformly (e.g.
button hover, eyebrow labels) rather than reserving it for one or two
deliberate brand moments per page.
```

## 20. Missing Capability Signals

```text
Potential future capability:
- A general-purpose "claim + illustrative card" section primitive, usable
  outside the Menu context, for future non-salon business verticals.
- A social-proof / logo-wall section type as a new optional HomeSection.
- A CTA composition axis distinguishing a low-friction "primary" action from
  a higher-touch "secondary" action within the same section, rather than
  one CTA per section.
```

This is a research observation only. Nothing above is implemented by this document.

## 21. Originality / Copyright Boundary

What is being learned: the structural technique of pairing a plain claim with a proof card repeatedly, front-loading social proof, and reserving a signature accent/gradient for a few deliberate moments. What should not be copied: Stripe's actual product UI mockups, its specific brand gradient values, its copy, or its logo wall's specific customer logos. A future design applying this pattern to a salon or local-service LP would need entirely original "proof" content (e.g. a before/after card, a certification badge, a real testimonial) in place of Stripe's product-UI mockups — the card *rhythm* transfers, the *content type* inside each card does not.

## 22. Source Links

- https://stripe.com
