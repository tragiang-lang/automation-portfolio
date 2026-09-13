# Site Report Task 1 — Foundation Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note for this run:** executed inline, in the same session that
> wrote this plan, without per-task subagent dispatch or interactive
> checkpoints — the requesting task spec (see repo root conversation) asks
> for one final structured report at the end (its §18), not incremental
> approval gates. Steps are still tracked and verified in order.

**Goal:** Establish the independent `apps/site-report/` foundation (web +
gas scaffolds, construction-domain model/schema types, shared-convention
reuse) with zero business-workflow logic, per the calling task's Task 1
spec — no `GET_SITES`, no `SUBMIT_REPORT`, no LIFF.

**Architecture:** Mirror `apps/salon-portfolio`'s per-app tooling exactly
(own `package.json`/`tsconfig`/`esbuild`/`clasp`/`jest` per side — this repo
has no workspace/monorepo tooling and no `packages/` directory at all).
Reuse conventions (ApiResponse envelope shape, RowMapper header-mapping
helpers, SheetSchemas header-list-plus-row-type pattern, ID/timestamp
utility style) by writing site-report's own copies inside its own project,
not by importing across `apps/` — there is no shared package to import
from, and creating one is explicitly out of scope for this task (see
Finding 1 below).

**Tech Stack:** TypeScript, Google Apps Script (`@types/google-apps-script`,
esbuild, clasp, Jest+ts-jest) for `gas/`; Next.js 16 (App Router) + React 19
+ Jest for `web/` — exact same versions already pinned in
`apps/salon-portfolio`.

**Spec:** The calling conversation's "Task 1 — Site Report MVP Foundation /
Monorepo Scaffold" task prompt (not a separate file in this repo — the full
text is in the session that produced this plan). This plan implements only
its Task 1 scope.

## Global Constraints (from the spec)

- No business workflow logic: no `GET_SITES`, `SUBMIT_REPORT`, LIFF
  init/auth, report form, photo upload, Drive upload, Gmail notification,
  report ID *production workflow*, admin dashboard, history, PDF, AI,
  estimate generation, Supabase, or LINE notification.
- No salon domain logic reused (Reservation/CustomerInquiry/Menu/Staff/
  Gallery/salon design presets) — only generic technical infrastructure.
- No cross-contamination: zero unintended changes under
  `apps/salon-portfolio/`.
- No new secrets/credentials committed; no LINE Channel Secret or Google
  credentials in frontend code.
- Do not introduce a new build system; reuse the existing per-app
  TypeScript/esbuild/clasp/Jest and Next.js/ESLint/Jest conventions.
- Do not add dependencies beyond what the scaffold actually needs.
- Empty placeholder files are not preferred; only create a file when it's
  needed for compilation/configuration or is clearly established
  architecture (i.e. has a direct precedent already shipped in
  `apps/salon-portfolio`).
- Every new/modified file must end up covered by the git diff audit in
  Task F below.

---

## Finding 1 — `packages/gas-core` does not exist (read this before Task A)

The calling task assumes a `packages/gas-core` (and possibly
`packages/line-core`/`packages/liff-core`) already exists in this repo.
Repository inspection (this session) found:

- No root `package.json`, no workspace/monorepo config of any kind (no
  `workspaces` field, no lerna/turborepo/pnpm-workspace file).
- No `packages/` directory anywhere in the repo.
- `docs/architecture-overview.md` §"Why no shared `packages/` yet" states
  this is a *deliberate* Phase 0 decision: "`packages/` is intentionally
  deferred until the reusable core is *extracted* from a working Project 1,
  not designed up front."
- `README.md` states `salon-portfolio` is "the only project scaffolded so
  far."

So `apps/salon-portfolio/gas` and `apps/salon-portfolio/web` are each
independent, self-contained projects — own `package.json`, own
`node_modules`, own `tsconfig.json`, own test runner config. There is
nothing under `packages/` to import.

**Decision:** Task 1 follows the existing repo convention exactly:
`apps/site-report/{gas,web}` become a second, fully independent pair of
projects, with their own tooling files. Where a salon-portfolio module is
generic enough to be safely reused (verified per-file below), its content
is copied into site-report's own tree — not imported cross-`apps/` (no
mechanism exists for that) and not extracted into a new `packages/`
directory (extracting shared code now would require touching
`apps/salon-portfolio` files, which is out of scope for a "don't touch
salon" Task 1, and would also contradict the repo's own documented
decision to defer that extraction). This is flagged again in the final
report's Reuse Decisions table and Recommended Next Task.

