# 0002: Toolchain

**Context.** The salon GAS projects use TypeScript + esbuild + clasp + **Jest (ts-jest)**. The
brief asked to evaluate, not copy.

**Decision.**
- **TypeScript everywhere.** The factory runs on Node via `tsx`, and GAS modules target ES2019 (V8 runtime).
- **Vitest instead of Jest.** It runs TS natively without ts-jest config, and the same runner
  serves the factory, the Core Asset GAS modules, and every generated project. The trade-off is a
  different runner from the salon apps, which is acceptable because nothing is shared at runtime.
- **esbuild IIFE bundle + footer wrappers.** Kept from the salon/site-report apps, including the
  site-report fix: top-level `function doGet(e){…}` wrappers appended after the IIFE so the Apps
  Script editor can discover entry points.
- **clasp** stays the deploy tool (a devDependency of generated projects, not of the factory).
- **Assets are JSON validated by zod.** JSON is editable without code, diffable, and lockable. zod gives one
  source of truth for shapes plus typed access in TS.

**Consequences.** A generated project inside the factory tree resolves the toolchain from the
factory's `node_modules`. Delivered standalone, it runs `npm install` (versions pinned in its
package.json). QA fails with an explicit message otherwise.
