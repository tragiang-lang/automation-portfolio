import { error, Issue, warning } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { ClientBrief } from "../schemas/brief";
import type { IndustryProfile } from "./industrySpecialist";

/**
 * Workflow Planner Agent: turns the industry profile into a concrete,
 * versioned selection of workflows, one Rich Menu and one design preset.
 * Workflows that are not stable, or that depend on planned actions, are
 * deferred with a reason instead of being generated half-working.
 */

export interface SelectedWorkflow {
  id: string;
  version: string;
  name: string;
  reasons: string[];
  actions: string[];
  entries: string[];
}

export interface WorkflowPlan {
  selected: SelectedWorkflow[];
  deferred: { id: string; reason: string }[];
  richMenu: string;
  designPreset: string;
  extensionPoints: { workflow: string; id: string; description: string }[];
}

export function planWorkflows(brief: ClientBrief, profile: IndustryProfile, registry: CoreAssetRegistry): { plan: WorkflowPlan; issues: Issue[] } {
  const issues: Issue[] = [];
  const candidates = brief.overrides.workflows ?? profile.recommendedWorkflows;
  const selected: SelectedWorkflow[] = [];
  const deferred: WorkflowPlan["deferred"] = [];

  for (const id of candidates) {
    const workflow = registry.workflows.get(id)?.asset;
    if (!workflow) {
      issues.push(error("WF_EXISTS", `workflow ${id} does not exist`));
      continue;
    }
    if (workflow.status !== "stable") {
      deferred.push({ id, reason: `status is ${workflow.status}` });
      continue;
    }
    const unavailable = workflow.actions.filter((ref) => registry.resolveAction(ref)?.status !== "available");
    if (unavailable.length > 0) {
      deferred.push({ id, reason: `needs actions that are not available yet: ${unavailable.join(", ")}` });
      continue;
    }
    if (!workflow.industries.includes("*") && !workflow.industries.includes(profile.industry)) {
      issues.push(warning("WF_EXISTS", `workflow ${id} does not list industry ${profile.industry}`));
    }
    const reasons = brief.overrides.workflows
      ? ["explicit override in brief"]
      : profile.customerIntents
          .filter((intent) => registry.intentCatalog()?.intents.find((i) => i.id === intent.id)?.workflows.includes(id))
          .map((intent) => `intent:${intent.id} (${intent.source})`);
    selected.push({ id, version: workflow.version, name: workflow.name, reasons, actions: workflow.actions, entries: Object.keys(workflow.entries) });
  }

  const richMenu = brief.overrides.richMenu ?? profile.recommendedRichMenu;
  const menu = registry.menus.get(richMenu)?.asset;
  if (!menu) {
    issues.push(error("RM_ACTIONS_VALID", `rich menu ${richMenu} does not exist`));
  } else {
    const selectedIds = new Set(selected.map((w) => w.id));
    for (const item of menu.items) {
      if (item.action.type === "workflow" && !selectedIds.has(item.action.workflowId)) {
        issues.push(error("RM_ACTIONS_VALID", `rich menu ${richMenu} has a "${item.label}" button for ${item.action.workflowId}, which is not selected. Choose another menu or add a menu asset`));
      }
    }
  }

  const designPreset = brief.brand.preset ?? profile.recommendedDesignPresets[0];
  if (!registry.presets.has(designPreset)) issues.push(error("DS_CONTRAST", `design preset ${designPreset} does not exist`));

  return {
    plan: {
      selected,
      deferred,
      richMenu,
      designPreset,
      extensionPoints: selected.flatMap((w) => (registry.workflows.get(w.id)?.asset.extensionPoints ?? []).map((p) => ({ workflow: w.id, ...p }))),
    },
    issues,
  };
}
