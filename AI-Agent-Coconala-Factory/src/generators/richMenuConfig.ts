import type { WorkflowPlan } from "../agents/workflowPlanner";
import { error, Issue } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { Bounds } from "../schemas/assets";
import type { ClientBrief } from "../schemas/brief";

/**
 * Rich Menu config generator (the LINE-configuration layer). Turns menu
 * structure + layout into a LINE Messaging API rich-menu object, and the
 * selected workflows' entries into the LINE routes the generated GAS
 * webhook uses. Both come from the same data, so a button can never send
 * a postback that the backend does not understand.
 */

export interface LineRoute {
  workflowId: string;
  entry: string;
  action: string;
  mode: "direct" | "awaitText";
  prompt?: string;
  params?: Record<string, string>;
}

export interface LineArea {
  bounds: Bounds;
  action: Record<string, string>;
}

export interface LineRichMenuConfig {
  size: { width: number; height: number };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: LineArea[];
}

export function postbackData(workflowId: string, entry: string): string {
  return `wf=${workflowId}&e=${entry}`;
}

/** Action id without the @major pin, as registered in the GAS registry. */
export function actionName(ref: string): string {
  return ref.split("@")[0];
}

export function buildLineRoutes(plan: WorkflowPlan, registry: CoreAssetRegistry): LineRoute[] {
  const routes: LineRoute[] = [];
  for (const selected of plan.selected) {
    const workflow = registry.workflows.get(selected.id)!.asset;
    for (const [entry, spec] of Object.entries(workflow.entries)) {
      const route: LineRoute = { workflowId: workflow.id, entry, action: actionName(spec.action), mode: spec.mode };
      if (spec.type === "postback" && spec.prompt) route.prompt = spec.prompt;
      if (Object.keys(spec.params).length > 0) route.params = spec.params;
      routes.push(route);
    }
  }
  return routes;
}

export function generateRichMenuConfig(plan: WorkflowPlan, registry: CoreAssetRegistry, brief: ClientBrief): { menuConfig: LineRichMenuConfig; issues: Issue[] } {
  const issues: Issue[] = [];
  const menu = registry.menus.get(plan.richMenu)!.asset;
  const layout = registry.layouts.get(menu.layout)!.asset;
  const areas: LineArea[] = [];
  for (const item of menu.items) {
    const bounds = layout.slots.find((s) => s.id === item.slot)!.bounds;
    const label = item.label.slice(0, 20);
    if (item.action.type === "uri") {
      const uri = brief.config[item.action.configKey];
      if (!uri) {
        issues.push(error("RM_ACTIONS_VALID", `button "${item.label}" needs a URL in brief config "${item.action.configKey}"`));
      }
      areas.push({ bounds, action: { type: "uri", label, uri: uri ?? `https://example.com/TODO-${item.action.configKey}` } });
      continue;
    }
    const workflow = registry.workflows.get(item.action.workflowId)?.asset;
    const entry = workflow?.entries[item.action.entry];
    if (!workflow || !entry) {
      issues.push(error("RM_ACTIONS_VALID", `button "${item.label}" references ${item.action.workflowId}#${item.action.entry}, which does not exist`));
      continue;
    }
    const data = postbackData(workflow.id, item.action.entry);
    if (entry.type === "datetimepicker") {
      areas.push({ bounds, action: { type: "datetimepicker", label, data, mode: entry.pickerMode } });
    } else {
      const action: Record<string, string> = { type: "postback", label, data };
      if (entry.displayText) action.displayText = entry.displayText;
      areas.push({ bounds, action });
    }
  }
  return {
    menuConfig: {
      size: layout.size,
      selected: true,
      name: `${brief.project.slug}-${menu.id}`.slice(0, 300),
      chatBarText: menu.chatBarText,
      areas,
    },
    issues,
  };
}
