import fs from "node:fs";
import path from "node:path";
import type { WorkflowPlan } from "../agents/workflowPlanner";
import type { ArtifactMeta } from "../generators/meta";
import { actionName, LineRichMenuConfig, postbackData } from "../generators/richMenuConfig";
import { FACTORY_ROOT, hashText, readJson } from "../lib/fsx";
import { error, Issue } from "../lib/issues";
import type { ImageRecord } from "../richMenu/renderer";
import { CoreAssetRegistry, LINE_PROXY_DIR } from "../registry/registry";

/**
 * LINE deployment layer, generation side. Produces the project's `line/`
 * folder from data the pipeline already has:
 *
 *   line/deployment.json   what would be deployed and from which assets
 *                          (deterministic: no server-issued ids, no secrets)
 *   line/README.md         developer notes for deploying and rolling back
 *   line/webhook/          the signature-verifying proxy (copied verbatim)
 *
 * Server-issued rich menu ids are written only by `line-deploy --live`
 * into line/deployment-history.json, which generation never touches.
 */

export const DEPLOYMENT_FILE = "line/deployment.json";
export const HISTORY_FILE = "line/deployment-history.json";
export const SMOKE_RESULT_FILE = "line/smoke-test-result.json";
export const WEBHOOK_DIR = "line/webhook";

/** The rich-menu object sent to LINE: menu-config.json without `_meta` and non-LINE fields. */
export function lineRichMenuPayload(menu: LineRichMenuConfig) {
  return {
    size: menu.size,
    selected: menu.selected,
    name: menu.name,
    chatBarText: menu.chatBarText,
    areas: menu.areas.map((area) => ({ bounds: area.bounds, action: area.action })),
  };
}

export function payloadSha256(menu: LineRichMenuConfig): string {
  return hashText(JSON.stringify(lineRichMenuPayload(menu)));
}

export interface TraceRow {
  slot: string;
  button: string;
  lineAction: string;
  /** postback data, or the URI config key for link buttons. */
  target: string;
  workflow?: string;
  entry?: string;
  mode?: string;
  action?: string;
  gasHandler?: string;
}

