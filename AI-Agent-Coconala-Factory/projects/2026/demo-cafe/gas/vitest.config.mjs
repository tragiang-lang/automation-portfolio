import { defineConfig } from "vitest/config";

// Tests run against the TypeScript sources, never against the bundle.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });
