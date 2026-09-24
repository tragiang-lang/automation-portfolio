import { contrastRatio } from "../lib/contrast";
import type { CoreAssetRegistry } from "../registry/registry";
import type { Bounds, ColorTokens } from "../schemas/assets";
import type { ClientBrief } from "../schemas/brief";
import type { IndustryProfile } from "./industrySpecialist";
import type { WorkflowPlan } from "./workflowPlanner";

/**
 * Design Agent: combines the menu structure (business meaning), the
 * layout (geometry) and the design preset (visual direction) with the
 * client's brand into rich-menu-design-spec.json. The spec is the only
 * input of the image renderer (src/richMenu/), which draws rich-menu.png
 * from it; a designer or an optional design-tool adapter can use it too.
 *
 * The layers stay separate: this spec never contains LINE action payloads,
 * and menu-config.json (LINE layer) never contains colors.
 */

export interface DesignCell {
  slot: string;
  bounds: Bounds;
  label: string;
  subLabel?: string;
  role: "primary" | "secondary";
  ctaRank: number;
  emphasis: "hero" | "normal";
  icon: { name: string; style: string };
  fill: string;
  labelColor: string;
  contrastRatio: number;
  /** Colors of the other drawn elements, decided here so the renderer never picks colors itself. */
  subLabelColor: string;
  iconColor: string;
  borderColor: string;
}

export interface DesignSpec {
  canvas: { width: number; height: number };
  layout: string;
  richMenu: string;
  preset: string;
  brand: { name: string; tone?: string };
  colorTokens: ColorTokens;
  typography: { direction: string; headingStyle: string; labelWeight: string; minLabelPx: number };
  spacing: { gutterPx: number; tilePaddingPx: number; cornerRadiusPx: number };
  visualHierarchy: string;
  ctaHierarchy: string[];
  cells: DesignCell[];
  iconRequirements: string[];
  assetRequirements: string[];
  exportRequirements: { format: string; maxBytes: number; width: number; height: number };
  designNotes: string[];
}

export function designRichMenu(brief: ClientBrief, profile: IndustryProfile, plan: WorkflowPlan, registry: CoreAssetRegistry): DesignSpec {
  const menu = registry.menus.get(plan.richMenu)!.asset;
  const layout = registry.layouts.get(menu.layout)!.asset;
  const preset = registry.presets.get(plan.designPreset)!.asset;
  const colors: ColorTokens = { ...preset.colors, ...(brief.brand.colors ?? {}) };

  const ordered = [...menu.items].sort((a, b) => (a.role === b.role ? a.slot.localeCompare(b.slot) : a.role === "primary" ? -1 : 1));
  const cells: DesignCell[] = menu.items.map((item) => {
    const slot = layout.slots.find((s) => s.id === item.slot)!;
    const primary = item.role === "primary";
    const fill = primary ? colors.primary : colors.surface;
    const labelColor = primary ? colors.onPrimary : colors.text;
    return {
      slot: item.slot,
      bounds: slot.bounds,
      label: item.label,
      subLabel: item.subLabel,
      role: item.role,
      ctaRank: ordered.indexOf(item) + 1,
      emphasis: slot.emphasis,
      icon: { name: item.icon, style: preset.iconStyle },
      fill,
      labelColor,
      contrastRatio: contrastRatio(labelColor, fill),
      subLabelColor: primary ? colors.onPrimary : colors.muted,
      iconColor: primary ? colors.onPrimary : colors.accent,
      borderColor: primary ? colors.primary : colors.border,
    };
  });

  const overridden = Object.keys(brief.brand.colors ?? {});
  return {
    canvas: layout.size,
    layout: layout.id,
    richMenu: menu.id,
    preset: preset.id,
    brand: { name: brief.brand.name, tone: brief.brand.tone },
    colorTokens: colors,
    typography: preset.typography,
    spacing: preset.spacing,
    visualHierarchy: preset.hierarchy,
    ctaHierarchy: cells.slice().sort((a, b) => a.ctaRank - b.ctaRank).map((c) => c.label),
    cells,
    iconRequirements: [...new Set(menu.items.map((i) => i.icon))].map((icon) => `${icon} icon, ${preset.iconStyle}, at least 160px, readable at phone size`),
    assetRequirements: [
      `One ${layout.size.width}x${layout.size.height}px image containing every button (LINE uses one image per rich menu)`,
      brief.brand.logoAvailable ? "Client logo (SVG or PNG with transparent background) may go in the primary tile" : "No logo supplied. Use the business name as text",
      `Imagery: ${preset.imagery}`,
    ],
    exportRequirements: { format: "PNG or JPEG", maxBytes: 1024 * 1024, width: layout.size.width, height: layout.size.height },
    designNotes: [
      `Buttons are tapped on phones: keep labels at least ${preset.typography.minLabelPx}px on the ${layout.size.width}px canvas.`,
      "Button areas are fixed by the layout bounds below. Draw each label inside its own cell so the tap area matches what the customer sees.",
      `Button style: ${preset.buttonStyle}.`,
      `Industry: ${profile.displayName}. Terminology: ${Object.entries(profile.terminology).map(([k, v]) => `${k}=${v}`).join(", ")}.`,
      overridden.length > 0 ? `Brand color overrides applied: ${overridden.join(", ")}.` : `Colors are the ${preset.name} preset defaults.`,
    ],
  };
}
