import fs from "node:fs";
import path from "node:path";
import type { WorkflowPlan } from "../agents/workflowPlanner";
import { FACTORY_ROOT, hashText, readJson } from "../lib/fsx";
import { error, Issue } from "../lib/issues";
import { CoreAssetRegistry, GAS_MODULES_DIR } from "../registry/registry";
import type { ActionAsset } from "../schemas/assets";
import type { ArtifactMeta, TraceContext } from "./meta";
import { sourceHeader } from "./meta";
import type { LineRichMenuConfig, LineRoute } from "./richMenuConfig";
import type { ProjectSchema } from "./spreadsheetSchema";

/**
 * GAS Project Generator.
 *
 * 1. Copies the selected reusable modules (core-assets/gas-modules), byte
 *    for byte, with their tests.
 * 2. Generates only the project-specific data files under src/generated/
 *    plus src/index.ts and tooling config.
 *
 * Client-specific values live only in generated data (schema, config
 * seed, routes, rich menu). Secrets are never generated: they are Script
 * Properties. Output is deterministic, so regenerating is safe.
 */

export interface GasInputs {
  plan: WorkflowPlan;
  registry: CoreAssetRegistry;
  schema: ProjectSchema;
  configSeed: Record<string, string>;
  routes: LineRoute[];
  menuConfig: LineRichMenuConfig & { _meta: ArtifactMeta };
  trace: TraceContext;
  slug: string;
}

export const ENTRYPOINTS = ["doGet", "doPost", "setupSpreadsheet", "setupRichMenu"] as const;
export const GENERATED_GAS_FILES = [
  "src/index.ts",
  "src/generated/schema.ts",
  "src/generated/configSeed.ts",
  "src/generated/registry.ts",
  "src/generated/routes.ts",
  "src/generated/richMenu.ts",
  "src/generated/manifest.ts",
  "tests/generated.test.ts",
  "package.json",
  "tsconfig.json",
  "vitest.config.mjs",
  "esbuild.config.mjs",
  "appsscript.json",
  ".gitignore",
  ".clasp.json.example",
  "README.md",
];

export function selectedActions(plan: WorkflowPlan, registry: CoreAssetRegistry): ActionAsset[] {
  const refs = [...new Set(plan.selected.flatMap((w) => w.actions))];
  return refs.map((ref) => registry.resolveAction(ref)).filter((a): a is ActionAsset => a !== undefined);
}

export function selectedModules(plan: WorkflowPlan, registry: CoreAssetRegistry) {
  const needed = new Set(selectedActions(plan, registry).map((a) => a.gas?.module).filter((m): m is string => Boolean(m)));
  return (registry.gasModules?.modules ?? []).filter((m) => m.always || needed.has(m.id));
}

const ts = (value: unknown) => JSON.stringify(value, null, 2);

