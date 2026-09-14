import { ReportPhotoRow, ReportRow, SiteRow, WorkerRow, WorkTypeRow } from "./SheetSchemas";
import { Site } from "./models/Site";
import { Worker } from "./models/Worker";
import { SiteReport } from "./models/Report";
import { ReportPhoto } from "./models/ReportPhoto";
import { WorkType } from "./models/WorkType";

/**
 * Pure header-mapping and row<->object helpers shared by every sheet
 * repository. Never touches SpreadsheetApp — fed plain arrays so it is
 * fully Jest-testable (Phase 0 §Q, Phase 3A §15/§16).
 *
 * The row->domain-model mapping functions further down (mapSiteRow etc.,
 * Task 3) are the second, entity-specific stage of the pipeline: raw
 * sheet arrays become a generic *Row object via rowsToObjects above, then
 * one of these functions turns that *Row into the typed domain model
 * (Site/Worker/SiteReport/ReportPhoto) a caller actually works with.
 * Business-rule validation (required fields, allowed relationships) is a
 * separate, independent layer — see Validation.ts — deliberately not
 * duplicated here; these mappers only do structural type coercion
 * (trimming, empty-cell -> undefined, Date -> ISO string, numeric
 * parsing) and reject values that cannot be coerced at all rather than
 * silently producing a valid-looking object from malformed input.
 */