---

## Task A: GAS project tooling scaffold

**Files:**
- Create: `apps/site-report/gas/package.json`
- Create: `apps/site-report/gas/tsconfig.json`
- Create: `apps/site-report/gas/esbuild.config.js`
- Create: `apps/site-report/gas/jest.config.js`
- Create: `apps/site-report/gas/appsscript.json`
- Create: `apps/site-report/gas/.clasp.json.example`
- Create: `apps/site-report/gas/.gitignore`

**Interfaces:** Produces: a `npm run build` / `npm test` / `npm run
typecheck` / `npm run push` toolchain identical in shape to
`apps/salon-portfolio/gas`, entry point `src/index.ts` (not `Code.ts` — the
calling spec's target tree names it `index.ts`).

- [ ] **Step 1: Write `package.json`** — copy
  `apps/salon-portfolio/gas/package.json` verbatim except `name` →
  `"site-report-gas"` and `description` → a site-report-specific line; keep
  every dependency version identical (no reason to drift).

- [ ] **Step 2: Write `tsconfig.json`** — byte-identical to
  `apps/salon-portfolio/gas/tsconfig.json` (target ES2019, strict, rootDir
  `src`, outDir `build`).

- [ ] **Step 3: Write `esbuild.config.js`** — same as salon's, with
  `entryPoints: ["src/index.ts"]` (only line that differs).

- [ ] **Step 4: Write `jest.config.js`** — byte-identical to salon's
  (`ts-jest` preset, `roots: ["<rootDir>/tests"]`).

- [ ] **Step 5: Write `appsscript.json`** — byte-identical shape to
  salon's (`Asia/Tokyo`, V8 runtime, `webapp.access: ANYONE_ANONYMOUS`,
  `executeAs: USER_DEPLOYING`) — these are placeholders, not a real
  deployed manifest.

- [ ] **Step 6: Write `.clasp.json.example`** — same placeholder shape as
  salon's (`scriptId: "REPLACE_WITH_YOUR_APPS_SCRIPT_PROJECT_ID"`,
  `rootDir: "build"`). Real `.clasp.json` stays gitignored, never created.

- [ ] **Step 7: Write `.gitignore`** — byte-identical to salon's gas
  `.gitignore` (`/node_modules`, `/build`, `.clasp.json`, `.clasprc.json`,
  `*.tsbuildinfo`).