export function generateGasProject(inputs: GasInputs): { files: Record<string, string>; issues: Issue[] } {
  const { plan, registry, schema, configSeed, routes, menuConfig, trace, slug } = inputs;
  const issues: Issue[] = [];
  const files: Record<string, string> = {};
  const header = sourceHeader(trace, "GAS Project Generator");

  // 1. reusable modules, copied verbatim
  const modules = selectedModules(plan, registry);
  const copied: Record<string, string> = {};
  for (const module of modules) {
    for (const rel of [...module.files, ...module.tests]) {
      const source = path.join(registry.dir, GAS_MODULES_DIR, rel);
      if (!fs.existsSync(source)) {
        issues.push(error("GAS_FILES", `module ${module.id} file ${rel} is missing from core-assets`));
        continue;
      }
      files[rel] = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n");
      copied[rel] = hashText(files[rel]);
    }
  }

  // 2. generated project data
  const actions = selectedActions(plan, registry);
  const runtimeSchema = {
    sheets: schema.sheets.map((s) => ({ name: s.name, columns: s.columns.map((c) => c.name), required: s.columns.filter((c) => c.required).map((c) => c.name), primaryKey: s.primaryKey })),
    configKeys: schema.configKeys.map((k) => ({ key: k.key, required: k.required, ...(k.default !== undefined ? { default: k.default } : {}), description: k.description })),
  };
  files["src/generated/schema.ts"] = `${header}import type { RuntimeSchema } from "../services/context";\n\nexport const SCHEMA: RuntimeSchema = ${ts(runtimeSchema)};\n`;
  files["src/generated/configSeed.ts"] = `${header}/** Non-secret CONFIG values from the client brief, written by setupSpreadsheet() for keys that are still missing. */\nexport const CONFIG_SEED: Record<string, string> = ${ts(configSeed)};\n`;

  const handlerIds = actions.map((a) => a.id).sort();
  const apiActions = actions.filter((a) => a.exposure.includes("api")).map((a) => a.id).sort();
  files["src/generated/registry.ts"] = [
    header + 'import type { ActionRegistry } from "../actions/types";',
    ...handlerIds.map((id) => `import { ${id} } from "../actions/${id}";`),
    "",
    `export const REGISTRY: ActionRegistry = { ${handlerIds.join(", ")} };`,
    "",
    "/** Actions callable through the JSON API (only when the API_ENABLED Script Property is \"true\"). */",
    `export const API_ACTIONS: readonly string[] = ${JSON.stringify(apiActions)};`,
    "",
  ].join("\n");
  files["src/generated/routes.ts"] = `${header}import type { LineRoute } from "../line/webhook";\n\nexport const LINE_ROUTES: LineRoute[] = ${ts(routes)};\n`;
  files["src/generated/richMenu.ts"] = `${header}import type { LineRichMenu } from "../setup/richMenuSetup";\n\nexport const RICH_MENU: LineRichMenu & Record<string, unknown> = ${ts(menuConfig)};\n`;
  const manifest = {
    project: trace.project,
    industry: trace.industry,
    workflows: trace.workflows,
    actions: actions.map((a) => `${a.id}@${a.version}`),
    modules: modules.map((m) => `${m.id}@${m.version}`),
    assets: trace.assets,
    moduleFileHashes: copied,
  };
  files["src/generated/manifest.ts"] = `${header}export const MANIFEST = ${ts({ factoryVersion: menuConfig._meta.factoryVersion, ...manifest })};\n`;

  files["src/index.ts"] = [
    header + 'import { createEntrypoints } from "./entry";',
    'import { CONFIG_SEED } from "./generated/configSeed";',
    'import { MANIFEST } from "./generated/manifest";',
    'import { API_ACTIONS, REGISTRY } from "./generated/registry";',
    'import { RICH_MENU } from "./generated/richMenu";',
    'import { LINE_ROUTES } from "./generated/routes";',
    'import { SCHEMA } from "./generated/schema";',
    "",
    "const entry = createEntrypoints({ schema: SCHEMA, registry: REGISTRY, apiActions: API_ACTIONS, routes: LINE_ROUTES, configSeed: CONFIG_SEED, richMenu: RICH_MENU, manifest: MANIFEST });",
    "",
    "// esbuild wraps everything in an IIFE, so expose the entry points on the real global object under",
    "// prefixed names. The top-level wrappers appended by esbuild.config.mjs forward to these.",
    "const g = globalThis as unknown as Record<string, unknown>;",
    ...ENTRYPOINTS.map((name) => `g.__factory_${name} = entry.${name};`),
    "",
  ].join("\n");

  files["tests/generated.test.ts"] = generatedWiringTest(header);
  Object.assign(files, toolingFiles(slug, trace));
  return { files, issues };
}

function generatedWiringTest(header: string): string {
  return `${header}import { describe, expect, it } from "vitest";
import { findRoute, handleLineWebhook, parsePostbackData } from "../src/line/webhook";
import { CONFIG_SEED } from "../src/generated/configSeed";
import { API_ACTIONS, REGISTRY } from "../src/generated/registry";
import { RICH_MENU } from "../src/generated/richMenu";
import { LINE_ROUTES } from "../src/generated/routes";
import { SCHEMA } from "../src/generated/schema";
import { makeContext } from "./support/fakes";

describe("generated wiring", () => {
  it("registers every handler under its own id", () => {
    for (const [id, handler] of Object.entries(REGISTRY)) expect(handler.id).toBe(id);
  });

  it("routes every LINE entry to a LINE-enabled handler", () => {
    for (const route of LINE_ROUTES) {
      expect(REGISTRY[route.action], route.action).toBeDefined();
      expect(REGISTRY[route.action].fromLine, route.action).toBeTypeOf("function");
      if (route.mode === "awaitText") expect(route.prompt).toBeTruthy();
    }
  });

  it("exposes only registered actions on the API", () => {
    for (const id of API_ACTIONS) expect(REGISTRY[id]).toBeDefined();
  });

  it("only sends postbacks that the webhook can route", () => {
    for (const area of RICH_MENU.areas) {
      const action = area.action as { type: string; data?: string; uri?: string };
      if (action.type === "uri") {
        expect(action.uri).toMatch(/^https:\\/\\//);
        continue;
      }
      expect(findRoute(LINE_ROUTES, parsePostbackData(action.data ?? "")), action.data).toBeDefined();
    }
  });

  it("seeds only CONFIG keys the schema declares", () => {
    const declared = SCHEMA.configKeys.map((k) => k.key);
    for (const key of Object.keys(CONFIG_SEED)) expect(declared).toContain(key);
  });

  it("answers every rich menu button in an in-memory smoke run", () => {
    const config: Record<string, string> = {};
    for (const key of SCHEMA.configKeys) if (key.default !== undefined) config[key.key] = key.default;
    Object.assign(config, CONFIG_SEED);
    const ctx = makeContext({ schema: SCHEMA, config });
    RICH_MENU.areas.forEach((area, index) => {
      const action = area.action as { type: string; data?: string };
      if (action.type === "uri") return;
      const userId = \`U0000smoke\${index}\`;
      handleLineWebhook(
        { events: [{ type: "postback", webhookEventId: \`smoke-\${index}\`, replyToken: \`rt-\${index}\`, source: { userId }, postback: { data: action.data, params: { datetime: "2099-01-01T10:00" } } }] },
        { routes: LINE_ROUTES, registry: REGISTRY, ctx },
      );
      const route = findRoute(LINE_ROUTES, parsePostbackData(action.data ?? ""))!;
      if (route.mode === "awaitText") {
        handleLineWebhook(
          { events: [{ type: "message", webhookEventId: \`smoke-text-\${index}\`, replyToken: \`rt-text-\${index}\`, source: { userId }, message: { type: "text", text: "テスト送信です" } }] },
          { routes: LINE_ROUTES, registry: REGISTRY, ctx },
        );
      }
    });
    const buttons = RICH_MENU.areas.filter((a) => (a.action as { type: string }).type !== "uri").length;
    expect(ctx.replies.length).toBeGreaterThanOrEqual(buttons);
    expect(ctx.errors.filter((e) => e.event === "line.unroutable")).toEqual([]);
  });
});
`;
}

