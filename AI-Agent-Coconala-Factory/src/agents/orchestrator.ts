import { businessRequirementsMd, deliveryMd, e2eTestMd, gasSetupMd, lineSetupMd, rollbackMd, setupMd, spreadsheetSetupMd } from "../generators/delivery";
import { generateGasProject } from "../generators/gasProject";
import { meta, TraceContext } from "../generators/meta";
import { buildLineRoutes, generateRichMenuConfig } from "../generators/richMenuConfig";
import { generateSpreadsheetSchema } from "../generators/spreadsheetSchema";
import { imageRecord, localRenderer } from "../richMenu/renderer";
import { DEPLOYMENT_FILE, deploymentDefinition, lineReadme, WEBHOOK_DIR, webhookFolder } from "../line/definition";
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
 *         → Spreadsheet Schema Generator → Rich Menu config → Rich Menu renderer
 *         → GAS Generator → LINE deployment definition + webhook proxy
 *         → delivery docs  (→ QA Agent + LINE QA, after the files are written)
 */

export const PIPELINE_STEPS = [
  "industry-specialist",
  "workflow-planner",
  "design-agent",
  "spreadsheet-schema-generator",
  "rich-menu-config-generator",
  "rich-menu-renderer",
  "gas-generator",
  "line-deployment-generator",
  "delivery-docs",
  "qa-agent",
  "line-qa",
] as const;

export interface PipelineResult {
  files: Record<string, string>;
  /** Binary artifacts (the rich-menu PNG). Kept apart so every text artifact stays a string. */
  binaries: Record<string, Uint8Array>;
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
  "rich-menu/rich-menu.png",
  "rich-menu/preview.svg",
  "rich-menu/image.json",
  "spreadsheet/schema.json",
  "spreadsheet/config-seed.json",
  "gas/",
  "line/deployment.json",
  "line/README.md",
  "line/webhook/",
  "delivery/SETUP.md",
  "delivery/SPREADSHEET_SETUP.md",
  "delivery/GAS_SETUP.md",
  "delivery/LINE_SETUP.md",
  "delivery/E2E_TEST.md",
  "delivery/ROLLBACK.md",
  "delivery/DELIVERY.md",
  "qa/qa-report.json",
  "qa/QA_REPORT.md",
  "qa/line-qa-report.json",
  "qa/LINE_QA_REPORT.md",
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
  if (registry.lineProxy) add(registry.lineProxy.id, registry.lineProxy.version);
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
  const binaries: Record<string, Uint8Array> = {};

  const { profile, issues: industryIssues } = analyzeIndustry(brief, registry);
  issues.push(...industryIssues);
  if (!profile) return { files, binaries, issues };

  const { plan, issues: planIssues } = planWorkflows(brief, profile, registry);
  issues.push(...planIssues);
  if (hasErrors(issues) || plan.selected.length === 0) {
    if (plan.selected.length === 0) issues.push(error("WF_EXISTS", "no workflow could be selected for this brief"));
    return { files, binaries, issues, profile, plan };
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
  const rendered = localRenderer.render(design);
  issues.push(...rendered.issues);
  const image = imageRecord(rendered, design);
  binaries["rich-menu/rich-menu.png"] = rendered.png;
  files["rich-menu/preview.svg"] = rendered.svg;
  files["rich-menu/image.json"] = toStableJson({ _meta: stamp("rich-menu/image.json", "rich-menu-renderer"), ...image });
  files["spreadsheet/schema.json"] = toStableJson({ _meta: stamp("spreadsheet/schema.json", "spreadsheet-schema-generator"), ...schema });
  files["spreadsheet/config-seed.json"] = toStableJson({ _meta: stamp("spreadsheet/config-seed.json", "spreadsheet-schema-generator"), values: configSeed });

  const gas = generateGasProject({ plan, registry, schema, configSeed, routes, menuConfig: stampedMenu, trace, slug: brief.project.slug });
  issues.push(...gas.issues);
  for (const [rel, content] of Object.entries(gas.files)) files[`gas/${rel}`] = content;

  const definition = deploymentDefinition({ plan, registry, menuConfig, image, meta: stamp(DEPLOYMENT_FILE, "line-deployment-generator") });
  const webhook = webhookFolder(registry, brief.project.slug, trace.project);
  issues.push(...definition.issues, ...webhook.issues);
  files[DEPLOYMENT_FILE] = toStableJson(definition.json);
  files["line/README.md"] = lineReadme(trace.project, menuConfig.name);
  for (const [rel, content] of Object.entries(webhook.files)) files[`${WEBHOOK_DIR}/${rel}`] = content;

  const deliveryInputs = { brief, profile, plan, schema, configSeed, menuConfig, routes, image, trace, artifacts: ARTIFACTS };
  files["delivery/SETUP.md"] = setupMd(deliveryInputs);
  files["delivery/SPREADSHEET_SETUP.md"] = spreadsheetSetupMd(deliveryInputs);
  files["delivery/GAS_SETUP.md"] = gasSetupMd(deliveryInputs);
  files["delivery/LINE_SETUP.md"] = lineSetupMd(deliveryInputs);
  files["delivery/E2E_TEST.md"] = e2eTestMd(deliveryInputs);
  files["delivery/ROLLBACK.md"] = rollbackMd(deliveryInputs);
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
    generatedFiles: [...Object.keys(files), ...Object.keys(binaries), "project.json"].sort(),
  });

  return { files, binaries, issues, profile, plan, trace };
}