- [ ] **Step 8: Commit** (after Task B lands real source files — an
  esbuild config with no `src/index.ts` yet can't build, so this task's
  commit is combined with Task B's in the actual execution log below).

---

## Task B: GAS domain models + Health + entrypoint

**Files:**
- Create: `apps/site-report/gas/src/models/Site.ts`
- Create: `apps/site-report/gas/src/models/Worker.ts`
- Create: `apps/site-report/gas/src/models/Report.ts`
- Create: `apps/site-report/gas/src/models/ReportPhoto.ts`
- Create: `apps/site-report/gas/src/Health.ts`
- Create: `apps/site-report/gas/src/index.ts`
- Test: `apps/site-report/gas/tests/Health.test.ts`
- Test: `apps/site-report/gas/tests/models.test.ts`

**Interfaces:**
- Produces: `Site`, `Worker`, `SiteReport`, `ReportPhoto` types (exact
  shapes from the calling spec §5); `getHealthStatus(): { status: "ok",
  service: "site-report-gas", timestamp: string }`; `doGet` GAS entrypoint.

- [ ] **Step 1: Write `models/Site.ts`**

```typescript
/** Construction site master record (site-report MVP — see calling task
 *  spec §5). Independent from any salon domain type. */
export interface Site {
  siteId: string;
  siteCode: string;
  name: string;
  address?: string;
  clientName?: string;
  status: "ACTIVE" | "INACTIVE";
}
```

- [ ] **Step 2: Write `models/Worker.ts`**

```typescript
/** LINE-linked field worker record (site-report MVP — see calling task
 *  spec §5). Independent from any salon domain type. */
export interface Worker {
  workerId: string;
  lineUserId: string;
  displayName: string;
  email?: string;
  role?: string;
  status: "ACTIVE" | "INACTIVE";
}
```

- [ ] **Step 3: Write `models/Report.ts`**

```typescript
/** A submitted site report (site-report MVP — see calling task spec §5).
 *  `status` is a literal union of one because Task 1 establishes only the
 *  shape a submitted report has; no other status is produced by any
 *  workflow yet. Independent from any salon domain type. */
export interface SiteReport {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: "SUBMITTED";
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Write `models/ReportPhoto.ts`**

```typescript
/** A photo attached to a SiteReport, once uploaded to Drive (site-report
 *  MVP — see calling task spec §5). Independent from any salon domain
 *  type. */
export interface ReportPhoto {
  photoId: string;
  reportId: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}
```

- [ ] **Step 5: Write failing test `tests/models.test.ts`**

```typescript
import { Site } from "../src/models/Site";
import { Worker } from "../src/models/Worker";
import { SiteReport } from "../src/models/Report";
import { ReportPhoto } from "../src/models/ReportPhoto";

// Compilation-level foundation tests (calling spec §12): each model's
// shape is exercised by constructing one minimal and one fully-populated
// valid value. A shape regression (renamed/removed required field) fails
// these at compile time before Jest even runs.
describe("construction domain model shapes", () => {
  it("accepts a minimal Site and a fully-populated Site", () => {
    const minimal: Site = { siteId: "STE-1", siteCode: "S001", name: "Site A", status: "ACTIVE" };
    const full: Site = { siteId: "STE-1", siteCode: "S001", name: "Site A", address: "Tokyo", clientName: "Acme", status: "INACTIVE" };
    expect(minimal.status).toBe("ACTIVE");
    expect(full.clientName).toBe("Acme");
  });

  it("accepts a minimal Worker and a fully-populated Worker", () => {
    const minimal: Worker = { workerId: "WRK-1", lineUserId: "U123", displayName: "Taro", status: "ACTIVE" };
    const full: Worker = { workerId: "WRK-1", lineUserId: "U123", displayName: "Taro", email: "t@example.com", role: "foreman", status: "ACTIVE" };
    expect(minimal.status).toBe("ACTIVE");
    expect(full.role).toBe("foreman");
  });

  it("accepts a minimal SiteReport and a fully-populated SiteReport", () => {
    const minimal: SiteReport = {
      reportId: "RPT-1", siteId: "STE-1", lineUserId: "U123", workerName: "Taro",
      reportDate: "2026-09-12", workType: "wiring", photoCount: 0, status: "SUBMITTED",
      createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z",
    };
    const full: SiteReport = { ...minimal, workerId: "WRK-1", comment: "done" };
    expect(minimal.status).toBe("SUBMITTED");
    expect(full.comment).toBe("done");
  });

  it("accepts a minimal ReportPhoto", () => {
    const photo: ReportPhoto = {
      photoId: "PHO-1", reportId: "RPT-1", fileId: "F1", fileUrl: "https://drive.google.com/x",
      fileName: "photo.jpg", mimeType: "image/jpeg", createdAt: "2026-09-12T00:00:00.000Z",
    };
    expect(photo.mimeType).toBe("image/jpeg");
  });
});
```

- [ ] **Step 6: Write `Health.ts`**

```typescript
/**
 * Pure liveness-check payload. No GAS globals, no Sheets/Drive/Gmail
 * calls — kept separate from index.ts purely so it is Jest-testable, same
 * convention as apps/salon-portfolio/gas/src/Health.ts.
 */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "site-report-gas",
    timestamp: new Date().toISOString(),
  };
}
```

- [ ] **Step 7: Write failing test `tests/Health.test.ts`**

```typescript
import { getHealthStatus } from "../src/Health";

