import { error, Issue, warning } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import type { ClientBrief } from "../schemas/brief";

/**
 * Industry Specialist Agent (deterministic Phase 1 implementation).
 *
 * Input: the brief's industry, business type and requirement lines.
 * Output: industry-profile.json. Everything industry-specific comes from
 * the industry asset (core-assets/industries/**). This code only matches
 * requirements to customer intents and intents to workflows, so adding an
 * industry is a data change, not a code change.
 */

export interface DetectedIntent {
  id: string;
  description: string;
  source: "requirement" | "explicit" | "industry-default";
  evidence?: string;
}

export interface IndustryProfile {
  industry: string;
  industryAsset: string;
  displayName: string;
  businessType: string;
  customerIntents: DetectedIntent[];
  commonLineUseCases: string[];
  recommendedWorkflows: string[];
  recommendedActions: string[];
  recommendedRichMenu: string;
  recommendedRichMenuSections: { label: string; target: string }[];
  recommendedDesignPresets: string[];
  requiredSpreadsheetData: string[];
  notificationRequirements: string[];
  terminology: Record<string, string>;
  risks: string[];
  assumptions: string[];
}

function matchesKeyword(line: string, keyword: string): boolean {
  if (/^[\x00-\x7F]+$/.test(keyword)) {
    return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(line);
  }
  return line.includes(keyword);
}

export function analyzeIndustry(brief: ClientBrief, registry: CoreAssetRegistry): { profile: IndustryProfile | null; issues: Issue[] } {
  const issues: Issue[] = [];
  const industry = registry.industryFor(brief.industry);
  if (!industry) {
    return { profile: null, issues: [error("WF_EXISTS", `no industry profile for "${brief.industry}". Add core-assets/industries/<category>/<industry>-v1.json`)] };
  }
  const catalog = registry.intentCatalog();
  if (!catalog) return { profile: null, issues: [error("WF_EXISTS", "no customer intent catalog in core-assets/industries/common")] };

  const detected: DetectedIntent[] = [];
  const assumptions: string[] = [];
  const addIntent = (id: string, source: DetectedIntent["source"], evidence?: string) => {
    const intent = catalog.intents.find((candidate) => candidate.id === id);
    if (!intent) {
      issues.push(warning("WF_EXISTS", `unknown intent "${id}" ignored`));
      return;
    }
    if (!detected.some((d) => d.id === id)) detected.push({ id, description: intent.description, source, evidence });
  };

  for (const id of brief.intents) addIntent(id, "explicit");
  for (const line of brief.requirements) {
    const hits = catalog.intents.filter((intent) => intent.keywords.some((keyword) => matchesKeyword(line, keyword)));
    hits.forEach((intent) => addIntent(intent.id, "requirement", line));
    if (hits.length === 0) assumptions.push(`Requirement not mapped to a Phase 1 workflow (needs manual review): "${line}"`);
  }
  if (detected.length === 0) {
    industry.customerIntents.forEach((id) => addIntent(id, "industry-default"));
    assumptions.push(`No requirement matched a known intent; using the ${industry.id} default intents.`);
  }

  // Order workflows by the industry's recommendation, then any extra ones the intents asked for.
  const wanted = new Set(detected.flatMap((d) => catalog.intents.find((i) => i.id === d.id)?.workflows ?? []));
  const recommendedWorkflows = [...industry.recommendedWorkflows.filter((id) => wanted.has(id)), ...[...wanted].filter((id) => !industry.recommendedWorkflows.includes(id))];
  const recommendedActions = [...new Set(recommendedWorkflows.flatMap((id) => registry.workflows.get(id)?.asset.actions ?? []))];
  const menu = registry.menus.get(industry.recommendedRichMenu)?.asset;
  const sheets = [...new Set(recommendedWorkflows.flatMap((id) => registry.workflows.get(id)?.asset.spreadsheet.requiredSheets ?? []))];

  if (!brief.existingResources.some((r) => /line/i.test(r))) assumptions.push("Client must have (or create) a LINE Official Account with the Messaging API enabled.");
  if (!brief.existingResources.some((r) => /spreadsheet|sheets/i.test(r))) assumptions.push("A Google account for the Spreadsheet and Apps Script is required.");

  return {
    profile: {
      industry: industry.industry,
      industryAsset: `${industry.id}@${industry.version}`,
      displayName: industry.displayName,
      businessType: brief.businessType ?? industry.businessType,
      customerIntents: detected,
      commonLineUseCases: industry.lineUseCases,
      recommendedWorkflows,
      recommendedActions,
      recommendedRichMenu: industry.recommendedRichMenu,
      recommendedRichMenuSections: (menu?.items ?? []).map((item) => ({
        label: item.label,
        target: item.action.type === "workflow" ? `${item.action.workflowId}#${item.action.entry}` : `uri:${item.action.configKey}`,
      })),
      recommendedDesignPresets: industry.recommendedDesignPresets,
      requiredSpreadsheetData: [...sheets.map((sheet) => `sheet ${sheet}`), ...industry.requiredData],
      notificationRequirements: industry.notificationRequirements,
      terminology: industry.terminology,
      risks: industry.risks,
      assumptions,
    },
    issues,
  };
}
