# Frontend Runtime Config Guide (Phase 3B)

How `apps/salon-portfolio/web` obtains business configuration from the
Phase 3A GAS backend at runtime, instead of hard-coding it into the
Next.js bundle.

## Architecture

```text
Server render (app/layout.tsx generateMetadata + RootLayout, app/page.tsx)
      |
      | getRuntimeConfig()            <- React cache(), one call per request
      v
lib/config/runtimeConfig.ts
      |
      | GAS_WEBAPP_URL set?
      |   no  -> { status: "demo-fallback", config: DEMO_RUNTIME_CONFIG }
      |   yes -> lib/api/gasClient.ts callGasAction("getConfig", {})
      |            |
      |            | POST { action: "getConfig", payload: {} }
      |            v
      |          GAS Web App (apps/salon-portfolio/gas) -> Api.ts getConfigAction
      |            |
      |            v
      |          CONFIG + HOLIDAYS sheets (ConfigStore/ConfigParser/ConfigValidator)
      |
      | ok:true, valid shape  -> { status: "runtime", config }
      | ok:false / bad shape / network error -> { status: "runtime-error", config: DEMO_RUNTIME_CONFIG }
      v
lib/config/resolveSiteConfig.ts
      |
      | merges runtime business/hours/features/staffAnyAvailableOption
      | with the frontend-owned nameLatin/tagline/postalCode/socialLinks
      v
SiteConfig (types/content.ts -- unchanged view-model every Phase 2 component already consumes)
```

`app/api/gas/route.ts` is a second, independent path: a generic
`POST /api/gas` proxy for a future browser-initiated action (reservation
submission, contact submission). It has no caller yet in Phase 3B —
`getConfig` is fetched directly from the server boundary above, because a
Next.js Server Component calling its own Route Handler over HTTP is an
anti-pattern the framework explicitly recommends against. When a later
phase needs a browser-initiated write, it becomes this route's first
caller; `lib/api/gasClient.ts`'s `callGasAction` is already the shared
core both paths use.

## Ownership boundary

