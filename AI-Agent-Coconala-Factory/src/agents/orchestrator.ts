import { businessRequirementsMd, deliveryMd, setupMd } from "../generators/delivery";
import { generateGasProject } from "../generators/gasProject";
import { meta, TraceContext } from "../generators/meta";
import { buildLineRoutes, generateRichMenuConfig } from "../generators/richMenuConfig";
import { generateSpreadsheetSchema } from "../generators/spreadsheetSchema";
import { toStableJson } from "../lib/fsx";
import { error, hasErrors, Issue } from "../lib/issues";
import type { CoreAssetRegistry } from "../registry/registry";
import { ClientBrief, clientBrief } from "../schemas/brief";
import { designRichMenu } from "./designAgent";
import { analyzeIndustry, IndustryProfile } from "./industrySpecialist";
import { planWorkflows, WorkflowPlan } from "./workflowPlanner";

/**
 * Orchestrator Agent: runs the Phase 1 pipeline in order and returns every
 * artifact as an in-memory file map. It holds no industry knowledge of its
 * own. Each step's knowledge lives in the agent or generator it calls, and
 * ultimately in the Core Assets. Writing to disk and QA happen afterwards
 * (see src/project.ts), so the pipeline itself is pure and easy to test.
 *
 *   brief → Industry Specialist → Workflow Planner → Design Agent
 *         → Spreadsheet Schema Generator → Rich Menu config → GAS Generator
 *         → delivery docs  (→ QA Agent, after the files are written)
 */

export const PIPELINE_STEPS = [
  "industry-specialist",
  "workflow-planner",
  "design-agent",
  "spreadsheet-schema-generator",
  "rich-menu-config-generator",
  "gas-generator",
  "delivery-docs",
  "qa-agent",
] as const;

export interface PipelineResult {
  files: Record<string, string>;
  issues: Issue[];
  profile?: IndustryProfile;
  plan?: WorkflowPlan;
  trace?: TraceContext;
}

export const ARTIFACTS = [
  "project.json",
  "brief/brief.json",
  "brief/business-requirements.md",
  "analysis/industry-profile.json",
  "workflow/selected-workflows.json",
  "workflow/workflow.json",
  "rich-menu/design-spec.json",
  "rich-menu/menu-config.json",
  "spreadsheet/schema.json",
  "spreadsheet/config-seed.json",
  "gas/",
  "delivery/SETUP.md",
  "delivery/DELIVERY.md",
  "qa/qa-report.json",
  "qa/QA_REPORT.md",
];

export function parseBrief(raw: unknown): { brief?: ClientBrief; issues: Issue[] } {
  const parsed = clientBrief.safeParse(raw);
  if (!parsed.success) {
    return { issues: parsed.error.issues.map((i) => error("BRIEF_INVALID", `${i.path.join(".") || "(root)"}: ${i.message}`, "brief")) };
  }
  return { brief: parsed.data, issues: [] };
}

function traceFor(brief: ClientBrief, plan: WorkflowPlan, registry: CoreAssetRegistry): TraceContext {
  const assets: Record<string, string> = {};
  const add = (id: string, version: string | undefined) => {
    if (version) assets[id] = version;
  };
  const industry = registry.industryFor(brief.industry)!;
  add(industry.id, industry.version);
  const catalog = registry.intentCatalog();
  if (catalog) add(catalog.id, catalog.version);
  for (const selected of plan.selected) {
    const workflow = registry.workflows.get(selected.id)!.asset;
    add(workflow.id, workflow.version);
    for (const ref of workflow.actions) add(ref, registry.resolveAction(ref)?.version);
    for (const schemaId of workflow.spreadsheet.schemas) add(schemaId, registry.schemas.get(schemaId)?.asset.version);
  }
  const menu = registry.menus.get(plan.richMenu)?.asset;
  if (menu) {
    add(menu.id, menu.version);
    add(menu.layout, registry.layouts.get(menu.layout)?.asset.version);
  }
  add(plan.designPreset, registry.presets.get(plan.designPreset)?.asset.version);
  if (registry.gasModules) add(registry.gasModules.id, registry.gasModules.version);
  const sorted = Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)));
  return {
    project: `${brief.project.year}/${brief.project.slug}`,
    industry: brief.industry,
    workflows: plan.selected.map((w) => `${w.id}@${w.version}`),
    assets: sorted,
  };
}

