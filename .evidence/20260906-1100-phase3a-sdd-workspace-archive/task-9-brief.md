## Task 9: Wire `doPost` to the dispatcher

**Files:**
- Modify: `apps/salon-portfolio/gas/src/Code.ts`

**Interfaces:**
- Consumes: `handleApiRequest` from `./Api`.
- Produces: unchanged `doGet`/`doPost` global signatures (still attached to `globalThis` for the bundled IIFE, per the existing Phase 1 pattern).

Code.ts stays entrypoint-only (Phase 0 §B/§T): it extracts the raw POST body and hands it straight to `Api.ts`; it contains no parsing, routing, or business logic of its own. `doGet` is untouched — it remains the Phase 1 liveness check, unrelated to action dispatch (Phase 3A explicitly scopes only the `getConfig` action into `doPost`; `healthCheck` as an action is deferred).

- [ ] **Step 1: Replace the full contents of `Code.ts`**

```ts
import { getHealthStatus } from "./Health";
import { handleApiRequest } from "./Api";

/**
 * doGet/doPost entrypoints only — per the module boundary in the Phase 0
 * spec (§B/§T), Code.ts must not contain routing, validation, or any
 * business logic itself. doPost only extracts the raw request body and
 * hands it to Api.ts's handleApiRequest, which owns the action dispatch
 * (Phase 3A implements only the "getConfig" action; every other action
 * name currently returns a VALIDATION_ERROR — see Api.ts).
 */
function doGet(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: getHealthStatus() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  const rawBody = e?.postData?.contents;
  const response = handleApiRequest(rawBody);
  return ContentService.createTextOutput(
    JSON.stringify(response),
  ).setMimeType(ContentService.MimeType.JSON);
}

// esbuild bundles this file into an IIFE (see esbuild.config.js), so
// top-level function declarations are not visible to the Apps Script
// trigger runtime unless explicitly attached to the real global object.
(globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }).doGet =
  doGet;
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doPost = doPost;
```

- [ ] **Step 2: Confirm the existing Health test still passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Health.test.ts`
Expected: PASS — unaffected, since `getHealthStatus` itself is untouched.

- [ ] **Step 3: Typecheck**

Run: `cd apps/salon-portfolio/gas && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `cd apps/salon-portfolio/gas && npm run build`
Expected: PASS — `build/Code.js` is regenerated; `grep -c "doGet\|doPost" build/Code.js` shows both names still present in the bundle (esbuild inlines `Api.ts`/`ConfigStore.ts`/etc. into the single IIFE).

- [ ] **Step 5: Commit**

```bash
git add apps/salon-portfolio/gas/src/Code.ts
git commit -m "feat(gas): route doPost through the Api.ts action dispatcher"
```

---

