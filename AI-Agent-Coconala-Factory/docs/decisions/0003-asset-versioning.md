# 0003: Asset versioning and immutability

**Decision.**
1. kebab-case assets carry their major version in the id (`reservation-basic-v1`) plus a semver
   `version` whose major must match (validated). Breaking change → new id (`-v2`); the old one stays.
2. Actions are camelCase functions (`createInquiry`) with a semver version, addressed as
   `createInquiry@1`. Unpinned refs are invalid.
3. `core-assets/asset-lock.json` stores the version + LF-normalized sha256 of every released
   asset and GAS module file. `validate` fails with `ASSET_MUTATED` if content changed without a
   version bump, and with `ASSET_REMOVED` if a released file disappeared. `lock-assets` releases
   new or bumped files and refuses while errors exist.
4. Client projects snapshot the definitions they used (`workflow/workflow.json`) and stamp
   `_meta` (project, industry, workflows, asset versions) on every generated JSON file.
   `gas/src/generated/manifest.ts` records module versions and copied-file hashes.

**Consequences.** A released asset cannot be edited silently under an existing client project.
Compatible fixes are cheap (bump PATCH/MINOR and re-lock). Two versions of a workflow can coexist.
