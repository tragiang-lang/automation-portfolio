# SDD ledger — plan: docs/superpowers/plans/2026-09-05-phase3a-gas-config-data-layer.md

Spec: docs/phase0-specification.md (authoritative for schema/naming; supersedes
the generic Phase 3A task-prompt examples wherever they differ).

Worktree: .claude/worktrees/phase3a-gas-config-data-layer, branch
`worktree-phase3a-gas-config-data-layer`, based on
`feature/salon-portfolio-phase2-ui` @ 84ec6fd (no remote configured; local
HEAD used as base per worktree.baseRef fallback).

Baseline: `apps/salon-portfolio/gas` — 2 tests passing (Health.test.ts),
confirmed after `npm install` in the worktree (node_modules is gitignored,
not present in a fresh worktree checkout).

## Preflight ruling — commit authorization (before any task dispatch)

The user's global rule (`evidence-reporting.md`) forbids `git commit` without
an explicit, literal "commit now" instruction in the latest message. The
subagent-driven-development process commits after every task to drive its
diff/review mechanics. Asked the user directly; resolution:

**Ruling: Implementers ARE authorized to run `git commit` for each task,
scoped strictly to this worktree's branch (`worktree-phase3a-gas-config-data-layer`) — never on the tracked `feature/salon-portfolio-phase2-ui` branch or any shared branch. Merging this branch back still requires the user's separate, explicit approval at the end (finishing-a-development-branch).** — Why: the SDD process's per-task review/fix-loop mechanics depend on git history (BASE/HEAD diffs, fix-round ranges); the isolated worktree branch is disposable and never touches the user's tracked work. — Cost if wrong: worst case is an extra disposable branch/worktree to delete; no risk to the user's tracked branch or any shared history.

## Preflight conflict scan

Scanned all 12 tasks in the plan for (a) any pair sharing a file/interface,
and (b) internal consistency between each task's own tests and its own
implementation code.