**GAS/CONFIG owns** (from Phase 3A's `getConfig`, `PublicConfig`):
`business.name`, `business.phone`, `business.email`, `business.address`,
`hours.*`, `holidays`, `features.contactForm`, `features.reservation`,
`features.staffSelection`, `features.calendar`, `features.emailNotification`,
`staffAnyAvailableOption`, `reservation.timezone/slotMinutes/minLeadHours/maxBookingDays`.

**GAS/CONFIG owns, optionally (V1.1 Task 4):** `business.nameLatin`,
`business.tagline`, `business.postalCode`, and a top-level `socialLinks`
array, all `undefined` on the wire when the CONFIG sheet doesn't define
them. `socialLinks` is built from whichever of the CONFIG keys
`social.instagram`/`social.line`/`social.x`/`social.facebook`
(`gas/src/ConfigParser.ts`'s `SOCIAL_LINK_DEFINITIONS`) are actually
present — a flat key per platform, matching this sheet's existing
"discrete keys, no JSON cell values" convention. `lib/config/
resolveSiteConfig.ts` falls back to the frontend-owned demo value
per-field only when the runtime config omits it, so a CONFIG sheet from
before this task renders exactly as it always did — this is the fix for
the design-customization audit's finding that these four fields were
*never* sourced from the real CONFIG sheet even in full production mode.

**Frontend owns** (stays in `config/demo-content.ts`, never sent by GAS):
`GALLERY_IMAGES`, `SALON_FEATURES`, `CUSTOMER_FLOW_STEPS`, `FAQ_ITEMS`,
`ACCESS_INFO` (transit directions), and every visual/typography/spacing/
layout decision. `config/demo-content.ts`'s `SERVICES`/`STAFF` remain the
demo-fallback catalog only (see below), and its `SITE_CONFIG.business`
fields remain the *fallback* values `resolveSiteConfig.ts` uses when the
optional CONFIG keys above are absent — no longer the only source, as of
V1.1 Task 4.

`holidays` is fetched and validated but has no UI consumer yet — no
existing section displays it (Phase 2A never specified one, and adding
one would be a new visual section, out of Phase 3B's scope). A future
phase can surface it in `AccessSection` once that's an approved design
change.

`SERVICES`/`STAFF` moved onto `getServices`/`getStaff` in Phase 5.1
(`lib/config/runtimeCatalog.ts`), following the exact same
fetch/validate/fallback shape as `getConfig` above. `Service`/
`StaffMember`'s presentation-only fields (`description`/`category` on
Service; `role`/`introduction`/`photoSrc` on StaffMember) have an
*optional* equivalent column as of V1.1 Task 4 — `Description`/`Category`
on the `SERVICES` sheet, `Role`/`Bio`/`ImagePath` on the `STAFF` sheet
(`gas/src/SheetSchemas.ts`'s `SERVICES_OPTIONAL_HEADERS`/
`STAFF_OPTIONAL_HEADERS`). A runtime-sourced Menu/Staff entry carries them
when the sheet has the column and a non-blank cell, and is `undefined`
otherwise — `lib/config/resolveCatalog.ts`'s mappers pass them through
unchanged either way, and `MenuRow`/`StaffCard` render them
conditionally, unchanged since Phase 5.1. `photoAlt` still has no
sheet-backed source; `StaffCard.tsx` falls back to the staff member's
name as alt text when it's absent. `ImagePath`/`photoSrc` is a path the
buyer's own Next.js project serves from `public/` (e.g.
`/images/staff/st001.jpg`) — never an external URL; `next.config.ts`
configures no remote image domains, and none are needed for this. The
demo-fallback branch is unaffected: it still reuses `SERVICES`/`STAFF`
from `config/demo-content.ts` directly, with all presentation fields
intact.

## Fallback / error behavior

| `GAS_WEBAPP_URL` | GAS call result | `RuntimeConfigResult.status` | What renders |
|---|---|---|---|
| unset | (not attempted) | `demo-fallback` | Demo business values (`config/demo-content.ts`-derived) — normal local/portfolio-demo mode, no notice shown. |
| set | success, valid shape | `runtime` | Real business values from GAS. |
| set | `ok:false`, network error, or malformed shape | `runtime-error` | Same demo-derived values as a safe placeholder, **plus** a calm Japanese notice banner (`components/layout/RuntimeConfigNotice.tsx`) above the header, so a real backend failure is never silently indistinguishable from demo mode. The specific error is logged server-side via `console.error` only — never sent to the browser. |

`lib/config/runtimeCatalog.ts` (Menu/Staff) follows this exact same table —
same three statuses, same all-or-nothing fallback (a `getServices` failure
falls back Menu *and* Staff together, never a mix of real and demo data).

This distinguishes "no backend configured yet" (expected during
development and for the current portfolio deployment, since Phase 3B
does not include a production GAS deployment) from "a configured backend
is actually broken" (which must never be silently masked as normal demo
content).

## Caching / revalidation

Every `getConfig` fetch uses `cache: "no-store"` (`lib/api/gasClient.ts`)
— business hours, holidays, and feature flags must reflect the CONFIG
sheet's current state on every request, not a stale cached response.

Within one request, `generateMetadata`, `RootLayout`, and `Home` (page.tsx)
each call `getRuntimeConfig()`; it is wrapped in React's `cache()` so all
three share a single GAS network call per page load rather than issuing
it two or three times. `cache()` only dedupes inside an actual Next.js
request render (verified manually, not by Jest — a bare call outside of
a render does not dedupe, which is expected and is not the code path
that matters here).

## Security

- `GAS_WEBAPP_URL` is read only in `lib/api/gasClient.ts`, a file with no
  `"use client"` boundary anywhere in its import chain — it is never sent
  to the browser.
- No `NEXT_PUBLIC_*` environment variable is introduced by this phase.
- `app/api/gas/route.ts` never echoes a caught error's message to the
  client — it always maps to the fixed `INTERNAL_ERROR` / Japanese
  message pair, mirroring the GAS-side `Api.ts` convention of never
  forwarding raw exception text.
- The frontend treats every `getConfig` response as untrusted external
  input: `lib/validation/runtimeConfigValidator.ts` structurally validates
  it before any component ever sees it.

## What Phase 3B intentionally did not do

- No GAS/`gas/src/**` changes — the Phase 3A contract was found fully
  sufficient for everything in scope.
- No reservation/contact submission, Calendar, Gmail, auth, Supabase, or
  deployment.
- No production GAS Web App has been deployed, so the `runtime`/
  `runtime-error` branches are exercised only by the Jest test suite
  (`lib/config/runtimeConfig.test.ts`) with `callGasAction` mocked, not by
  a real end-to-end call. `demo-fallback` is what actually renders today
  (`GAS_WEBAPP_URL` unset in every environment so far).
