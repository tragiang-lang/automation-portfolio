import { ConfigReader, CONFIG_SHEET } from "../../config/configReader";
import { ActionError, ERROR_CODES } from "../../lib/result";
import { assertHeaders, buildHeaderMap, objectToRow, rowsToObjects } from "../../lib/rowMapper";
import type { ActionContext, KeyValueCache, LineClient, LineMessage, Locker, Logger, Mailer, Row, RuntimeSchema, TableStore } from "../context";

/**
 * Thin Google Apps Script implementations of the context interfaces.
 * NOT unit tested (Google globals). Keep every function a near-literal
 * wrapper, with all logic in the pure, tested modules.
 *
 * Secrets and deployment values come only from Script Properties and are
 * never stored in source or in the spreadsheet:
 *   SPREADSHEET_ID, LINE_CHANNEL_ACCESS_TOKEN, WEBHOOK_KEY, API_ENABLED,
 *   RICH_MENU_IMAGE_FILE_ID
 */

export const SCRIPT_PROPERTIES = {
  SPREADSHEET_ID: "SPREADSHEET_ID",
  LINE_CHANNEL_ACCESS_TOKEN: "LINE_CHANNEL_ACCESS_TOKEN",
  WEBHOOK_KEY: "WEBHOOK_KEY",
  API_ENABLED: "API_ENABLED",
  RICH_MENU_IMAGE_FILE_ID: "RICH_MENU_IMAGE_FILE_ID",
} as const;

export function getScriptProperty(name: string): string | null {
  return PropertiesService.getScriptProperties().getProperty(name);
}

export function openSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id = getScriptProperty(SCRIPT_PROPERTIES.SPREADSHEET_ID);
  if (!id) {
    throw new ActionError(ERROR_CODES.CONFIG_INVALID, "Script Property SPREADSHEET_ID is not set");
  }
  return SpreadsheetApp.openById(id);
}

class SpreadsheetTableStore implements TableStore {
  constructor(
    private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
    private readonly schema: RuntimeSchema,
  ) {}

  private sheet(name: string): GoogleAppsScript.Spreadsheet.Sheet {
    const sheet = this.spreadsheet.getSheetByName(name);
    if (!sheet) {
      throw new ActionError(ERROR_CODES.SHEET_ERROR, `sheet ${name} not found`);
    }
    return sheet;
  }

  private headers(sheet: GoogleAppsScript.Spreadsheet.Sheet, name: string): unknown[] {
    const lastColumn = sheet.getLastColumn();
    const header = lastColumn === 0 ? [] : sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const required = this.schema.sheets.find((s) => s.name === name)?.required ?? [];
    assertHeaders(name, buildHeaderMap(header), required);
    return header;
  }

  hasSheet(name: string): boolean {
    return this.spreadsheet.getSheetByName(name) !== null;
  }

  readAll(name: string): Row[] {
    const sheet = this.sheet(name);
    const header = this.headers(sheet, name);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return rowsToObjects(buildHeaderMap(header), sheet.getRange(2, 1, lastRow - 1, header.length).getValues());
  }

  append(name: string, row: Row): void {
    const sheet = this.sheet(name);
    sheet.appendRow(objectToRow(this.headers(sheet, name).map(String), row));
  }

  update(name: string, keyColumn: string, keyValue: string, patch: Row): boolean {
    const sheet = this.sheet(name);
    const header = this.headers(sheet, name).map(String);
    const rows = this.readAll(name);
    const index = rows.findIndex((row) => String(row[keyColumn]) === keyValue);
    if (index === -1) return false;
    sheet.getRange(index + 2, 1, 1, header.length).setValues([objectToRow(header, { ...rows[index], ...patch })]);
    return true;
  }
}

const scriptCache: KeyValueCache = {
  get: (key) => CacheService.getScriptCache().get(key),
  put: (key, value, ttl) => CacheService.getScriptCache().put(key, value, ttl),
  remove: (key) => CacheService.getScriptCache().remove(key),
};

const scriptLock: Locker = {
  withLock<T>(fn: () => T): T {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new ActionError(ERROR_CODES.SYSTEM_BUSY, "could not acquire script lock");
    }
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  },
};

const mailer: Mailer = {
  send: (to, subject, body) => MailApp.sendEmail(to, subject, body),
};

const lineClient: LineClient = {
  reply(replyToken: string, messages: LineMessage[]): void {
    const token = getScriptProperty(SCRIPT_PROPERTIES.LINE_CHANNEL_ACCESS_TOKEN);
    if (!token) {
      throw new Error("Script Property LINE_CHANNEL_ACCESS_TOKEN is not set");
    }
    const response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ replyToken, messages }),
      muteHttpExceptions: true,
    });
    if (response.getResponseCode() >= 300) {
      throw new Error(`LINE reply failed with HTTP ${response.getResponseCode()}`);
    }
  },
};

const logger: Logger = {
  info: (event, context) => console.log(`[${event}]`, JSON.stringify(context ?? {})),
  error: (event, detail, context) => {
    try {
      console.error(`[${event}] ${detail}`, JSON.stringify(context ?? {}));
    } catch {
      // logging must never throw
    }
  },
};

export function createGasContext(schema: RuntimeSchema): ActionContext {
  const spreadsheet = openSpreadsheet();
  const tables = new SpreadsheetTableStore(spreadsheet, schema);
  let config: ConfigReader | undefined;
  return {
    tables,
    cache: scriptCache,
    lock: scriptLock,
    mailer,
    line: lineClient,
    logger,
    schema,
    config: () => (config ??= new ConfigReader(tables.readAll(CONFIG_SHEET), schema.configKeys)),
    now: () => new Date(),
    random: () => Math.random(),
  };
}
