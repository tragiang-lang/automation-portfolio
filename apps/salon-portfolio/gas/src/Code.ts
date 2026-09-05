import { getHealthStatus } from "./Health";

/**
 * doGet/doPost entrypoints only — per the module boundary in the Phase 0
 * spec (§B/§T), Code.ts must not contain routing, validation, or any
 * business logic. Action-based routing (getConfig, createReservation, ...)
 * is added to Api.ts in a later phase; for Phase 1 this only proves the
 * deployed Web App responds.
 */
function doGet(): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data: getHealthStatus() }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(): GoogleAppsScript.Content.TextOutput {
  // Phase 1: no action routing yet. Every POST gets the same liveness
  // response as doGet until Api.ts implements the action dispatch (§G).
  return doGet();
}

// esbuild bundles this file into an IIFE (see esbuild.config.js), so
// top-level function declarations are not visible to the Apps Script
// trigger runtime unless explicitly attached to the real global object.
(globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }).doGet =
  doGet;
(
  globalThis as unknown as { doGet: typeof doGet; doPost: typeof doPost }
).doPost = doPost;