| # | Pair / Task | Shared file or interface | What was checked | Finding |
|---|---|---|---|---|
| 1 | Task 1 → Task 2 | `SheetNames.ts`, `RowMapper.ts` (buildHeaderMap) | Task 2's `Sheets.ts` imports `SheetName` and `buildHeaderMap`, both produced by Task 1 | Clean — sequential, no conflict |
| 2 | Task 1 → Task 7 | `SheetSchemas.ts` (CONFIG_HEADERS, HOLIDAYS_HEADERS, ConfigRow, HolidayRow) | Task 7's `ConfigStore.ts`/test use these exact names | Clean |
| 3 | Task 1 → Task 10 | `SheetNames.ts` (SHEET_NAMES), `SheetSchemas.ts` (REQUIRED_HEADERS, all `*_HEADERS`, ConfigRow, HolidayRow) | Task 10's `DemoSeed.ts`/test use these exact names | Clean |
| 4 | Task 2 → Task 7 | `Sheets.ts` (getSheet, getHeaderMap, readRawRows) | Task 7's `ConfigStore.getConfig()` calls these three functions with matching signatures | Clean |
| 5 | Task 2 → Task 10 | `Sheets.ts` (getConfiguredSpreadsheet) | Task 10's `SetupDemoSheets.ts` imports `getConfiguredSpreadsheet` — produced by Task 2 Step 1 | Clean |
| 6 | Task 3 → (ids/ReservationId.ts internal) | `Utils.ts` (formatDateYYYYMMDDInTokyo) | `ReservationId.ts` imports it from `"../Utils"` (relative path from `src/ids/` up to `src/`) | Clean — path is correct for the stated file locations |
| 7 | Task 4 → Task 5 | `models/Config.ts` (AppConfig, BUSINESS_HOURS_DAYS) | Task 5's `ConfigValidator.ts`/test use the same type/const | Clean |
| 8 | Task 4 → Task 6 | `models/Config.ts` (AppConfig, PublicConfig) | Task 6's `PublicConfig.ts`/test use the same types | Clean |
| 9 | Task 4,5 → Task 7 | `ConfigParser.ts` (buildRawConfigMap, parseAppConfig, ConfigFieldIssue), `ConfigValidator.ts` (validateAppConfig, ConfigValidationIssue) | Task 7's `ConfigStore.ts` imports and calls both exactly as signed | Clean |
| 10 | Task 4,6,7 → Task 8 | `ConfigStore.ts` (ConfigError, getConfig), `PublicConfig.ts` (buildPublicConfig), `models/Config.ts` (PublicConfig) | Task 8's `Api.ts`/test import all three consistently | Clean |
| 11 | Task 8 → Task 9 | `Api.ts` (handleApiRequest) | Task 9's `Code.ts` doPost calls `handleApiRequest(rawBody)` — matches signature `(rawBody: string \| undefined): ApiResponse` | Clean |
| 12 | **Task 9 ↔ Task 10** | `Code.ts` (both tasks modify this file) | Task 9 replaces the full file; Task 10 Step 6 adds one import + one `globalThis` block on top of Task 9's result | **Sequential dependency, not a conflict — Task 10 must run after Task 9 and its dispatch must include Task 9's final `Code.ts` content as context (the brief alone shows only the delta).** Ruling: no plan change needed; controller will paste Task 9's final Code.ts into Task 10's dispatch context. |
| 13 | **Global Constraints ↔ every task's Step "Commit"** | "Do NOT commit." (Global Constraints) vs. every task's final `git commit` step | Plan text is self-contradictory | **See preflight ruling above** — resolved with the user directly before Task 1. Global Constraints line in the plan document itself is stale/overtaken by this ruling; task-level commit steps stand, scoped to this worktree branch only. |
| 14 | Task 1 internal | `SheetSchemas.test.ts` vs `SheetSchemas.ts` | Header arrays, REQUIRED_HEADERS keys | Clean |
| 15 | Task 4 internal | `ConfigParser.test.ts` vs `ConfigParser.ts` | Function names/signatures (buildRawConfigMap, parseStrictBoolean/Number, parseNonEmptyString, parseJsonSafely, parseAppConfig) | Clean |
| 16 | Task 5 internal | `ConfigValidator.test.ts` uses `// @ts-expect-error` to assign an invalid `timezone` literal | `AppConfig.reservation.timezone` is typed as the literal `"Asia/Tokyo"`, so assigning `"UTC"` is a compile error without the suppression | Clean — the test's `@ts-expect-error` is correct, not a defect |
| 17 | Task 10 internal | `DemoSeed.test.ts` has two separate `import { ... } from "../src/SheetSchemas"` statements | Minor style-only duplication (not a bug — TS allows multiple import statements from one module) | Clean — noted as a style nit for the implementer to optionally consolidate; not worth a ruling |
| 18 | Task 10 internal | CONFIG demo rows (in `DemoSeed.ts`) vs `ConfigValidator.ts` rules (Task 5) | Manually traced every demo CONFIG value against every validator rule (timezone, ranges, hours format, holiday dates, email format, calendar.id non-empty, staffAnyAvailableOption/staffSelection combination) | Clean — demo data is valid end-to-end, matching the plan's own `DemoSeed.test.ts` assertion that it is |

No load-bearing conflicts found beyond the two ruled on above (both resolved
before Task 1 dispatch).

## Task log

