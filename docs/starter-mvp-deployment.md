# Starter MVP — Deployment Quick Reference

Concrete steps for deploying `apps/salon-portfolio` (web on Vercel, backend
on Google Apps Script). The architecture/ownership rationale already lives
in `phase0-specification.md` §R/§S — this doc is the step-by-step
complement for a Starter MVP customer deployment.

## 1. GAS backend (deploy first — the web build needs its URL)

```bash
cd apps/salon-portfolio/gas
npm install
npm run build      # esbuild -> build/Code.js
npx clasp login     # once per machine, using the customer's Google account
npx clasp push
```

Then, in the Apps Script editor (script.google.com):

1. **Project Settings → Script Properties**: add `SPREADSHEET_ID` (the
   target Google Sheet's ID) and `SITE_BASE_URL` (the Vercel deployment
   URL from step 2 — the cancellation link in booking emails needs this).
2. Run `setupDemoSheets` once from the function dropdown to create all
   nine sheet tabs.
3. **Deploy → New deployment → Web app**. Execute as: *Me* (the
   deploying account — this is who booking/inquiry emails are sent from).
   Who has access: *Anyone*.
4. Copy the resulting `/exec` URL — this is `GAS_WEBAPP_URL` for step 2.

Editing `gas/src/*.ts` later requires repeating `npm run build` →
`clasp push` → creating a **new** deployment version (Deploy → Manage
deployments → Edit → New version) — pushing alone does not update an
already-published Web App URL's live code.

## 2. Web frontend (Vercel)

1. Import the repo into Vercel, with `apps/salon-portfolio/web` as the
   project root directory.
2. Build command: `next build` (Vercel's Next.js preset detects this
   automatically — no override needed). Output: `.next`.
3. **Project Settings → Environment Variables**, add:
   - `GAS_WEBAPP_URL` — the `/exec` URL from step 1. Server-only; never
     prefix with `NEXT_PUBLIC_`. Leaving this unset makes the site fail
     loudly in production (`runtime-error` status) rather than silently
     serving demo content — see `runtime-config-guide.md`.
   - `SALON_DESIGN_PRESET` (optional) — one of `kinari` / `femme` /
     `noir` / `editorial` / `natural` / `modern` / `starter`. Defaults to
     `kinari` if unset or invalid.
4. Deploy. Every subsequent `git push` to the connected branch
   redeploys automatically.

## Where to configure "form URLs" (there are none)

This Starter MVP does not use Google Forms — Booking and Inquiry are both
custom on-site flows that call the GAS Web App directly (see
`reservation-transaction-architecture.md` and the Inquiry implementation
added alongside this doc). The single connection point to configure is
`GAS_WEBAPP_URL` above; there is no separate "booking form URL" /
"inquiry form URL" to wire into buttons.

## Retargeting to a different business type

No redeploy of code is needed to change business type — only `CONFIG`
sheet values (see `config-and-sheets-guide.md`) and, optionally,
`SALON_DESIGN_PRESET=starter` for the minimal 3-section layout. See
`owner-guide.md`'s "他の業種に切り替える場合" section for the exact
field list.
