/**
 * Pure part of rich-menu registration: the generated menu-config carries a
 * `_meta` traceability block that the LINE API would reject, so strip it
 * and anything else that is not a LINE rich-menu field.
 */

export interface LineRichMenu {
  size: { width: number; height: number };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: { bounds: { x: number; y: number; width: number; height: number }; action: Record<string, unknown> }[];
}

export function toLineRichMenuPayload(menuConfig: LineRichMenu & Record<string, unknown>): LineRichMenu {
  return {
    size: menuConfig.size,
    selected: menuConfig.selected,
    name: menuConfig.name,
    chatBarText: menuConfig.chatBarText,
    areas: menuConfig.areas.map((area) => ({ bounds: area.bounds, action: area.action })),
  };
}
