import { ConfigReader, CONFIG_SHEET } from "../../src/config/configReader";
import { ActionError, ERROR_CODES } from "../../src/lib/result";
import { assertHeaders, buildHeaderMap } from "../../src/lib/rowMapper";
import type { ActionContext, LineMessage, Row, RuntimeSchema, TableStore } from "../../src/services/context";

/**
 * In-memory stand-ins for every Google service. Test data here is
 * fictional: example.com addresses and 0000-prefixed LINE ids only, never
 * real customer data.
 */

export const TEST_SCHEMA: RuntimeSchema = {
  sheets: [
    { name: "CONFIG", columns: ["key", "value", "description"], required: ["key", "value"], primaryKey: "key" },
    {
      name: "CUSTOMERS",
      columns: ["customerId", "lineUserId", "name", "email", "phone", "createdAt", "updatedAt"],
      required: ["customerId", "createdAt"],
      primaryKey: "customerId",
    },
    {
      name: "INQUIRIES",
      columns: ["inquiryId", "submissionId", "createdAt", "customerId", "lineUserId", "name", "email", "phone", "message", "source", "status"],
      required: ["inquiryId", "submissionId", "createdAt", "message", "status"],
      primaryKey: "inquiryId",
    },
    {
      name: "SERVICES",
      columns: ["serviceId", "name", "category", "durationMinutes", "price", "description", "active", "displayOrder"],
      required: ["serviceId", "name", "active"],
      primaryKey: "serviceId",
    },
    {
      name: "RESERVATIONS",
      columns: [
        "reservationId", "submissionId", "createdAt", "updatedAt", "customerId", "lineUserId", "name", "email", "phone",
        "serviceId", "partySize", "date", "startTime", "endTime", "durationMinutes", "status", "source", "notes",
      ],
      required: ["reservationId", "submissionId", "date", "startTime", "endTime", "status"],
      primaryKey: "reservationId",
    },
  ],
  configKeys: [
    { key: "business.name", required: true, description: "店舗名" },
    { key: "reservation.slotMinutes", required: false, default: "30", description: "枠の間隔(分)" },
  ],
};

export class InMemoryTableStore implements TableStore {
  readonly sheets: Record<string, Row[]> = {};

  constructor(private readonly schema: RuntimeSchema = TEST_SCHEMA, omit: string[] = []) {
    for (const sheet of schema.sheets) {
      if (!omit.includes(sheet.name)) this.sheets[sheet.name] = [];
    }
  }

  private rows(name: string): Row[] {
    const rows = this.sheets[name];
    if (!rows) throw new ActionError(ERROR_CODES.SHEET_ERROR, `sheet ${name} not found`);
    return rows;
  }

  hasSheet(name: string): boolean {
    return name in this.sheets;
  }

  readAll(name: string): Row[] {
    return this.rows(name).map((row) => ({ ...row }));
  }

  append(name: string, row: Row): void {
    const sheet = this.schema.sheets.find((s) => s.name === name);
    if (sheet) assertHeaders(name, buildHeaderMap(sheet.columns), sheet.required);
    const clean: Row = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined) clean[key] = value;
    }
    this.rows(name).push(clean);
  }

  update(name: string, keyColumn: string, keyValue: string, patch: Row): boolean {
    const row = this.rows(name).find((r) => String(r[keyColumn]) === keyValue);
    if (!row) return false;
    Object.assign(row, patch);
    return true;
  }
}

export class MemoryCache {
  readonly store = new Map<string, string>();
  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  put(key: string, value: string): void {
    this.store.set(key, value);
  }
  remove(key: string): void {
    this.store.delete(key);
  }
}

export interface TestContext extends ActionContext {
  tables: InMemoryTableStore;
  cache: MemoryCache;
  mails: { to: string; subject: string; body: string }[];
  replies: { replyToken: string; messages: LineMessage[] }[];
  errors: { event: string; detail: string }[];
  lockCalls: number;
}

export function makeContext(
  options: { config?: Record<string, string>; now?: Date; omitSheets?: string[]; lockBusy?: boolean; mailFails?: boolean; schema?: RuntimeSchema } = {},
): TestContext {
  const schema = options.schema ?? TEST_SCHEMA;
  const tables = new InMemoryTableStore(schema, options.omitSheets ?? []);
  for (const [key, value] of Object.entries(options.config ?? { "business.name": "テストサロン" })) {
    tables.append(CONFIG_SHEET, { key, value, description: "" });
  }
  let seed = 1;
  const ctx: TestContext = {
    tables,
    cache: new MemoryCache(),
    mails: [],
    replies: [],
    errors: [],
    lockCalls: 0,
    schema,
    lock: {
      withLock<T>(fn: () => T): T {
        ctx.lockCalls++;
        if (options.lockBusy) throw new ActionError(ERROR_CODES.SYSTEM_BUSY);
        return fn();
      },
    },
    mailer: {
      send(to, subject, body) {
        if (options.mailFails) throw new Error("mail quota exceeded");
        ctx.mails.push({ to, subject, body });
      },
    },
    line: {
      reply(replyToken, messages) {
        ctx.replies.push({ replyToken, messages });
      },
    },
    logger: {
      info: () => undefined,
      error: (event, detail) => {
        ctx.errors.push({ event, detail });
      },
    },
    config: () => new ConfigReader(tables.readAll(CONFIG_SHEET), schema.configKeys),
    now: () => options.now ?? new Date("2026-10-01T00:00:00.000Z"),
    random: () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    },
  };
  return ctx;
}

/** Monday-to-Saturday 10:00-19:00, closed Sunday. `now` defaults to 2026-10-01 09:00 JST. */
export const RESERVATION_CONFIG: Record<string, string> = {
  "business.name": "テストサロン",
  "notification.ownerEmail": "owner@example.com",
  "hours.mon": "10:00-19:00",
  "hours.tue": "10:00-19:00",
  "hours.wed": "10:00-19:00",
  "hours.thu": "10:00-19:00",
  "hours.fri": "10:00-19:00",
  "hours.sat": "10:00-19:00",
  "hours.sun": "closed",
  "reservation.slotMinutes": "60",
  "reservation.defaultDurationMinutes": "60",
  "reservation.minLeadHours": "3",
  "reservation.maxDaysAhead": "30",
  "reservation.capacity": "1",
};

/** parse + run in one step, the way both routers invoke an action. */
export function runAction<I, O>(handler: { parse(payload: unknown): I; run(input: I, ctx: never): O }, payload: unknown, ctx: unknown): O {
  return handler.run(handler.parse(payload), ctx as never);
}
