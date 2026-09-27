import type { ActionRegistry } from "./actions/types";
import type { LineRoute } from "./line/webhook";
import { dispatchPost } from "./router/dispatch";
import type { RuntimeSchema } from "./services/context";
import { createGasContext, getScriptProperty, SCRIPT_PROPERTIES } from "./services/gas/gasContext";
import { applySpreadsheetSetup, registerRichMenu } from "./services/gas/gasSetup";
import type { LineRichMenu } from "./setup/richMenuSetup";

/**
 * Wires the generated project data (schema, registry, routes, rich menu)
 * into the four Apps Script entry points. The generated src/index.ts
 * calls this and exposes the results on globalThis. See the generated
 * esbuild.config.mjs for why the footer wrappers are needed.
 */

export interface ProjectBundle {
  schema: RuntimeSchema;
  registry: ActionRegistry;
  apiActions: readonly string[];
  routes: readonly LineRoute[];
  configSeed: Record<string, string>;
  richMenu: LineRichMenu & Record<string, unknown>;
  manifest: Record<string, unknown>;
}

function json(value: unknown): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

export function createEntrypoints(bundle: ProjectBundle) {
  return {
    doGet(): GoogleAppsScript.Content.TextOutput {
      const manifest = bundle.manifest as { project?: unknown; factoryVersion?: unknown };
      return json({ ok: true, data: { status: "ok", project: manifest.project, factoryVersion: manifest.factoryVersion } });
    },
    doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
      const response = dispatchPost(e?.postData?.contents, e?.parameter?.key, {
        registry: bundle.registry,
        apiActions: bundle.apiActions,
        routes: bundle.routes,
        webhookKey: getScriptProperty(SCRIPT_PROPERTIES.WEBHOOK_KEY),
        apiEnabled: getScriptProperty(SCRIPT_PROPERTIES.API_ENABLED) === "true",
        ctx: () => createGasContext(bundle.schema),
      });
      return json(response);
    },
    setupSpreadsheet(): void {
      applySpreadsheetSetup(bundle.schema, bundle.configSeed);
    },
    setupRichMenu(): void {
      registerRichMenu(bundle.richMenu);
    },
  };
}
