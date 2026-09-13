import { getHealthStatus } from "./Health";
import { handleApiRequest } from "./Api";

/**
 * doGet/doPost entrypoints only — Api.ts owns all action dispatch/business
 * logic (Task 4 adds the first real action, GET_SITES; SUBMIT_REPORT is a
 * later task). Mirrors apps/salon-portfolio/gas/src/Code.ts's module
 * boundary: this file must never contain routing, validation, or business
 * logic itself.
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

// esbuild bundles this file into an IIFE, so top-level function
// declarations are not visible to the Apps Script trigger runtime unless
// explicitly attached to the real global object (same as salon's Code.ts).
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doGet = doGet;
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doPost = doPost;
