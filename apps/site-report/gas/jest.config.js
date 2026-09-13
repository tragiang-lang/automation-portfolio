/** Runs against TypeScript sources directly — never against the esbuild bundle. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
};
