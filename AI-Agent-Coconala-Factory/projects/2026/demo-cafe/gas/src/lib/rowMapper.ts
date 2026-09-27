/**
 * Pure header-mapped row <-> object helpers. Same contract as the salon
 * apps' RowMapper.ts: fail loudly on missing headers (never write into the
 * wrong column), ignore extra columns, never serialize "undefined".
 */

export class MissingHeadersError extends Error {
  constructor(
    public readonly sheet: string,
    public readonly missing: string[],
  ) {
    super(`Sheet "${sheet}" is missing required headers: ${missing.join(", ")}`);
    this.name = "MissingHeadersError";
  }
}

export function buildHeaderMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, index) => {
    const key = String(cell ?? "").trim();
    if (key.length > 0 && !(key in map)) {
      map[key] = index;
    }
  });
  return map;
}

export function assertHeaders(sheet: string, headerMap: Record<string, number>, required: readonly string[]): void {
  const missing = required.filter((header) => !(header in headerMap));
  if (missing.length > 0) {
    throw new MissingHeadersError(sheet, missing);
  }
}

export function rowsToObjects(headerMap: Record<string, number>, dataRows: unknown[][]): Record<string, unknown>[] {
  const headers = Object.keys(headerMap);
  return dataRows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const header of headers) {
      obj[header] = row[headerMap[header]] ?? "";
    }
    return obj;
  });
}

/** Builds a row in the sheet's actual column order. Unknown object keys are
 *  ignored; non-primitive values throw so dates/objects must be formatted
 *  by the caller first. */
export function objectToRow(headerOrder: readonly string[], obj: Record<string, unknown>): unknown[] {
  return headerOrder.map((column) => {
    const value = obj[column];
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      throw new TypeError(`objectToRow: column "${column}" holds a non-primitive value`);
    }
    return value;
  });
}