Task 1: complete (commits 84ec6fd..5902592, review clean — spec ✅, quality Approved, 0 Critical/Important; 1 Minor noted for future consumers of ConfigRow's `unknown`-typed fields, no action needed; 1 ⚠️ unverifiable-from-diff item about TDD step ordering, not a code defect, no action needed).
Task 2: complete (commits 5902592..bcd3061, review clean — spec ✅, quality Approved, 0 issues).
Task 3: complete (commits bcd3061..170e8ce, review clean — spec ✅ incl. independently-verified UTC+9 boundary math and year-rollover check, quality Approved, 0 Critical/Important; 2 Minor deferred: generateRandomSuffix's undocumented [0,1) random contract, and the "not sequential" test could be strengthened with a same-random-same-output companion case — no action needed, not load-bearing).
Task 4: complete (commits 170e8ce..aeb95cb, review clean — spec ✅, reviewer independently re-ran tests/typecheck and traced all 24 required CONFIG keys through parseAppConfig by hand, quality Approved, 0 Critical/Important; 2 Minor deferred: imprecise issue-message wording for wrong-type-vs-missing, and the plan's own test only enumerates 2/24 missing-key cases individually — reviewer confirmed no underlying code gap, no action needed).
Task 5: complete (commits aeb95cb..994d9b1, review clean — spec ✅, reviewer hand-traced business-hours regex edge cases and Feb-30 date validation and confirmed both correct, quality Approved, 0 Critical/Important; 2 Minor deferred: evidence-file path in report used a non-standard location note, and calendarId non-empty check lacks a dedicated test case — no action needed).
Task 6: complete (commits 994d9b1..c4c4a95, review clean — spec ✅, reviewer confirmed explicit-field-list (fail-closed) pattern used, not spread-then-delete, quality Approved, 0 Critical/Important; 1 Minor deferred, out of this task's scope — models/Config.ts's PublicConfig type uses Omit (type-level denylist) rather than an explicit interface, noted for whoever owns Config.ts, no action needed since runtime behavior is unaffected).
Task 7: fix round n/a — implementer self-flagged a deviation from the brief's literal code (`rowsToObjects<ConfigRow>(...)` cast to `as unknown as ConfigRow[]`/`HolidayRow[]` instead of the brief's uncast generic call). Reviewer independently reproduced with the project's own tsc/tsconfig and confirmed: the brief's literal code does NOT compile, because `SheetSchemas.ts`'s `ConfigRow`/`HolidayRow` are declared as `interface` (Task 1, already committed/reviewed) which lack the index signature `RowMapper.ts`'s `T extends Record<string,unknown>` constraint requires; `tsc` itself recommends the exact double-cast used; confirmed the cast does not mask a real runtime shape mismatch (rowsToObjects builds objects keyed exactly by the passed columns). Ruling: accept the implementer's fix as correct — a plan defect (the brief's exact snippet doesn't type-check against Task 1's already-reviewed interfaces), not an implementer error; do not reopen Task 1 to convert `interface`→`type` since the current fix is safe, compiler-recommended, and every future sheet-row consumer of `rowsToObjects` will need the same pattern (worth a one-line comment if touched again, not worth a rework now). Cost if wrong: negligible — well-understood TS idiom, verified safe by direct reproduction, not a runtime risk.
Task 7: complete (commits c4c4a95..0fda947, review clean — spec ✅ with the above justified deviation, quality Approved, 0 Critical/Important; 1 Minor deferred — no inline comment at the two cast sites explaining why, optional polish for future maintainers, no action needed).
Task 8: complete (commits 0fda947..5a9901a, review clean — spec ✅, reviewer traced the security-critical "issues never leaks to client" path line-by-line and independently re-ran tests+typecheck, quality Approved, 0 Critical/Important; 2 Minor deferred — unsupported-action message echoes raw client input unsanitized (low risk, portfolio-site traffic), and parseApiRequest's English messages vs. Japanese client-facing ones is consistent with brief intent but worth confirming no UI surfaces them raw later — no action needed now).
Task 9: complete (commits 5a9901a..2bf2fff, review clean — spec ✅, doGet confirmed byte-for-byte unchanged, quality Approved, 0 issues).
Task 10: complete (commits 2bf2fff..1776078, review clean — spec ✅, reviewer independently cross-checked DEMO_SHEETS against SheetSchemas.REQUIRED_HEADERS, ConfigParser's 24 required keys, and every ConfigValidator semantic rule, confirmed setupDemoSheets never calls deleteSheet/clear (idempotent skip-if-exists only), quality Approved, 0 Critical/Important; 3 Minor deferred — DemoSeed.test.ts's `as never` cast bypasses a readonly-array/SheetName type mismatch instead of a safer `as readonly string[]` cast, STAFF demo rows use `""` for optional CalendarID (less illustrative but harmless), and the task-10 report's baseline test count has no cited source file — no action needed, not load-bearing. Note: task-10-report.md was written to a non-standard path (.evidence/2026-0906-task10-demo-seed/task-10-report.md instead of the workspace) — reviewer located and used it; no further action).
Task 11: complete (commits 1776078..8f894f6, review clean — spec ✅, reviewer verified all 6 doc files byte-level against the brief's literal content, independently cross-checked the error-code list and the calendarId/email-fields exclusion against docs/phase0-specification.md §C/§H, quality Approved, 0 Critical/Important/Minor).

## Task 12 preflight rulings

Ruling: Task 12's brief (Step 4/5) tells the implementer to diff/grep against a
branch named `main`, but this repo has no `main` branch (only `master` and
`feature/salon-portfolio-phase2-ui`; confirmed via `git branch -a`). Resolution:
use `84ec6fd` — this worktree's actual base commit, already recorded in this
ledger's "Worktree:" line — everywhere the brief says `main`. — Why: 84ec6fd is
the real point this branch diverged from; there is no other candidate ref. —
Cost if wrong: negligible, only changes which ref scopes an evidence-log
diff/grep command, not any code path.

Ruling: this repo's `.gitignore` explicitly re-includes `.evidence/**` as a
tracked durable audit trail (lines 12-14, per the user's global
evidence-reporting.md rule), so Task 12's implementer will `git add` and
commit its own new evidence directory, plus two other files this plan has
left untracked in the worktree: the leftover `.evidence/2026-0906-task10-demo-seed/`
(Task 10's report/logs, never committed as part of Task 10's own commit) and
the plan file itself, `docs/superpowers/plans/2026-09-05-phase3a-gas-config-data-layer.md`
(untracked since the plan was written). — Why: matches this repo's own
tracked-evidence convention and leaves no plan-related file dangling
untracked when this branch is reviewed/merged. — Cost if wrong: negligible —
worst case the final branch review asks to split these into a separate
commit.

Ruling: Task 12 Step 8 asks for a report "in the format the Phase 3A
prompt's §41 specifies (sections A–Q)" — that original task-prompt document
does not exist anywhere in this repo (searched `docs/`; only
phase0-specification.md's unrelated §41 exists) and is not reconstructible.
Resolution: Task 12's implementer/controller will use the user's own
globally-mandated Tier-1 evidence report format (`evidence-reporting.md`)
instead, which serves the same underlying goal — a structured,
evidence-backed report ending in an explicit stop before Phase 3B. — Why:
fabricating an invented "sections A-Q" scheme to match a document that
doesn't exist would be worse than using the format the user has actually
specified globally. — Cost if wrong: negligible — reformatting later if the
original prompt document surfaces.

Task 12: complete (commits 8f894f6..dfe6c5f, review clean — spec ✅, reviewer independently reproduced every numeric/pass-fail claim against the live repo and evidence files (diff.patch byte-identical to a fresh `git diff`, build-artifact grep counts reproduced live, all 74 test counts reconciled file-by-file, secret-scan/typecheck logs confirmed genuinely empty, Phase 3A scope-boundary grep re-run with zero forbidden-file matches), confirmed zero source/test file changes beyond the three ruling-sanctioned housekeeping additions, quality Approved, 0 Critical/Important; 2 Minor deferred — `web-typecheck-lint.log`'s filename implies a separate typecheck step but only lint ran (typecheck is implicit in next build, correctly described in the report text), and the report folds the ad-hoc `npm ci` for the web app into the Build narrative rather than a distinct step (already disclosed) — no action needed).

## All 12 tasks complete — proceeding to final whole-branch review.

## Final whole-branch review (base 84ec6fd, head dfe6c5f, model opus)

Verdict: Ready to merge — With fixes. Reviewer independently re-ran the GAS
suite/typecheck/build, ran a secret/PII scan, and confirmed ruling #3's
housekeeping commit swept in exactly the 3 intended paths.

**Critical (1):** `ConfigStore.ts:73-75` reads `HOLIDAYS.Date` cells via
`String(row.Date ?? "")`, but Google Sheets auto-types a written date string
into a native `Date` object; `String(date)` produces a long locale string
that fails `ConfigValidator`'s `YYYY-MM-DD` pattern, so `getConfig` would
return `CONFIG_INVALID` on the exact demo setup `config-and-sheets-guide.md`
instructs an operator to build. High-confidence (reviewer could not execute
against a live spreadsheet), cheap to fix: normalize a `Date` instance to
`YYYY-MM-DD` in Tokyo time before the string fallback, as a new exported/
Jest-tested helper (not inline in the untested `getConfig()`).

**Important (3):**
- `reservation.timezone` is parsed by `requireString()` (return value
  discarded) then hard-coded to `"Asia/Tokyo"` in `ConfigParser.ts` — the
  `ConfigValidator.ts` branch that checks it against sheet input is
  unreachable through the real pipeline (only exercised by the test's
  `@ts-expect-error`). Plan defect (plan text authored both halves this
  way), not an implementer error — fix: use the parsed value instead of a
  literal.
- `README.md` is stale: still lists CONFIG/`getConfig` under "Phase 1
  deliberately does NOT include", and its GAS run instructions never
  mention the new required `SPREADSHEET_ID` Script Property (every other
  doc — Sheets.ts, config-and-sheets-guide.md, architecture-overview.md,
  changelog.md — has it correctly). Task 11's file list never included
  README.md — a plan gap.
- `Api.ts`'s catch-all in `getConfigAction` maps every non-`ConfigError`
  failure (missing `SPREADSHEET_ID`, missing sheet tab, `MissingHeadersError`
  from a deleted header column) to generic `INTERNAL_ERROR`, even though
  `SHEET_ERROR` exists in `models/ErrorCodes.ts` specifically for this and
  is currently unused everywhere.

**Minor (6, all deferred, no action needed now):** `ConfigStore.ts` holiday
logic living inside the untested `getConfig()` rather than a pure helper
(subsumed by the Critical #1 fix); `Code.ts` doGet hand-builds the envelope
instead of reusing `Api.ts`'s builder; `Code.ts`'s triple `globalThis` cast
could be a single typed `const`; `gas/package.json`'s description is stale
("Phase 1 scaffold — no business logic yet"); `folder-structure.md` still
says root `.claude/` is "Not yet created" (it exists) and omits
`docs/superpowers/plans/`; `ConfigValidator.ts`'s `HOURS_PATTERN` accepts
end-before-start / zero-length ranges (out of Phase 3A scope, flagged for
Phase 4 slot logic).

**Triage of the 9 already-known per-task minors:** 2 promoted to
already-adequately-addressed with reasoning (Task 6's `Omit<>` denylist —
traced and confirmed a new private field forces a compile error, cannot
silently leak; Task 10's `""` CalendarID — confirmed spec-correct per
phase0-specification.md §C "blank = use calendar.id"); Task 8's EN/JA
message split confirmed intentional and consistent (not a defect) with a
forward-looking note for Phase 3B; the remaining 6 stay still-minor-defer,
one of them (Task 1's `ConfigRow` `unknown`-typing) noted as the enabling
condition for Critical #1.

**Ruling:** dispatch ONE fix wave for the Critical + 3 Important findings
only (per this skill's final-review process — no second fix wave exists);
all 6 Minor findings from this review and the 9 already-known per-task
minors are parked as deferred technical debt, not blocking this merge. —
Why: Critical #1 is a real correctness bug on the documented demo path;
Important #2-#4 are cheap, well-scoped, and each closes a real
plan/implementation gap; the Minors are cosmetic or out-of-phase-scope. —
Cost if wrong: low — every parked item is independently actionable later
without touching the fixed code.

**Follow-up note from final reviewer (not a merge blocker, needs a human
decision before this workspace is deleted):** `.superpowers/sdd/.gitignore`
self-ignores the whole directory (`*`), and `.claude/worktrees/` is also
listed in the repo's `info/exclude` — so the 12 per-task `task-N-brief.md`/
`task-N-report.md` files (which carry each task's TDD red/green evidence)
are NOT part of any commit and will be permanently lost when this plan's
workspace is deleted at Finish, per the skill's normal end-of-run cleanup.
Only what Task 12 committed — the plan file + the two `.evidence/`
directories — is durable. This conflicts with the user's global
evidence-reporting.md expectation of a durable audit trail. DO NOT delete
this workspace at Finish without the user's explicit decision on whether to
preserve these reports (e.g. copy `.superpowers/sdd/2026-09-05-phase3a-gas-config-data-layer/task-*-report.md`
into a committed `.evidence/` subfolder first).

## Final-review fix wave: complete

Fix wave commit `41de685` (fix round 1/1 — final-review fixes have no
resume loop, one wave only per skill). Scoped re-review (model sonnet):
all 4 findings ADDRESSED, no new Critical/Important breakage, 0 out-of-scope
observations. Re-reviewer independently re-verified the Tokyo-rollover
timezone arithmetic (UTC 2025-12-31T15:00:00 + 9h = 2026-01-01T00:00:00 JST)
and confirmed `MissingHeadersError` is reachable through the real (non-mocked)
`ConfigStore.getConfig` → `RowMapper.rowsToObjects` path, not just a test
double. Full suite: 82/82 passing (was 74 before this fix wave), typecheck
clean, build clean.

**Phase 3A plan (all 12 tasks + final review + fix wave) is now complete
on branch `worktree-phase3a-gas-config-data-layer`, HEAD `41de685`.**
Per this skill's process, the branch is NOT merged and this workspace is
NOT deleted without the user's explicit approval — see the note above
about the per-task reports living only in this git-ignored workspace, and
superpowers:finishing-a-development-branch for the merge decision itself.