describe("getHealthStatus", () => {
  it("reports ok status for this service", () => {
    const result = getHealthStatus();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("site-report-gas");
  });

  it("returns a valid ISO 8601 timestamp", () => {
    const result = getHealthStatus();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
```

- [ ] **Step 8: Run tests, expect PASS (models/Health need no prior impl —
  they ARE the impl)**

Run: `cd apps/site-report/gas && npm install && npm test`

- [ ] **Step 9: Write `index.ts`** (doGet liveness entrypoint only — no
  `doPost`/action dispatch yet, since no action handler exists in Task 1;
  adding a dispatcher with nothing real to route to would be exactly the
  kind of "fake business logic" the calling spec forbids)

```typescript
import { getHealthStatus } from "./Health";

/**
 * doGet liveness entrypoint only (Task 1 foundation). No doPost/action
 * dispatch yet — Api.ts's ApiRequest/ApiResponse envelope exists (see
 * Task C) but has no action handler wired to it until a later task
 * implements GET_SITES/SUBMIT_REPORT. Mirrors
 * apps/salon-portfolio/gas/src/Code.ts's Phase-1-era doGet-only shape.
 */
function doGet(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: getHealthStatus() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// esbuild bundles this file into an IIFE, so top-level function
// declarations are not visible to the Apps Script trigger runtime unless
// explicitly attached to the real global object (same as salon's Code.ts).
(globalThis as unknown as { doGet: typeof doGet }).doGet = doGet;
```

- [ ] **Step 10: Run build + typecheck, expect PASS**

Run: `cd apps/site-report/gas && npm run build && npm run typecheck`

- [ ] **Step 11: Commit**

```bash
git add apps/site-report/gas
git commit -m "feat(site-report): scaffold gas project with domain models and health check"
```

---

## Task C: GAS API envelope, Config type, Sheet schema, RowMapper reuse

**Files:**
- Create: `apps/site-report/gas/src/Api.ts`
- Create: `apps/site-report/gas/src/Config.ts`
- Create: `apps/site-report/gas/src/SheetNames.ts`
- Create: `apps/site-report/gas/src/SheetSchemas.ts`
- Create: `apps/site-report/gas/src/RowMapper.ts`
- Test: `apps/site-report/gas/tests/Config.test.ts`
- Test: `apps/site-report/gas/tests/SheetSchemas.test.ts`
- Test: `apps/site-report/gas/tests/RowMapper.test.ts`

**Interfaces:**
- Consumes: nothing from Task B.
- Produces: `ApiRequest`/`ApiResponse<T>` envelope types; `SITE_REPORT_CONFIG_KEYS`
  constant + `SiteReportConfig` type; `SHEET_NAMES`/`SheetName`;
  per-sheet `*_HEADERS` + row interfaces + `REQUIRED_HEADERS`;
  `buildHeaderMap`/`assertRequiredHeaders`/`rowsToObjects`/`objectToRow`/
  `findRowIndexByColumnValue`/`MissingHeadersError` — all consumed by a
  later task's real Sheets repository, none called from any file in this
  task.

- [ ] **Step 1: Write `Api.ts`** (envelope types only — no dispatcher, no
  action handlers; reuses the exact shape of
  `apps/salon-portfolio/gas/src/models/Api.ts`, generalized off any
  salon-specific `ErrorCode` import)

```typescript
/** Shared request/response envelope for every future action (same shape
 *  as apps/salon-portfolio/gas/src/models/Api.ts's ApiRequest/ApiResponse
 *  — generic, no salon coupling). No action is implemented against this
 *  envelope yet; a later task adds handleApiRequest + real action
 *  handlers (GET_SITES/SUBMIT_REPORT), same as salon's Api.ts grew
 *  action-by-action across several phases. */
export interface ApiRequest {
  action: string;
  payload?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

- [ ] **Step 2: Write `Config.ts`** (typed shape + the 4 required keys —
  no Sheets-reading implementation; that repository/parser/validator layer
  is the next task's explicit deliverable)

```typescript
/**
 * Typed CONFIG shape for site-report (calling task spec §7). Mirrors the
 * salon project's models/Config.ts convention: a small typed surface plus
 * the raw sheet key names, with no Sheets-reading logic here — reading
 * CONFIG from a real spreadsheet, parsing, and validating is Task 2's
 * "GAS Config + Sheets Schema Foundation" deliverable, not this one's.
 */
export interface SiteReportConfig {
  businessName: string;
  adminEmail: string;
  driveRootFolderId: string;
  timezone: string;
}

/** Raw CONFIG-sheet key names (calling task spec §7) — the `Key` column
 *  values a future ConfigStore reads, in the same style as
 *  apps/salon-portfolio/gas/src/models/Config.ts's RawConfigMap keys. */
export const SITE_REPORT_CONFIG_KEYS = {
  BUSINESS_NAME: "BUSINESS_NAME",
  ADMIN_EMAIL: "ADMIN_EMAIL",
  DRIVE_ROOT_FOLDER_ID: "DRIVE_ROOT_FOLDER_ID",
  TIMEZONE: "TIMEZONE",
} as const;

export type SiteReportConfigKey =
  (typeof SITE_REPORT_CONFIG_KEYS)[keyof typeof SITE_REPORT_CONFIG_KEYS];
```

- [ ] **Step 3: Write failing test `tests/Config.test.ts`**

```typescript
import { SITE_REPORT_CONFIG_KEYS, SiteReportConfig } from "../src/Config";

describe("SITE_REPORT_CONFIG_KEYS", () => {
  it("defines exactly the four keys from the calling spec", () => {
    expect(Object.values(SITE_REPORT_CONFIG_KEYS).sort()).toEqual(
      ["ADMIN_EMAIL", "BUSINESS_NAME", "DRIVE_ROOT_FOLDER_ID", "TIMEZONE"].sort(),
    );
  });

  it("SiteReportConfig accepts a fully-populated value", () => {
    const config: SiteReportConfig = {
      businessName: "Acme Construction",
      adminEmail: "admin@example.com",
      driveRootFolderId: "1AbCdEf",
      timezone: "Asia/Tokyo",
    };
    expect(config.timezone).toBe("Asia/Tokyo");
  });
});
```

- [ ] **Step 4: Write `SheetNames.ts`**

```typescript
/**
 * Canonical Google Sheets tab names for site-report (calling task spec
 * §6). Every reference to a sheet by name must go through this constant —
 * same convention as apps/salon-portfolio/gas/src/SheetNames.ts.
 */
export const SHEET_NAMES = {
  CONFIG: "CONFIG",
  SITES: "SITES",
  WORKERS: "WORKERS",
  REPORTS: "REPORTS",
  REPORT_PHOTOS: "REPORT_PHOTOS",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];
```

- [ ] **Step 5: Write `SheetSchemas.ts`** (headers + row interfaces +
  `REQUIRED_HEADERS`, per calling spec §6 — schema definitions only, no
  CRUD)

```typescript
import { SHEET_NAMES, SheetName } from "./SheetNames";

/** CONFIG: human-editable key/value rows (calling task spec §6/§7). */
export const CONFIG_HEADERS = ["Key", "Value"] as const;
export interface ConfigRow {
  Key: unknown;
  Value: unknown;
}

/** SITES: construction site master (calling task spec §6). */
export const SITES_HEADERS = [
  "siteId",
  "siteCode",
  "name",
  "address",
  "clientName",
  "status",
  "startDate",
  "endDate",
  "createdAt",
  "updatedAt",
] as const;
export interface SiteRow {
  siteId: string;
  siteCode: string;
  name: string;
  address?: string;
  clientName?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** WORKERS: LINE-linked field worker master (calling task spec §6). */
export const WORKERS_HEADERS = [
  "workerId",
  "lineUserId",
  "displayName",
  "email",
  "role",
  "status",
  "createdAt",
  "updatedAt",
] as const;
export interface WorkerRow {
  workerId: string;
  lineUserId: string;
  displayName: string;
  email?: string;
  role?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** REPORTS: persisted site report records (calling task spec §6). Schema
 *  only — no code path writes to this sheet yet (Task 1 scope rule). */
export const REPORTS_HEADERS = [
  "reportId",
  "siteId",
  "workerId",
  "lineUserId",
  "workerName",
  "reportDate",
  "workType",
  "comment",
  "photoCount",
  "status",
  "createdAt",
  "updatedAt",
] as const;
export interface ReportRow {
  reportId: string;
  siteId: string;
  workerId?: string;
  lineUserId: string;
  workerName: string;
  reportDate: string;
  workType: string;
  comment?: string;
  photoCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** REPORT_PHOTOS: photos attached to a report (calling task spec §6).
 *  Schema only. */
export const REPORT_PHOTOS_HEADERS = [
  "photoId",
  "reportId",
  "fileId",
  "fileUrl",
  "fileName",
  "mimeType",
  "createdAt",
] as const;
export interface ReportPhotoRow {
  photoId: string;
  reportId: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

/** Required headers per sheet, keyed by canonical sheet name — used for
 *  missing-header detection before any row mapping (same convention as
 *  apps/salon-portfolio/gas/src/SheetSchemas.ts's REQUIRED_HEADERS). */
export const REQUIRED_HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET_NAMES.CONFIG]: CONFIG_HEADERS,
  [SHEET_NAMES.SITES]: SITES_HEADERS,
  [SHEET_NAMES.WORKERS]: WORKERS_HEADERS,
  [SHEET_NAMES.REPORTS]: REPORTS_HEADERS,
  [SHEET_NAMES.REPORT_PHOTOS]: REPORT_PHOTOS_HEADERS,
};
```

- [ ] **Step 6: Write failing test `tests/SheetSchemas.test.ts`**

```typescript
import { SHEET_NAMES } from "../src/SheetNames";
import {
  CONFIG_HEADERS,
  REQUIRED_HEADERS,
  SITES_HEADERS,
  WORKERS_HEADERS,
  REPORTS_HEADERS,
  REPORT_PHOTOS_HEADERS,
} from "../src/SheetSchemas";

describe("SheetSchemas", () => {
  it("defines exactly the five sheets from the calling task spec §6", () => {
    expect(Object.keys(SHEET_NAMES).sort()).toEqual(
      ["CONFIG", "REPORTS", "REPORT_PHOTOS", "SITES", "WORKERS"].sort(),
    );
  });

  it("has a REQUIRED_HEADERS entry for every sheet name", () => {
    Object.values(SHEET_NAMES).forEach((name) => {
      expect(REQUIRED_HEADERS[name]).toBeDefined();
      expect(REQUIRED_HEADERS[name].length).toBeGreaterThan(0);
    });
  });

  it("CONFIG has Key/Value columns", () => {
    expect(CONFIG_HEADERS).toEqual(["Key", "Value"]);
  });

  it("SITES/WORKERS/REPORTS/REPORT_PHOTOS match the spec's column lists", () => {
    expect(SITES_HEADERS).toEqual([
      "siteId", "siteCode", "name", "address", "clientName", "status", "startDate", "endDate", "createdAt", "updatedAt",
    ]);
    expect(WORKERS_HEADERS).toEqual([
      "workerId", "lineUserId", "displayName", "email", "role", "status", "createdAt", "updatedAt",
    ]);
    expect(REPORTS_HEADERS).toEqual([
      "reportId", "siteId", "workerId", "lineUserId", "workerName", "reportDate", "workType", "comment", "photoCount", "status", "createdAt", "updatedAt",
    ]);
    expect(REPORT_PHOTOS_HEADERS).toEqual([
      "photoId", "reportId", "fileId", "fileUrl", "fileName", "mimeType", "createdAt",
    ]);
  });
});
```

- [ ] **Step 7: Copy `RowMapper.ts` verbatim** from
  `apps/salon-portfolio/gas/src/RowMapper.ts` to
  `apps/site-report/gas/src/RowMapper.ts` — zero changes; the module has no
  salon-specific reference (verified during inspection: it operates only
  on `unknown[]`/`Record<string, unknown>`, no domain import).

- [ ] **Step 8: Copy `RowMapper.test.ts` verbatim** from
  `apps/salon-portfolio/gas/tests/RowMapper.test.ts` to
  `apps/site-report/gas/tests/RowMapper.test.ts` — same reasoning as Step 7.

- [ ] **Step 9: Run tests, expect PASS**

Run: `cd apps/site-report/gas && npm test`

- [ ] **Step 10: Run build + typecheck, expect PASS**

Run: `cd apps/site-report/gas && npm run build && npm run typecheck`

- [ ] **Step 11: Commit**

```bash
git add apps/site-report/gas
git commit -m "feat(site-report): add API envelope, config type, sheet schema, and reused RowMapper"
```

---

## Task D: Web project minimal scaffold

**Files:**
- Create: `apps/site-report/web/package.json`
- Create: `apps/site-report/web/tsconfig.json`
- Create: `apps/site-report/web/next.config.ts`
- Create: `apps/site-report/web/eslint.config.mjs`
- Create: `apps/site-report/web/jest.config.ts`
- Create: `apps/site-report/web/.gitignore`
- Create: `apps/site-report/web/app/layout.tsx`
- Create: `apps/site-report/web/app/page.tsx`
- Create: `apps/site-report/web/app/globals.css`
- Create: `apps/site-report/web/lib/utils/health.ts`
- Create: `apps/site-report/web/app/api/health/route.ts`
- Test: `apps/site-report/web/app/api/health/route.test.ts`

**Interfaces:** Produces: a buildable/testable Next.js App Router shell —
one placeholder home page, `GET /api/health` liveness route. No LIFF, no
report UI, no `lib/api`/`lib/liff`/`lib/validation`/`types/` content yet
(calling spec §4/§16: create those directories only when a later task adds
real content — an empty dir isn't created since git doesn't track it and
the spec prefers no placeholder files).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "site-report-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "16.3.4",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.4",
    "jest": "^30.5.1",
    "jest-environment-jsdom": "^30.5.1",
    "typescript": "^5"
  }
}
```

(Deliberately omits `@testing-library/*` and Tailwind — Task 1 has no
component under test and no styled UI yet, so both would be unused
dependencies per the calling spec's "no unnecessary dependencies" rule.)

- [ ] **Step 2: Write `tsconfig.json`** — byte-identical to
  `apps/salon-portfolio/web/tsconfig.json`.

- [ ] **Step 3: Write `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

(No image format tuning yet — that was a salon-specific Phase 2A/2C
decision for photo-heavy sections that don't exist here yet.)

- [ ] **Step 4: Write `eslint.config.mjs`**

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

- [ ] **Step 5: Write `jest.config.ts`** — byte-identical to salon's
  (`next/jest` wrapper, `testEnvironment: "jsdom"`), minus
  `setupFilesAfterEnv` (no `jest.setup.ts` needed yet — nothing uses
  `IntersectionObserver` or `@testing-library/jest-dom` matchers).

```typescript
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
};

export default createJestConfig(config);
```

- [ ] **Step 6: Write `.gitignore`** — byte-identical to salon web's
  `.gitignore`.

- [ ] **Step 7: Write `lib/utils/health.ts`**

```typescript
/** Pure helper so the health check is unit-testable without a running
 *  server — same convention as
 *  apps/salon-portfolio/web/lib/utils/health.ts. */
export function getHealthStatus() {
  return {
    status: "ok" as const,
    service: "site-report-web",
    timestamp: new Date().toISOString(),
  };
}
```

- [ ] **Step 8: Write failing test `app/api/health/route.test.ts`**

```typescript
/**
 * @jest-environment node
 *
 * Route handlers rely on the Web Fetch API (Request/Response), which
 * jsdom does not provide but Node's own runtime does.
 */
import { GET } from "./route";

describe("GET /api/health", () => {
  it("responds with an ok status", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("site-report-web");
  });
});
```

- [ ] **Step 9: Write `app/api/health/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/utils/health";

/**
 * Minimal liveness endpoint (Task 1 foundation). No business logic, no
 * GAS proxy call yet — same convention as
 * apps/salon-portfolio/web/app/api/health/route.ts.
 */
export function GET() {
  return NextResponse.json(getHealthStatus());
}
```

- [ ] **Step 10: Write `app/globals.css`**

```css
:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

- [ ] **Step 11: Write `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "現場報告アプリ",
  description: "LIFF site report app — foundation scaffold (Task 1).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 12: Write `app/page.tsx`**

```tsx
/**
 * Placeholder home page — proves the App Router scaffold renders. No
 * report flow UI yet (Task 1 explicitly excludes it); see
 * apps/site-report/gas and this app's future app/report/* routes for
 * where that lands.
 */
export default function Home() {
  return (
    <main>
      <h1>現場報告アプリ</h1>
      <p>Foundation scaffold — report flow not implemented yet.</p>
    </main>
  );
}
```

- [ ] **Step 13: Run `npm install`, then tests, expect PASS**

Run: `cd apps/site-report/web && npm install && npm test`

- [ ] **Step 14: Run build + typecheck + lint, expect PASS**

Run: `cd apps/site-report/web && npm run build && npm run typecheck && npm run lint`

- [ ] **Step 15: Commit**

```bash
git add apps/site-report/web
git commit -m "feat(site-report): scaffold web project with health check and placeholder home page"
```

---

## Task E: Documentation

**Files:**
- Create: `docs/site-report-architecture-overview.md`
- Modify: `README.md` (root)
- Modify: `docs/folder-structure.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Write `docs/site-report-architecture-overview.md`** — short
  note covering: purpose, domain boundary (construction, independent from
  salon), the "no `packages/` yet" finding and how site-report reuses
  conventions instead, web/gas separation, current status (Task 1 only —
  no workflows), future API direction (`GET_SITES`/`SUBMIT_REPORT` land in
  later tasks).

- [ ] **Step 2: Update root `README.md`** — add a "Project 2:
  `site-report`" section (mirroring the existing `salon-portfolio` section
  structure: structure tree, prerequisites already covered by the shared
  Node.js section, per-app `npm install`/`build`/`test`/`typecheck`
  commands) so the README's install/run instructions stay accurate now
  that a second app exists — required by this repo's own documentation
  convention ("README updated whenever install/run instructions change").

- [ ] **Step 3: Update `docs/folder-structure.md`** — add the
  `apps/site-report/` tree (web + gas, matching what Task A-D actually
  created) alongside the existing `salon-portfolio` tree, so the file
  stays a truthful reflection of what's on disk (its own stated purpose).

- [ ] **Step 4: Commit**

```bash
git add docs/site-report-architecture-overview.md README.md docs/folder-structure.md
git commit -m "docs(site-report): add architecture note and update root docs for the new app"
```

---

## Task F: Verification and diff audit

- [ ] **Step 1: Re-run site-report gas checks** —
  `cd apps/site-report/gas && npm test && npm run build && npm run typecheck`
  — save output to `.evidence/<timestamp>-site-report-task1/gas-test.log`,
  `gas-build.log`, `gas-typecheck.log`.

- [ ] **Step 2: Re-run site-report web checks** —
  `cd apps/site-report/web && npm test && npm run build && npm run typecheck && npm run lint`
  — save output to the same evidence folder as `web-test.log`,
  `web-build.log`, `web-typecheck.log`, `web-lint.log`.

- [ ] **Step 3: Run existing salon-portfolio regression checks** —
  `cd apps/salon-portfolio/gas && npm test` (fast, full suite) — save as
  `salon-gas-test.log`. Note in the final report whether the full salon
  web suite was also run or only spot-checked, and why.

- [ ] **Step 4: Git diff audit** — run `git status --short`, `git diff
  --stat`, `git diff --name-only` from repo root; save to `status.txt` and
  `diff.patch` (full diff) in the evidence folder. Confirm every changed
  path is one of: `apps/site-report/**` (new), `docs/**` (new/modified per
  Task E), `README.md` (modified per Task E), or this plan file / evidence
  folder itself. Anything under `apps/salon-portfolio/**` or a root config
  file appearing in this diff is a stop-and-investigate condition, not
  something to report as expected.

- [ ] **Step 5: Produce the final structured report** per the calling
  task's §18 format (Summary, Repository Findings, Reuse Decisions table,
  Files Created/Modified/Deleted, Tests/Build results with exact commands
  and results, Salon Safety Check, gas-core Safety Check, Known
  Limitations, Recommended Next Task = Task 2 only).

---

## Self-Review Notes

- **Spec coverage:** Every calling-spec section (§2 domain boundary, §3
  reuse, §4 target structure minus deferred files, §5 domain models, §6
  sheet schema, §7 config, §8 GAS tooling, §9 web tooling, §10 package
  boundaries [none exist — Finding 1], §11 no cross-contamination, §12
  tests, §13 verification, §14 diff audit, §15 docs, §16 must-not-implement
  list, §17 DoD, §18 report format) is covered by Tasks A-F above.
- **Deliberately deferred** (named in the calling spec's own target tree
  but out of Task 1's scope per its "no fake business logic" rule and its
  own §18 recommendation that Task 2 = "GAS Config + Sheets Schema
  Foundation"): `Sites.ts`, `Workers.ts`, `Reports.ts`, `ReportPhotos.ts`,
  `DriveStorage.ts`, `MailNotifier.ts`, `IdGenerator.ts`, `Validation.ts`,
  `workflows/submitReportWorkflow.ts`, `ConfigStore`-equivalent (real
  Sheets-reading), any `web/components/*`, `web/lib/liff.ts`,
  `web/lib/api.ts`, `web/lib/validation.ts`, `web/types/*`, and all
  `app/report/*` routes. This list is repeated in the final report's Known
  Limitations section, not hidden.
- **Placeholder scan:** every code block above is complete, real content —
  no `TODO`/`fill in later`.
- **Type consistency:** `SiteReportConfig`/`SITE_REPORT_CONFIG_KEYS`
  (Task C) match the 4 keys named in calling spec §7 exactly;
  `REQUIRED_HEADERS` (Task C) keys match `SHEET_NAMES` (Task C) exactly;
  model field names (Task B) match calling spec §5 exactly.
