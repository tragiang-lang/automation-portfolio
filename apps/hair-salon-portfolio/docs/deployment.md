# Deployment Guide — atelier ito (hair-salon-portfolio)

## Independent deployment boundary

This app (`apps/hair-salon-portfolio/`) is a fully independent deployment.
It has, and needs, its own:

- **Google Apps Script project** (backend) with its own Web App deployment
  URL.
- **Google Spreadsheet** (CONFIG/HOLIDAYS/SERVICES/STAFF/RESERVATIONS/
  CANCELLATION_REQUESTS/INQUIRIES/EMAIL_LOG/ERROR_LOG — see
  `config-and-sheets-guide.md`).
- **Google Calendar** that reservations are written to.
- **Vercel (or equivalent) deployment** for the Next.js frontend in
  `apps/hair-salon-portfolio/web/`.

**Nothing above is shared with `apps/salon-portfolio`.** That app has its
own separate GAS project, spreadsheet, calendar, and web deployment. Do
not point this app's `.clasp.json` or `GAS_WEBAPP_URL` at
`apps/salon-portfolio`'s resources, or vice versa — the two are
independently provisioned on purpose, to prove the architecture is
reusable across business types with zero shared state.

## Backend (GAS) setup

1. **Create a new Google Apps Script project** (either standalone or
   bound to a new Google Spreadsheet you've created for this app) and
   note its script ID.

2. **Authenticate clasp**, if you haven't already on this machine:

   ```bash
   npx clasp login
   ```

3. **Configure `.clasp.json`** in `apps/hair-salon-portfolio/gas/`. Copy
   the committed example and fill in your real script ID:

   ```bash
   cp apps/hair-salon-portfolio/gas/.clasp.json.example \
      apps/hair-salon-portfolio/gas/.clasp.json
   ```

   Then edit `.clasp.json` and replace `REPLACE_WITH_YOUR_APPS_SCRIPT_PROJECT_ID`
   with your real script ID (`gas/.clasp.json.example:2`). The `rootDir`
   should stay `"build"` — that's where the bundler output goes
   (`gas/.clasp.json.example:3`).

4. **Set the two required Script Properties** in the Apps Script editor
   (Project Settings → Script Properties) before the backend can serve any
   request:
   - `SPREADSHEET_ID` — the ID of the Google Spreadsheet holding your 9
     sheet tabs. Required by every sheet read/write; without it every
     request fails with `Script Property "SPREADSHEET_ID" is not set.`
     (`gas/src/Sheets.ts:17-29`).
   - `SITE_BASE_URL` — the public base URL of your deployed Next.js site
     (e.g. `https://atelier-ito.example.com`), used to build the
     cancellation link included in reservation confirmation emails
     (`gas/src/RuntimeProperties.ts:6-12`, `gas/src/Api.ts:479-489`).

5. **Build and push the backend code:**

   ```bash
   cd apps/hair-salon-portfolio/gas
   npm install
   npm run push
   ```

   `npm run push` runs the esbuild bundle first and then `clasp push`
   (`gas/package.json`'s `"push"` script: `"npm run build && clasp push"`).

6. **Deploy as a Web App** from the Apps Script editor (Deploy → New
   deployment → Web app), and copy the resulting Web App URL — this is
   the `GAS_WEBAPP_URL` the frontend needs (see below).

7. **Seed the spreadsheet once.** In the Apps Script editor, select the
   `setupDemoSheets` function from the function dropdown and click Run.
   This creates all 9 tabs with the correct headers, and pre-fills
   CONFIG/HOLIDAYS/SERVICES/STAFF with the atelier ito demo data
   (`gas/src/SetupDemoSheets.ts`). It never overwrites or deletes a sheet
   that already exists — safe to run again later, it just skips anything
   already there (`gas/src/SetupDemoSheets.ts:5-7`). After seeding, edit
   the CONFIG rows (especially `business.email`, `email.ownerNotifyAddress`,
   `calendar.id`, and the `hours.*` rows) to match the real business
   before going live — see `config-and-sheets-guide.md` and
   `owner-guide.md`.

## Frontend (Next.js) setup

1. Copy the example env file and fill in real values for your deployment
   environment (local `.env.local`, or your hosting provider's environment
   variable settings):

   ```bash
   cp apps/hair-salon-portfolio/web/.env.example \
      apps/hair-salon-portfolio/web/.env.local
   ```

2. Set the two variables (`web/.env.example:1-13`):
   - `GAS_WEBAPP_URL` — the Web App URL from step 6 above.
   - `SALON_DESIGN_PRESET` — set to `starter` for atelier ito (the
     Hero+Menu+Reservation-CTA+Contact composition this app ships with).

   **Both must be set as plain (non-public) environment variables — never
   prefix either with `NEXT_PUBLIC_`.** `GAS_WEBAPP_URL` is read only
   server-side by `web/lib/api/gasClient.ts`, and `SALON_DESIGN_PRESET` is
   read only server-side by `web/lib/config/designConfig.ts`
   (`web/.env.example:5-6,11-12`). Prefixing either with `NEXT_PUBLIC_`
   would bundle it into client-side JavaScript and expose it in the
   browser.

3. Deploy the Next.js app to Vercel (or your chosen host), setting
   `GAS_WEBAPP_URL` and `SALON_DESIGN_PRESET` in that platform's
   environment variable settings for the deployment — not by committing
   `.env.local`.

   If `GAS_WEBAPP_URL` is left unset, the site automatically falls back to
   local/demo mode using `config/demo-content.ts` (`web/.env.example:2-3`)
   — useful for previewing the design without a live backend, but not
   what you want for a real production deployment.

## Never commit real secrets

- **Never commit a real `.clasp.json`.** It contains your actual Apps
  Script project ID. It is gitignored — confirmed at
  `apps/hair-salon-portfolio/gas/.gitignore` (`.clasp.json` is listed with
  the comment "contains a real Apps Script project id (per-environment
  secret, never shared)"). Only `.clasp.json.example` (a template with a
  placeholder ID) is committed.
- **Never commit a real `.env.local`** (or any `.env*` file other than
  `.env.example`). It is gitignored — confirmed at
  `apps/hair-salon-portfolio/web/.gitignore`, which excludes `.env*` and
  then explicitly re-allows only `!.env.example`.
- If either file is ever accidentally committed, treat the contained
  script ID / URL as compromised: rotate it (new Apps Script deployment
  and/or new environment values) rather than just deleting the file from
  a later commit.

## Related docs

- `config-and-sheets-guide.md` — full CONFIG key reference and sheet
  schemas.
- `owner-guide.md` — plain-language guide for the salon owner to make
  day-to-day changes via the spreadsheet, no developer needed.
