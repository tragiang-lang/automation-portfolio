// Bundles gas/src into a single file the Apps Script V8 runtime can run.
//
// Apps Script has no module loader, so every file must be flattened into
// one output. clasp accepts a .js extension for this file (it shows as
// Code.gs in the online editor) — see .clasp.json's rootDir.
const esbuild = require("esbuild");
const fs = require("fs");

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "build/Code.js",
    target: "es2019", // matches the V8 runtime Apps Script executes on
    format: "iife", // no module system available in the Apps Script sandbox
    platform: "neutral",
  })
  .then(() => {
    // clasp pushes appsscript.json from the same rootDir as the bundle.
    fs.copyFileSync("appsscript.json", "build/appsscript.json");
  })
  .catch(() => process.exit(1));
