# coconala-portfolio

A small static sales/demo site for a Coconala LINE automation service.

- `/`: one-page landing page
- `/works/hair-salon`: Hair Salon case study (demo sample, the flagship)
- `/works/nail-salon`: Nail Salon lightweight demo (Rich Menu, short workflow, synthetic menu)
- `/works/spa`: Spa lightweight demo (same format as Nail Salon)

It uses Next.js (App Router), TypeScript and Tailwind CSS. There is no backend, no API routes, no database and no LINE connection. All pages are prerendered as static HTML.

## Run locally

```bash
cd apps/coconala-portfolio
npm install
npm run dev          # http://localhost:3000
```

## Build

```bash
npm run typecheck
npm run build
npm run start        # serve the production build locally
```

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel: **Add New… → Project**, then import the repository.
3. Set **Root Directory** to `apps/coconala-portfolio`. Vercel detects the Next.js framework automatically, and you can keep the default build settings.
4. Click Deploy. You don't need any environment variables.
   - Optional: set `NEXT_PUBLIC_SITE_URL` (for example `https://your-domain.com`) when you use a custom domain. Open Graph image URLs use this value. Without it, the site falls back to Vercel's production URL.

## Where to change things

| What | Where |
|---|---|
| **Coconala URL** (the only place it's defined) | `content/site.ts` → `siteConfig.coconalaUrl` |
| Brand name, SEO title/description | `content/site.ts` → `siteConfig` |
| Homepage copy (hero, cards, flow, FAQ, CTA) | `content/site.ts` → `siteContent` |
| Case study copy | `content/hair-salon.ts` → `hairSalonCaseStudy` |
| Nail Salon demo copy (incl. synthetic menu/prices) | `content/nail-salon.ts` → `nailSalonDemo` |
| Spa demo copy (incl. synthetic menu/prices) | `content/spa.ts` → `spaDemo` |
| Extra demo cards under WORKS | `content/site.ts` → `caseStudyPreview.moreDemos` |
| Spreadsheet / email mock data (synthetic only) | `content/hair-salon.ts` → `demoReservations`, `demoEmail` |
| Colors | `app/globals.css` → `@theme` |

## Demo assets

All demo assets are in `public/demos/hair-salon/`.

| File | Status |
|---|---|
| `rich-menu.png` | Copied from the Factory output `AI-Agent-Coconala-Factory/projects/2026/demo-hair-salon/rich-menu/rich-menu.png` (2500×1686). Also used as the Open Graph image. |
| `demo.mp4` | **Not added yet.** Add the file here, then set `siteContent.demo.videoSrc` in `content/site.ts` to `"/demos/hair-salon/demo.mp4"`. Until you do, a "準備中" placeholder is shown. The video is muted, has controls and does not autoplay. |
| Spreadsheet / email visuals | Drawn with HTML/CSS in `components/DemoVisuals.tsx` using fake data. To use real screenshots instead, add `spreadsheet.png` / `email.png` here and swap the components for `next/image`. |

`public/demos/nail-salon/rich-menu.png` is copied from `AI-Agent-Coconala-Factory/projects/2026/demo-nail-salon/rich-menu/rich-menu.png` (2500×1686).
`public/demos/spa/rich-menu.png` is copied from `AI-Agent-Coconala-Factory/projects/2026/demo-spa/rich-menu/rich-menu.png` (2500×1686).

To refresh the Rich Menu, re-copy the PNG from the Factory project. The site never imports anything from the Factory at runtime.

Only use synthetic data (such as `example.com` addresses and "Demo User") in any asset.
