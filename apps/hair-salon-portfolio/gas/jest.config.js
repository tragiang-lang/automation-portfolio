/** Runs against TypeScript sources directly — never against the esbuild bundle (Phase 0 spec §Q). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
};
