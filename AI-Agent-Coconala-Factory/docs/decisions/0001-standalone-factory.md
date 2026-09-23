# 0001: Standalone factory; salon apps stay read-only references

**Context.** The workspace monorepo has no root tooling, and each `apps/*` project is
independent. The brief forbids modifying or depending on the salon apps.

**Decision.** `AI-Agent-Coconala-Factory/` has its own `package.json`, `node_modules` and
tests. Nothing is imported from `apps/*`. Reusable ideas were re-implemented in
`core-assets/gas-modules` after the audit. No code was copied wholesale.

**Consequences.** There is some intentional duplication with the salon apps (row
mapping, idempotency pattern). The salon apps can later adopt the factory's modules,
but that is a separate, explicit migration and not part of Phase 1.
