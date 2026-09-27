import { CONFIG_SHEET } from "../../config/configReader";
import { LineRichMenu, toLineRichMenuPayload } from "../../setup/richMenuSetup";
import { planSpreadsheetSetup, SetupStep } from "../../setup/spreadsheetSetup";
import type { RuntimeSchema } from "../context";
import { getScriptProperty, openSpreadsheet, SCRIPT_PROPERTIES } from "./gasContext";

/**
 * Thin GAS adapters for the two one-time setup functions an owner or
 * installer runs from the Apps Script editor. NOT unit tested (Google
 * globals). The planning logic is in setup/*.ts and is tested.
 */

export function applySpreadsheetSetup(schema: RuntimeSchema, configSeed: Record<string, string>): SetupStep[] {
  const spreadsheet = openSpreadsheet();
  spreadsheet.setSpreadsheetTimeZone("Asia/Tokyo");
  const headers: Record<string, string[]> = {};
  for (const sheet of spreadsheet.getSheets()) {
    const lastColumn = sheet.getLastColumn();
    headers[sheet.getName()] = lastColumn === 0 ? [] : sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  }
  const configSheet = spreadsheet.getSheetByName(CONFIG_SHEET);
  const configKeys =
    configSheet && configSheet.getLastRow() > 1
      ? configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 1).getValues().map((row) => String(row[0]).trim())
      : [];

  const steps = planSpreadsheetSetup(schema, { headers, configKeys }, configSeed);
  for (const step of steps) {
    if (step.kind === "createSheet") {
      const sheet = spreadsheet.insertSheet(step.sheet);
      sheet.getRange(1, 1, 1, step.headers.length).setValues([step.headers]).setFontWeight("bold");
      sheet.setFrozenRows(1);
      // Plain-text columns stop Sheets from auto-converting dates/times/phone numbers.
      sheet.getRange(1, 1, sheet.getMaxRows(), step.headers.length).setNumberFormat("@");
    } else if (step.kind === "appendHeaders") {
      const sheet = spreadsheet.getSheetByName(step.sheet)!;
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, step.headers.length).setValues([step.headers]).setFontWeight("bold");
    } else {
      spreadsheet.getSheetByName(CONFIG_SHEET)!.appendRow([step.key, step.value, step.description]);
    }
  }
  console.log(`[setupSpreadsheet] applied ${steps.length} step(s)`);
  return steps;
}

export function registerRichMenu(menuConfig: LineRichMenu & Record<string, unknown>): string {
  const token = getScriptProperty(SCRIPT_PROPERTIES.LINE_CHANNEL_ACCESS_TOKEN);
  const imageFileId = getScriptProperty(SCRIPT_PROPERTIES.RICH_MENU_IMAGE_FILE_ID);
  if (!token || !imageFileId) {
    throw new Error("Set Script Properties LINE_CHANNEL_ACCESS_TOKEN and RICH_MENU_IMAGE_FILE_ID first.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  const created = UrlFetchApp.fetch("https://api.line.me/v2/bot/richmenu", {
    method: "post",
    contentType: "application/json",
    headers,
    payload: JSON.stringify(toLineRichMenuPayload(menuConfig)),
  });
  const richMenuId = (JSON.parse(created.getContentText()) as { richMenuId: string }).richMenuId;
  const image = DriveApp.getFileById(imageFileId).getBlob();
  UrlFetchApp.fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "post",
    contentType: image.getContentType() ?? "image/png",
    headers,
    payload: image.getBytes(),
  });
  UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: "post", headers });
  console.log(`[setupRichMenu] registered default rich menu ${richMenuId}`);
  return richMenuId;
}
