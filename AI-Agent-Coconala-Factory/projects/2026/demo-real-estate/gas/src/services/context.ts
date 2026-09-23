import { ConfigReader } from "../config/configReader";

/**
 * Every Google global (SpreadsheetApp, CacheService, LockService, MailApp,
 * UrlFetchApp) sits behind one of these interfaces. Actions and services
 * depend only on the interfaces. `services/gas/*` has the thin real
 * implementations, which are not unit tested. Tests use in-memory fakes
 * (tests/support/fakes.ts).
 */

export type Row = Record<string, unknown>;

/** Runtime view of the generated spreadsheet schema (generated/schema.ts). */
export interface RuntimeSheet {
  name: string;
  columns: string[];
  required: string[];
  primaryKey?: string;
}

export interface RuntimeConfigKey {
  key: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface RuntimeSchema {
  sheets: RuntimeSheet[];
  configKeys: RuntimeConfigKey[];
}

export interface TableStore {
  /** All data rows of a sheet as header-keyed objects. */
  readAll(sheet: string): Row[];
  append(sheet: string, row: Row): void;
  /** Updates the first row whose `keyColumn` equals `keyValue`; returns false if none matched. */
  update(sheet: string, keyColumn: string, keyValue: string, patch: Row): boolean;
  hasSheet(sheet: string): boolean;
}

export interface KeyValueCache {
  get(key: string): string | null;
  put(key: string, value: string, ttlSeconds: number): void;
  remove(key: string): void;
}

export interface Locker {
  /** Runs `fn` under the script-wide lock; throws ActionError(SYSTEM_BUSY) if it cannot be acquired. */
  withLock<T>(fn: () => T): T;
}

export interface Mailer {
  send(to: string, subject: string, body: string): void;
}

export type LineMessage = { type: "text"; text: string; quickReply?: unknown };

export interface LineClient {
  reply(replyToken: string, messages: LineMessage[]): void;
}

export interface Logger {
  info(event: string, context?: Record<string, unknown>): void;
  /** Must never throw. `context` may carry ids, never contact details or message bodies. */
  error(event: string, detail: string, context?: Record<string, unknown>): void;
}

export interface ActionContext {
  tables: TableStore;
  cache: KeyValueCache;
  lock: Locker;
  mailer: Mailer;
  line: LineClient;
  logger: Logger;
  schema: RuntimeSchema;
  /** Lazily loaded CONFIG sheet reader. */
  config(): ConfigReader;
  now(): Date;
  random(): number;
}