export function runPipeline(brief: ClientBrief, registry: CoreAssetRegistry, options: { createdOn: string }): PipelineResult {
  const issues: Issue[] = [];
  const files: Record<string, string> = {};

  const { profile, issues: industryIssues } = analyzeIndustry(brief, registry);
  issues.push(...industryIssues);
  if (!profile) return { files, issues };

  const { plan, issues: planIssues } = planWorkflows(brief, profile, registry);
  issues.push(...planIssues);
  if (hasErrors(issues) || plan.selected.length === 0) {
    if (plan.selected.length === 0) issues.push(error("WF_EXISTS", "no workflow could be selected for this brief"));
    return { files, issues, profile, plan };
  }

  const trace = traceFor(brief, plan, registry);
  const stamp = (artifact: string, by: string) => meta(artifact, by, trace);

  const design = designRichMenu(brief, profile, plan, registry);
  const { schema, configSeed, issues: schemaIssues } = generateSpreadsheetSchema(plan, registry, brief);
  const { menuConfig, issues: menuIssues } = generateRichMenuConfig(plan, registry, brief);
  const routes = buildLineRoutes(plan, registry);
  issues.push(...schemaIssues, ...menuIssues);

  const stampedMenu = { _meta: stamp("rich-menu/menu-config.json", "rich-menu-config-generator"), ...menuConfig };
  const workflows = plan.selected.map((s) => registry.workflows.get(s.id)!.asset);
  const actions = [...new Set(workflows.flatMap((w) => w.actions))].map((ref) => registry.resolveAction(ref)!);

  files["brief/brief.json"] = toStableJson(brief);
  files["brief/business-requirements.md"] = businessRequirementsMd(brief, trace);
  files["analysis/industry-profile.json"] = toStableJson({ _meta: stamp("analysis/industry-profile.json", "industry-specialist"), ...profile });
  files["workflow/selected-workflows.json"] = toStableJson({ _meta: stamp("workflow/selected-workflows.json", "workflow-planner"), ...plan });
  files["workflow/workflow.json"] = toStableJson({ _meta: stamp("workflow/workflow.json", "workflow-planner"), workflows, actions });
  files["rich-menu/design-spec.json"] = toStableJson({ _meta: stamp("rich-menu/design-spec.json", "design-agent"), ...design });
  files["rich-menu/menu-config.json"] = toStableJson(stampedMenu);
  files["spreadsheet/schema.json"] = toStableJson({ _meta: stamp("spreadsheet/schema.json", "spreadsheet-schema-generator"), ...schema });
  files["spreadsheet/config-seed.json"] = toStableJson({ _meta: stamp("spreadsheet/config-seed.json", "spreadsheet-schema-generator"), values: configSeed });

  const gas = generateGasProject({ plan, registry, schema, configSeed, routes, menuConfig: stampedMenu, trace, slug: brief.project.slug });
  issues.push(...gas.issues);
  for (const [rel, content] of Object.entries(gas.files)) files[`gas/${rel}`] = content;

  const deliveryInputs = { brief, profile, plan, schema, configSeed, menuConfig, trace, artifacts: ARTIFACTS };
  files["delivery/SETUP.md"] = setupMd(deliveryInputs);
  files["delivery/DELIVERY.md"] = deliveryMd(deliveryInputs);

  files["project.json"] = toStableJson({
    _meta: stamp("project.json", "orchestrator"),
    slug: brief.project.slug,
    clientName: brief.project.clientName,
    year: brief.project.year,
    createdOn: options.createdOn,
    industry: brief.industry,
    pipeline: PIPELINE_STEPS,
    artifacts: ARTIFACTS,
    generatedFiles: Object.keys(files).concat("project.json").sort(),
  });

  return { files, issues, profile, plan, trace };
}