/** Button → LINE action → workflow entry → pinned action → GAS handler, from the Core Assets. */
export function traceButtons(plan: WorkflowPlan, registry: CoreAssetRegistry): { rows: TraceRow[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const menu = registry.menus.get(plan.richMenu)?.asset;
  if (!menu) return { rows: [], issues: [error("LINE_WORKFLOW_REFERENCES", `rich menu ${plan.richMenu} does not exist`)] };
  const rows = menu.items.map((item): TraceRow => {
    if (item.action.type === "uri") return { slot: item.slot, button: item.label, lineAction: "uri", target: `config:${item.action.configKey}` };
    const workflow = registry.workflows.get(item.action.workflowId)?.asset;
    const entry = workflow?.entries[item.action.entry];
    if (!workflow || !entry) {
      issues.push(error("LINE_WORKFLOW_REFERENCES", `"${item.label}" points to ${item.action.workflowId}#${item.action.entry}, which does not exist`));
      return { slot: item.slot, button: item.label, lineAction: "?", target: "" };
    }
    const action = registry.resolveAction(entry.action);
    return {
      slot: item.slot,
      button: item.label,
      lineAction: entry.type,
      target: postbackData(workflow.id, item.action.entry),
      workflow: `${workflow.id}@${workflow.version}`,
      entry: item.action.entry,
      mode: entry.mode,
      action: action ? `${entry.action} (v${action.version})` : entry.action,
      gasHandler: `gas/src/actions/${actionName(entry.action)}.ts`,
    };
  });
  return { rows, issues };
}

export const SECRETS = [
  { name: "LINE_CHANNEL_ACCESS_TOKEN", usedBy: "GAS (reply) and the factory CLI (line-deploy)", storedIn: "Apps Script Script Properties; CLI: environment variable only" },
  { name: "LINE_CHANNEL_SECRET", usedBy: "webhook proxy (signature check)", storedIn: "Cloudflare Worker secret (wrangler secret put)" },
  { name: "GAS_WEBAPP_URL", usedBy: "webhook proxy (forward target)", storedIn: "Cloudflare Worker secret" },
  { name: "GAS_WEBHOOK_KEY", usedBy: "webhook proxy → GAS", storedIn: "Cloudflare Worker secret; the same value as the GAS Script Property WEBHOOK_KEY" },
  { name: "WEBHOOK_KEY", usedBy: "GAS (accepts only proxy-forwarded deliveries)", storedIn: "Apps Script Script Properties" },
  { name: "SPREADSHEET_ID", usedBy: "GAS", storedIn: "Apps Script Script Properties" },
] as const;

export interface DefinitionInputs {
  plan: WorkflowPlan;
  registry: CoreAssetRegistry;
  menuConfig: LineRichMenuConfig;
  image: ImageRecord;
  meta: ArtifactMeta;
}

export function deploymentDefinition(inputs: DefinitionInputs): { json: unknown; issues: Issue[] } {
  const { plan, registry, menuConfig, image, meta } = inputs;
  const menu = registry.menus.get(plan.richMenu)?.asset;
  const layout = menu ? registry.layouts.get(menu.layout)?.asset : undefined;
  const preset = registry.presets.get(plan.designPreset)?.asset;
  const proxy = registry.lineProxy;
  const { rows, issues } = traceButtons(plan, registry);
  return {
    issues,
    json: {
      _meta: meta,
      richMenu: {
        asset: menu ? `${menu.id}@${menu.version}` : plan.richMenu,
        layout: layout ? `${layout.id}@${layout.version}` : undefined,
        designPreset: preset ? `${preset.id}@${preset.version}` : plan.designPreset,
        name: menuConfig.name,
        chatBarText: menuConfig.chatBarText,
        size: menuConfig.size,
        areaCount: menuConfig.areas.length,
        config: "rich-menu/menu-config.json",
        configSha256: payloadSha256(menuConfig),
        image: { file: image.file, contentType: image.contentType, width: image.width, height: image.height, bytes: image.bytes, sha256: image.sha256, renderer: `${image.renderer.id}@${image.renderer.version}` },
        setAsDefault: true,
      },
      webhook: {
        topology: ["LINE Platform", `${WEBHOOK_DIR} (Cloudflare Worker: verifies x-line-signature)`, "GAS web app doPost (?key=WEBHOOK_KEY)"],
        proxy: proxy ? `${proxy.id}@${proxy.version}` : "missing",
        lineWebhookUrl: "the Worker URL (https://<worker>.<account>.workers.dev/), never the GAS URL",
        gasAuthentication: "WEBHOOK_KEY query parameter, known only to the proxy",
        response: "The proxy answers LINE with HTTP 200 after verifying the signature and forwards to GAS in the background.",
      },
      secrets: SECRETS,
      environments: ["test", "production"],
      deployment: {
        order: ["validate (static LINE QA)", "validate rich menu object (LINE API)", "create rich menu", "upload image", "verify rich menu", "set default rich menu", "record in line/deployment-history.json"],
        neverDeletes: "line-deploy never deletes a rich menu. Old menus are removed only with `line-delete --rich-menu-id <id> --live`.",
        serverIssuedIds: HISTORY_FILE,
      },
      traceability: rows,
    },
  };
}

// ------------------------------------------------------------ webhook folder

export function proxySourceFiles(registry: CoreAssetRegistry): { files: Record<string, string>; issues: Issue[] } {
  const files: Record<string, string> = {};
  const issues: Issue[] = [];
  const proxy = registry.lineProxy;
  if (!proxy) return { files, issues: [error("LINE_PROXY_CONFIG", "core-assets/line-webhook-proxy is missing")] };
  for (const rel of [...proxy.files, ...proxy.tests, "tsconfig.json"]) {
    const source = path.join(registry.dir, LINE_PROXY_DIR, rel);
    if (!fs.existsSync(source)) {
      issues.push(error("LINE_PROXY_CONFIG", `proxy file ${rel} is missing from core-assets`));
      continue;
    }
    files[rel] = fs.readFileSync(source, "utf8").replace(/\r\n/g, "\n");
  }
  return { files, issues };
}

export function webhookFolder(registry: CoreAssetRegistry, slug: string, project: string): { files: Record<string, string>; issues: Issue[] } {
  const { files, issues } = proxySourceFiles(registry);
  const pkg = readJson<{ devDependencies: Record<string, string> }>(path.join(FACTORY_ROOT, "package.json")).devDependencies;
  const secrets = registry.lineProxy?.secrets ?? [];
  files["package.json"] = `${JSON.stringify(
    {
      name: `${slug}-line-webhook`,
      version: "1.0.0",
      private: true,
      description: `LINE webhook verification proxy for ${project} (generated by AI-Agent-Coconala-Factory)`,
      type: "module",
      scripts: { typecheck: "tsc --noEmit", test: "vitest run", deploy: "wrangler deploy" },
      devDependencies: { typescript: pkg.typescript, vitest: pkg.vitest, wrangler: "^4.37.0" },
    },
    null,
    2,
  )}\n`;
  files["vitest.config.mjs"] = `import { defineConfig } from "vitest/config";\n\nexport default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });\n`;
  files["wrangler.toml.example"] = `# Copy to wrangler.toml (gitignored). Secrets are NEVER written here:
# set them with \`npx wrangler secret put <NAME>\` for: ${secrets.join(", ")}.
name = "${slug}-line-webhook"
main = "src/worker.ts"
compatibility_date = "2026-09-01"
`;
  files[".gitignore"] = "node_modules/\n.wrangler/\n# local secrets and the real config\n.dev.vars\nwrangler.toml\n";
  files["README.md"] = `# LINE webhook verification proxy — ${project}

Generated by AI-Agent-Coconala-Factory from \`core-assets/${LINE_PROXY_DIR}\`. Do not edit \`src/\` or
\`tests/\`; change the Core Asset and regenerate.

\`\`\`text
LINE Platform ──► this Worker ──(x-line-signature OK)──► GAS web app ?key=WEBHOOK_KEY
                  └─ invalid / missing signature → 401, GAS is never called
\`\`\`

Apps Script cannot read HTTP headers, so the LINE signature is checked here, on the raw body,
before anything is parsed. GAS's \`?key=\` only proves the request came from this proxy.

## Secrets (Cloudflare Worker secrets, never in files)

| Name | Value |
|---|---|
| \`LINE_CHANNEL_SECRET\` | LINE Developers → Basic settings → Channel secret |
| \`GAS_WEBAPP_URL\` | The GAS web app URL ending in \`/exec\` |
| \`GAS_WEBHOOK_KEY\` | The same value as the GAS Script Property \`WEBHOOK_KEY\` |

## Deploy

\`\`\`bash
npm install
npm test                      # signature + forwarding tests
cp wrangler.toml.example wrangler.toml
npx wrangler login
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put GAS_WEBAPP_URL
npx wrangler secret put GAS_WEBHOOK_KEY
npx wrangler deploy           # prints https://<name>.<account>.workers.dev
\`\`\`

Set that Worker URL as the Webhook URL in LINE Developers and press "Verify" (LINE sends an
empty, signed event list; the proxy answers 200 without calling GAS).

## Behaviour

- Valid signature → HTTP 200 immediately, then the same bytes are forwarded to GAS in the
  background (\`waitUntil\`). GAS replies to the customer with the reply token.
- A failed forward is logged in the Worker logs (\`npx wrangler tail\`); LINE is not asked to
  redeliver. Records are idempotent per \`webhookEventId\`, so a manual resend is safe.
- Invalid or missing signature → 401. Missing configuration → 500.
`;
  return { files, issues };
}

export function lineReadme(project: string, menuName: string): string {
  return `# LINE deployment — ${project}

Developer-facing. The owner-facing steps are in \`../delivery/LINE_SETUP.md\`.

- \`deployment.json\`: what gets deployed (rich menu \`${menuName}\`, image hash, asset versions,
  button → workflow → action traceability). Generated; deterministic.
- \`deployment-history.json\`: server-issued rich menu ids per environment. Written only by
  \`line-deploy --live\` / \`line-rollback --live\`. Never generated, never deleted by the factory.
- \`webhook/\`: the signature-verifying proxy (Cloudflare Worker). See \`webhook/README.md\`.

## Commands (from the factory root)

\`\`\`bash
npm run factory -- line-validate --project projects/${project}
npm run factory -- line-deploy   --project projects/${project} --env test             # dry run (default)
LINE_CHANNEL_ACCESS_TOKEN=... npm run factory -- line-deploy --project projects/${project} --env test --live
npm run factory -- line-status   --project projects/${project} [--remote]
npm run factory -- line-rollback --project projects/${project} --env test [--live]
npm run factory -- line-smoke-test --project projects/${project} --env test --live   # test account only
\`\`\`

The access token is read from the \`LINE_CHANNEL_ACCESS_TOKEN\` environment variable and is never
written to disk or printed. Deploys never delete a rich menu; see \`../delivery/ROLLBACK.md\`.
`;
}