export class MissingHeadersError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required headers: ${missing.join(", ")}`);
    this.name = "MissingHeadersError";
  }
}

/** Thrown by the row->domain mappers below when a cell's value cannot be
 *  coerced into the type the domain model requires at all (not merely
 *  "missing" — an empty required field is a Validation.ts concern, this
 *  is for a value that is present but the wrong shape/kind). */
export class MalformedRowValueError extends Error {
  constructor(public readonly field: string, public readonly reason: string) {
    super(`Malformed value for "${field}": ${reason}`);
    this.name = "MalformedRowValueError";
  }
}

/** Maps header name -> zero-based column index, from a raw header row. */
export function buildHeaderMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, index) => {
    const key = String(cell).trim();
    if (key.length > 0) {
      map[key] = index;
    }
  });
  return map;
}

/** Throws MissingHeadersError listing every header in `required` that is
 *  absent from `headerMap` — fail clearly rather than write into the
 *  wrong column (Phase 3A §15). */
export function assertRequiredHeaders(
  headerMap: Record<string, number>,
  required: readonly string[],
): void {
  const missing = required.filter((header) => !(header in headerMap));
  if (missing.length > 0) {
    throw new MissingHeadersError(missing);
  }
}

/** Converts data rows (no header row) into plain objects keyed by header
 *  name, using only the columns named in `columns` — deterministic
 *  order, extra sheet columns are ignored. Throws MissingHeadersError if
 *  any required column is absent from the sheet's actual header row.
 *  `optionalColumns` (V1.1 Task 4) are included in the mapped object when
 *  the sheet's header row happens to have them, but are never passed to
 *  `assertRequiredHeaders` — a sheet from before an optional column
 *  existed never throws for its absence, which is what keeps adding a new
 *  presentation column backward compatible. */
export function rowsToObjects<T extends Record<string, unknown>>(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columns: readonly string[],
  optionalColumns: readonly string[] = [],
): T[] {
  assertRequiredHeaders(headerMap, columns);
  const presentOptionalColumns = optionalColumns.filter((column) => column in headerMap);
  return dataRows.map((row) => {
    const obj = {} as Record<string, unknown>;
    for (const column of columns) {
      const index = headerMap[column];
      obj[column] = row[index] ?? "";
    }
    for (const column of presentOptionalColumns) {
      const index = headerMap[column];
      obj[column] = row[index] ?? "";
    }
    return obj as T;
  });
}

/** Converts a plain object into a row array in `columns` order — the
 *  inverse of rowsToObjects. Empty/undefined/null values become ""
 *  (never "undefined" or "[object Object]"); non-primitive values throw
 *  so a caller must pre-format dates/objects into strings before this is
 *  called (Phase 3A §16). */
export function objectToRow(
  columns: readonly string[],
  obj: Record<string, unknown>,
): unknown[] {
  return columns.map((column) => {
    const value = obj[column];
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      throw new TypeError(
        `objectToRow: column "${column}" holds a non-primitive value; format it to a string/number/boolean before serializing.`,
      );
    }
    return value;
  });
}

/** Returns the 0-based index into `dataRows` of the first row whose
 *  `columnName` cell equals `value` (both sides compared as strings), or
 *  `null` if the column is absent from `headerMap` or no row matches.
 *  Pure — the shared seam behind both the idempotency Sheet backstop and
 *  locating a reservation row to update in place (Phase 4 Task 2). */
export function findRowIndexByColumnValue(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columnName: string,
  value: string,
): number | null {
  const columnIndex = headerMap[columnName];
  if (columnIndex === undefined) {
    return null;
  }
  const index = dataRows.findIndex((row) => String(row[columnIndex] ?? "") === value);
  return index === -1 ? null : index;
}

// --- Row -> domain model mapping (Task 3). Centralized coercion helpers
// below are shared by every mapXRow function so each cell type (text,
// optional text, timestamp, enum, count) is handled exactly one way
// across all four Site Report entities. ---

/** Coerces a cell value to plain text: strings are trimmed, numbers and
 *  booleans are stringified (spreadsheets commonly store text-looking IDs
 *  as numbers), a missing cell becomes "". Anything else (an object, a
 *  Date in a text column) is not a text value at all and is rejected. */
function toTrimmedString(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new MalformedRowValueError(field, `expected a text value, got ${typeof value}`);
}

/** Same as toTrimmedString, but an empty result becomes undefined — for
 *  fields the domain model declares optional. */
function toOptionalString(value: unknown, field: string): string | undefined {
  const trimmed = toTrimmedString(value, field);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Coerces a date/timestamp cell to an ISO 8601 string. Google Sheets
 *  returns a JS Date object for date-formatted cells, so that is the one
 *  extra shape accepted beyond a plain string; a missing cell becomes ""
 *  (Validation.ts's concern, not this function's) and anything else
 *  (number, boolean, object) is rejected outright. */
function toTimestamp(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  throw new MalformedRowValueError(field, `expected a date/timestamp value, got ${typeof value}`);
}

/** Coerces a cell to one of a fixed set of literal string values —
 *  the runtime guard a status/enum-typed domain field needs, since the
 *  raw cell is an arbitrary string as far as the type system is
 *  concerned. Rejects anything outside `allowed`, including "". */
function toEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const raw = toTrimmedString(value, field);
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new MalformedRowValueError(field, `expected one of ${allowed.join(", ")}, got "${raw}"`);
  }
  return raw as T;
}

/** Coerces a cell to a non-negative integer. Accepts a real number or a
 *  numeric string; rejects an empty cell, a non-numeric string, or a
 *  negative/non-integer value — a required count field silently becoming
 *  0 from a blank cell would be exactly the "malformed value converted
 *  into a valid-looking object" case Task 3 forbids. */
function toNonNegativeInteger(value: unknown, field: string): number {
  const num = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (String(value ?? "").trim().length > 0 && Number.isInteger(num) && num >= 0) {
    return num;
  }
  throw new MalformedRowValueError(field, `expected a non-negative integer, got "${value}"`);
}

/** Maps a SITES data row to a Site. */
export function mapSiteRow(row: SiteRow): Site {
  return {
    siteId: toTrimmedString(row.siteId, "siteId"),
    siteCode: toTrimmedString(row.siteCode, "siteCode"),
    name: toTrimmedString(row.name, "name"),
    address: toOptionalString(row.address, "address"),
    clientName: toOptionalString(row.clientName, "clientName"),
    status: toEnum(row.status, "status", ["ACTIVE", "INACTIVE"] as const),
    startDate: toOptionalString(row.startDate, "startDate"),
    endDate: toOptionalString(row.endDate, "endDate"),
    createdAt: toTimestamp(row.createdAt, "createdAt"),
    updatedAt: toTimestamp(row.updatedAt, "updatedAt"),
  };
}

/** Maps a WORKERS data row to a Worker. */
export function mapWorkerRow(row: WorkerRow): Worker {
  return {
    workerId: toTrimmedString(row.workerId, "workerId"),
    lineUserId: toTrimmedString(row.lineUserId, "lineUserId"),
    displayName: toTrimmedString(row.displayName, "displayName"),
    email: toOptionalString(row.email, "email"),
    role: toOptionalString(row.role, "role"),
    status: toEnum(row.status, "status", ["ACTIVE", "INACTIVE"] as const),
    createdAt: toTimestamp(row.createdAt, "createdAt"),
    updatedAt: toTimestamp(row.updatedAt, "updatedAt"),
  };
}

/** Maps a REPORTS data row to a SiteReport. */
export function mapReportRow(row: ReportRow): SiteReport {
  return {
    reportId: toTrimmedString(row.reportId, "reportId"),
    siteId: toTrimmedString(row.siteId, "siteId"),
    workerId: toOptionalString(row.workerId, "workerId"),
    lineUserId: toTrimmedString(row.lineUserId, "lineUserId"),
    workerName: toTrimmedString(row.workerName, "workerName"),
    reportDate: toTimestamp(row.reportDate, "reportDate"),
    workType: toTrimmedString(row.workType, "workType"),
    comment: toOptionalString(row.comment, "comment"),
    photoCount: toNonNegativeInteger(row.photoCount, "photoCount"),
    status: toEnum(row.status, "status", ["SUBMITTED"] as const),
    createdAt: toTimestamp(row.createdAt, "createdAt"),
    updatedAt: toTimestamp(row.updatedAt, "updatedAt"),
    workTypeName: toOptionalString(row.workTypeName, "workTypeName"),
  };
}

/** Maps a WORK_TYPES data row to a WorkType. */
export function mapWorkTypeRow(row: WorkTypeRow): WorkType {
  return {
    code: toTrimmedString(row.code, "code"),
    name: toTrimmedString(row.name, "name"),
    status: toEnum(row.status, "status", ["ACTIVE", "INACTIVE"] as const),
    sortOrder: toNonNegativeInteger(row.sortOrder, "sortOrder"),
  };
}

/** Maps a REPORT_PHOTOS data row to a ReportPhoto. */
export function mapReportPhotoRow(row: ReportPhotoRow): ReportPhoto {
  return {
    photoId: toTrimmedString(row.photoId, "photoId"),
    reportId: toTrimmedString(row.reportId, "reportId"),
    fileId: toTrimmedString(row.fileId, "fileId"),
    fileUrl: toTrimmedString(row.fileUrl, "fileUrl"),
    fileName: toTrimmedString(row.fileName, "fileName"),
    mimeType: toTrimmedString(row.mimeType, "mimeType"),
    createdAt: toTimestamp(row.createdAt, "createdAt"),
  };
}
