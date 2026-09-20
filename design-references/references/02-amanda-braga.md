# Reference: Amanda Braga

## 1. Source

- Website: https://www.amandabraga.com/
- Source gallery: Awwwards, "Editorial Layout" inspiration collection
- Category: Personal/portfolio site for a jewelry designer
- Approximate year/date if available: not published on-site; reviewed as currently live
- Accessed: 2026-09-13 (live site, desktop viewport ~1400px)
- Original site purpose: Portfolio and brand story site for jewelry designer Amanda Braga (Miami/Brazil)

## 2. Why This Reference Was Selected

It is the strongest counter-example in this library to "editorial = quiet serif + beige." It achieves an editorial, typography-led feel using saturated, shifting color blocks (deep teal → burnt orange/red), oversized outlined display letterforms, and duotone photography — proving the editorial-layout pattern is a structural approach (large type, generous negative space, deliberate hierarchy), not a fixed palette.

## 3. Core Design Concept

A loading-screen-gated, single-scroll brand story told through full-viewport color-block chapters, each dominated by oversized outlined or solid display type, punctuated by duotone-treated photography and organic blob shapes that echo the designer's own logomark.

## 4. Layout Pattern

- Page width: full-bleed color fields with content set as large centered/left-biased type blocks; no visible content-width container — type itself defines the margins.
- Grid: no visible column grid; layout is composition-driven (type + one photo + one shape per screen) rather than grid-driven.
- Alignment: mixed — the loading/hero screen is centered; the "AMANDA BRAGA" name screen is left-biased against a persistent left-side vertical nav; the "Design is her language" screen is left-aligned body copy under centered-ish oversized type.
- Whitespace: extreme — most screens hold exactly one large type element and enormous surrounding negative space.
- Asymmetry: high — a large decorative circle bleeds off the right edge on one screen; a duotone photo is cropped and bled off the top of another.
- Section rhythm: one idea per full viewport-height screen; each screen also changes the background color, so scrolling reads as moving through physically distinct rooms.
- Content density: extremely low per screen (a name, then a headline, then a paragraph, then a portrait).
- Full-width vs constrained: everything is full-bleed; nothing is boxed into a centered content column.

## 5. Hero Pattern

- Hero height: full viewport; a branded loading screen (logomark + wordmark inside a thin circle, with a small animated arc) gates entry before the real hero appears.
- Text placement: after loading, the designer's name renders as huge outlined (stroke-only, unfilled) display letterforms spanning most of the viewport width, split across two lines.
- Image placement: no photograph in the hero itself — the hero is pure typography plus a persistent left-side vertical navigation column and a large filled circle bleeding off-canvas to the right.
- Typography scale: the single largest type moment in this entire reference library — letterforms are drawn with visible construction guides (small serif-like foot marks on the outlined letters), giving them a hand-drafted, logo-design feel rather than a rendered webfont look.
- CTA placement: none in the hero; the hero is pure brand-identity statement, not a conversion moment.
- Navigation relationship: a slim vertical text nav (ABOUT / PROJECTS / CONTACT / SHOP / INSTAGRAM) sits fixed at the far left for the entire scroll, independent of the hero.
- Mobile transformation: not sufficiently verified in this session.

## 6. Typography Pattern

- A geometric sans display face is used at wildly different treatments: outlined/unfilled for the name, and later a bold serif-adjacent slab face (in "Design is her language") with intentional baseline-shift/overlap between words — letters visually collide with each other and with the photo above them, which reads as a deliberate "type as texture" choice rather than a rendering bug (confirmed by the same collision pattern recurring across multiple headline instances).
- Body copy (in the biography paragraph) uses a plain, legible sans at a large size relative to typical web body text — still an "editorial" scale even for supporting copy.
- No serif appears anywhere; the entire type system is sans/geometric, which is unusual for an "editorial" site (editorial layouts often reach for serif) and proves the pattern is about scale/hierarchy, not typeface family.
- Capitalization: the persistent left nav is all-caps with wide tracking; headline copy uses normal sentence case, creating a clear nav-vs-content distinction through case alone.
- Contrast between typefaces is achieved through weight and construction (outlined vs. solid vs. slab-serif-influenced) rather than through mixing serif and sans.

## 7. Color Pattern

- Dominant palette shifts completely between chapters: deep teal background with a dusty peach/terracotta accent for the opening screens; then a hard cut to burnt-orange/red-orange with cream/black type for the brand-story screen.
- Contrast: light peach/cream type on dark teal or saturated orange — consistently high-contrast, poster-like combinations.
- Accent usage: the dusty peach/terracotta recurs across both color chapters as a connecting thread (the logomark, the outlined type, and a callout dot are all this same accent), which is what keeps two very different backgrounds feeling like one brand.
- Background strategy: full-screen flat color per chapter — no gradients, no photography-as-background in the sections captured.
- Monochrome vs multi-color: each individual screen is near-monochrome (one background + one accent), but the page overall is multi-color through hard chapter cuts.
- Light/dark relationship: alternates between a dark chapter (teal) and light-on-dark/dark-on-light mixed within the orange chapter — not a simple light-mode/dark-mode toggle but a deliberate palette-per-chapter system.

