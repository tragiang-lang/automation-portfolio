import { getHealthStatus } from "./Health";
import { handleApiRequest } from "./Api";
import { setupDemoSheets } from "./SetupDemoSheets";

/**
 * doGet/doPost entrypoints only — per the module boundary in the Phase 0
 * spec (§B/§T), Code.ts must not contain routing, validation, or any
 * business logic itself. doPost only extracts the raw request body and
 * hands it to Api.ts's handleApiRequest, which owns the action dispatch
 * (Phase 3A implements only the "getConfig" action; every other action
 * name currently returns a VALIDATION_ERROR — see Api.ts).
 */
function doGet(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: getHealthStatus() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(
  e: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  const rawBody = e?.postData?.contents;
  const response = handleApiRequest(rawBody);
  return ContentService.createTextOutput(
    JSON.stringify(response),
  ).setMimeType(ContentService.MimeType.JSON);
}

// esbuild bundles this file into an IIFE (see esbuild.config.js), so
// top-level function declarations are not visible to the Apps Script
// trigger runtime unless explicitly attached to the real global object.
(globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }).doGet =
  doGet;
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doPost = doPost;
(
  globalThis as unknown as { setupDemoSheets: typeof setupDemoSheets }
).setupDemoSheets = setupDemoSheets;