function toolingFiles(slug: string, trace: TraceContext): Record<string, string> {
  const factoryPkg = readJson<{ devDependencies: Record<string, string> }>(path.join(FACTORY_ROOT, "package.json")).devDependencies;
  const pick = (name: string) => factoryPkg[name];
  const footer = ENTRYPOINTS.map((name) => `function ${name}(e) {\n  return globalThis.__factory_${name}(e);\n}`).join("\n");
  return {
    "package.json": `${JSON.stringify(
      {
        name: `${slug}-gas`,
        version: "1.0.0",
        private: true,
        description: `GAS backend for ${trace.project} (generated by AI-Agent-Coconala-Factory)`,
        type: "module",
        scripts: { build: "node esbuild.config.mjs", typecheck: "tsc --noEmit", test: "vitest run", push: "npm run build && clasp push" },
        devDependencies: {
          "@google/clasp": "^2.4.2",
          "@types/google-apps-script": pick("@types/google-apps-script"),
          esbuild: pick("esbuild"),
          typescript: pick("typescript"),
          vitest: pick("vitest"),
        },
      },
      null,
      2,
    )}\n`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2019",
          module: "ESNext",
          moduleResolution: "Bundler",
          lib: ["ES2019"],
          types: ["google-apps-script"],
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noImplicitReturns: true,
          forceConsistentCasingInFileNames: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["src/**/*.ts", "tests/**/*.ts"],
      },
      null,
      2,
    )}\n`,
    "vitest.config.mjs": `import { defineConfig } from "vitest/config";\n\n// Tests run against the TypeScript sources, never against the bundle.\nexport default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });\n`,
    "esbuild.config.mjs": `// GENERATED by AI-Agent-Coconala-Factory. Bundles src/ into build/Code.js for Apps Script.
//
// Apps Script has no module loader, so everything is bundled into one IIFE. The Apps Script
// editor only finds functions declared at the true top level of the file, so the footer below
// adds real top-level wrappers that forward to the implementations src/index.ts put on
// globalThis (the same fix used in apps/site-report, see docs/reusable-assets-audit.md).
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

const footer = \`
${footer}
\`;

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "build/Code.js",
  target: "es2019",
  format: "iife",
  platform: "neutral",
  footer: { js: footer },
  logLevel: "warning",
});
mkdirSync("build", { recursive: true });
copyFileSync("appsscript.json", "build/appsscript.json");
`,
    "appsscript.json": `${JSON.stringify(
      {
        timeZone: "Asia/Tokyo",
        dependencies: {},
        exceptionLogging: "STACKDRIVER",
        runtimeVersion: "V8",
        webapp: { access: "ANYONE_ANONYMOUS", executeAs: "USER_DEPLOYING" },
      },
      null,
      2,
    )}\n`,
    ".gitignore": "node_modules/\nbuild/\n# real Apps Script project id, per environment\n.clasp.json\n.clasprc.json\n.env\n",
    ".clasp.json.example": `${JSON.stringify({ scriptId: "<YOUR_APPS_SCRIPT_ID>", rootDir: "build" }, null, 2)}\n`,
    "README.md": `# ${trace.project} GAS backend

Generated by AI-Agent-Coconala-Factory. **Do not edit files under \`src/generated/\` or copied
module files by hand.** Change the brief or the Core Assets and regenerate instead.

- Workflows: ${trace.workflows.join(", ")}
- Entry points: ${ENTRYPOINTS.join(", ")}

\`\`\`bash
npm install
npm run typecheck
npm test
npm run build      # -> build/Code.js + build/appsscript.json
cp .clasp.json.example .clasp.json   # then set your scriptId
npx clasp push
\`\`\`

Script Properties (never commit these): \`SPREADSHEET_ID\`, \`LINE_CHANNEL_ACCESS_TOKEN\`,
\`WEBHOOK_KEY\` (32+ random characters), \`RICH_MENU_IMAGE_FILE_ID\`, optional \`API_ENABLED\`.
See \`../delivery/SETUP.md\` for the full setup procedure.
`,
  };
}
