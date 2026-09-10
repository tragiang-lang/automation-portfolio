/**
 * Pure header-mapping and row<->object helpers shared by every sheet
 * repository. Never touches SpreadsheetApp — fed plain arrays so it is
 * fully Jest-testable (Phase 0 §Q, Phase 3A §15/§16).
 */

export class MissingHeadersError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required headers: ${missing.join(", ")}`);
    this.name = "MissingHeadersError";
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
 *  any required column is absent from the sheet's actual header row. */
export function rowsToObjects<T extends Record<string, unknown>>(
  headerMap: Record<string, number>,
  dataRows: unknown[][],
  columns: readonly string[],
): T[] {
  assertRequiredHeaders(headerMap, columns);
  return dataRows.map((row) => {
    const obj = {} as Record<string, unknown>;
    for (const column of columns) {
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
