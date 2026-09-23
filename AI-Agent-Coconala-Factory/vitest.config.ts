import { defineConfig } from "vitest/config";

// Factory tests plus the reusable GAS module tests. Generated client
// projects under projects/ are NOT included here — each one is checked by
// `factory qa` inside its own gas/ directory, so a broken client project
// can never mask (or be masked by) a factory test failure.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "core-assets/gas-modules/tests/**/*.test.ts"],
    environment: "node",
  },
});