## 8. Image / Media Pattern

- Photography style: a single portrait (the designer, in sunglasses, outdoors) is treated with a strong orange/red duotone/color-overlay rather than shown in natural color — the photo is subordinated to the palette, not the other way around.
- Aspect ratios: the portrait is cropped tall/narrow and bled off the top edge of its section, partially overlapped by the headline type below it.
- Crop behavior: aggressive — the image is deliberately cut by the following text block, reinforcing the "type as a structural layer above imagery" idea.
- Image density: very low — one photograph observed across the captured scroll depth; the rest of the page is type and flat shapes.
- Full-bleed vs contained: the photo is full-bleed at the top, contained/cropped where it meets the type block.
- Editorial vs product imagery: portrait/editorial only; no product (jewelry) photography appeared in the captured homepage depth, which is a little surprising for a jewelry designer's site and suggests product imagery lives deeper, in a Projects/Shop page.

## 9. Section Composition

Observed order: branded loading screen → oversized outlined name + persistent left nav + large bleeding circle → biography paragraph (still on teal) → hard color-cut to orange chapter with duotone portrait + "Design is her language" headline + supporting paragraph. The page uses **color-chapter cuts** as its primary section-transition device, rather than spacing or a divider line — a fundamentally different transition technique than Reference 01's flat-panel alternation, because here every "panel" is a different hue, not a repeating pair.

## 10. Navigation Pattern

- Header structure: no horizontal top header at all — navigation is a persistent vertical text stack at the far left edge of the viewport, present through every color chapter.
- Menu behavior: simple text list (About/Projects/Contact/Shop/Instagram); no dropdowns observed.
- Sticky/fixed: yes, fixed for the entire scroll depth captured, regardless of background color change — the nav's own text color did not appear to invert between chapters, worth flagging as a potential legibility risk if a chapter's background were closer to the nav text color than the two captured here.
- Mobile navigation: not sufficiently verified.
- CTA in navigation: none — this nav is purely wayfinding, not conversion-oriented.
- Relationship to hero: the nav is not part of the hero composition; it is a persistent frame around the entire page, more like a piece of chrome than a hero element.

## 11. CTA / Conversion Pattern

- No conversion-oriented CTA (buy, book, contact-form-submit) appeared anywhere in the captured scroll depth; the site's only "actions" are the wayfinding nav items themselves (Shop, Contact).
- This is a portfolio/personal-brand site, not a transactional LP — its entire "conversion" goal is likely "get the visitor to click Projects or Shop," which the persistent nav already handles passively rather than through a pushed CTA.
- Prominence/frequency: effectively zero dedicated CTA prominence; conversion is deferred entirely to navigation.

## 12. Interaction / Motion Pattern

- A branded loading sequence (arc animation completing around a circle) gates the first paint — a deliberate "arrival ritual" rather than a performance-driven loader.
- Scroll-triggered reveals are implied by the sequential chapter structure (text appeared progressively as scrolling continued in this session), consistent with a scroll-reveal/fade-in pattern, though the exact easing/trigger mechanics were not instrumented in this pass.
- No hover-state interactions were tested in this session.

## 13. Responsive / Mobile Pattern

Mobile behavior not sufficiently verified. Given the reliance on very large, precisely-sized outlined type and off-canvas-bleeding shapes, mobile adaptation would necessarily require significant type-scale reduction and likely a full recomposition of the persistent left-nav-plus-bleeding-circle layout — but this is inference, not observation, and is flagged as such rather than stated as fact.

## 14. Design Strengths

- Proves editorial/oversized-type layouts work in saturated, non-neutral color palettes, not just beige/cream.
- A single recurring accent color (the terracotta/peach) unifies two otherwise very different chapter palettes into one coherent brand.
- Outlined (stroke-only) display type is a distinctive, low-cost way to make huge type feel light rather than heavy/shouty.
- The persistent vertical nav is unobtrusive but always available, avoiding the need for a return-to-top or sticky horizontal header.
- Duotone/color-overlaid photography keeps a single portrait visually consistent with flat-color chapters that contain no photography at all.

## 15. Potential Weaknesses

- A gated loading screen adds a real time-cost before any content is visible — acceptable for a portfolio visited by an already-interested audience, risky for a conversion-driven LP where every extra second raises bounce risk.
- Fixed nav-text color across very different backgrounds is a latent accessibility/legibility risk if a future chapter's background approaches the nav text's own color.
- Extremely low content density per screen means a visitor must scroll a long way to reach any commercial content (Shop/product imagery did not appear within the captured depth).
- The "type overlapping/colliding with itself and with photography" technique requires precise, custom-tuned positioning per breakpoint — it is expensive to build and maintain compared to a standard flowing-type layout.

## 16. Extracted Patterns

### Pattern A — Color-Chapter Structure

The page is divided into full-viewport "chapters," each with its own flat, saturated background color; a single recurring accent color threads through every chapter to keep them feeling like one brand rather than unrelated screens.

### Pattern B — Outlined Oversized Display Type

A brand name or headline is rendered at a huge scale using stroke-only (unfilled) letterforms, making an otherwise heavy type moment feel light and graphic rather than shouty.

### Pattern C — Persistent Vertical Wayfinding Nav

Navigation lives as a slim, fixed vertical text stack at the page edge instead of a horizontal top bar, freeing the full viewport width for type/image composition in every chapter.

### Pattern D — Type as a Structural Layer Over Imagery

A headline is deliberately positioned to overlap/crop a photograph beneath it, treating type as a layer stacked above imagery rather than as copy placed beside or below it.

## 17. Reusable Design Principles

- An "editorial" feel is a function of scale, hierarchy, and negative space — it can be built in any palette, including saturated, non-neutral color.
- One consistent accent color can unify multiple very different chapter backgrounds into a single coherent brand identity.
- Outlined/stroke type is a lightweight way to use dramatic scale without visual heaviness.
- A persistent vertical nav can replace a horizontal header entirely when the page's real estate is better spent on full-width type/image composition.

## 18. Applicability to Future Business LPs

| Dimension | Score 0–3 | Notes |
|---|---:|---|
| Salon | 2 | The color-chapter + oversized-type technique could differentiate a bold/editorial salon preset, but needs a toned-down content density for a business (not pure-portfolio) audience |
| Clinic | 0 | Far too low-density and identity-driven for a trust/information-first vertical |
| Local service business | 1 | Workable only for a highly design-forward, brand-led local business, not a typical service LP |
| Professional service | 1 | The confidence/boldness could suit a creative-adjacent professional service (e.g. a design studio), not a conservative one |
| Product landing page | 1 | Near-zero CTA pattern works against typical product conversion goals |
| Portfolio / agency | 3 | This is exactly the site type it was built for; directly reusable pattern for a portfolio/agency vertical |
| Mobile suitability | 0 (not verified) | High risk given oversized precisely-composed type; no evidence collected either way |
| Conversion suitability | 0 | No conversion mechanism observed on the homepage itself |

## 19. Relationship to Current Salon Architecture

```text
Color-chapter full-viewport sections:
Not currently supported. Every homepage section in app/page.tsx draws from the
same small set of shared surface tokens (background/surface/surfaceSunken) for
the whole page — there is no per-section "assign this section its own flat
brand-color background" mechanism; theme tokens are global to the deployment,
not chapter-scoped.

Oversized outlined display type:
Not currently supported. HeroSection's H1 is sized per component
(text-[34px]...lg:text-[56px]) but always rendered as normal filled type via
the shared heading font tokens — there is no stroke/outline type treatment or
a "type as brand-mark" variant anywhere in the type system.

Persistent vertical wayfinding nav:
Not currently supported and would be a significant departure — SiteHeader is
a single, always-horizontal top bar; there is no header-position or
header-orientation axis in DesignConfig today.

Accent-color-as-connective-thread across sections:
Partially supported — a single `accent` token already exists per theme in
ThemeTokens and is used sitewide, which is the same underlying idea (one
accent unifying otherwise-different visual moments), just not yet exploited
for the kind of dramatic per-section background shifts this reference uses it
for.
```

## 20. Missing Capability Signals

```text
Potential future capability:
- A per-section background-color override axis (independent of the global
  theme), for a "color-chapter" preset style.
- A display-type treatment axis (filled vs. outlined/stroke) for hero/heading
  type, as an alternative to today's single filled-type rendering.
- A header-orientation axis (horizontal top bar vs. persistent vertical
  side nav) as a structural alternative to SiteHeader's current fixed shape.
```

This is a research observation only. Nothing above is implemented by this document.

## 21. Originality / Copyright Boundary

What is being learned: the structural idea of color-chapter sectioning, outlined oversized type as a lightweight way to achieve scale, and a persistent vertical nav as an alternative to a horizontal header. What should not be copied: Amanda Braga's actual wordmark/logomark, her specific teal/terracotta and orange/cream color values, her portrait photography, or her brand copy. Any future design should apply the *chaptering and type-treatment techniques* with an entirely original palette, typeface choice, and photography suited to its own business.

## 22. Source Links

- https://www.amandabraga.com/
- https://www.awwwards.com/inspiration/editorial-layout
