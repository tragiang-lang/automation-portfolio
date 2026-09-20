import { SHEET_NAMES, SheetName } from "../src/SheetNames";
import {
  REQUIRED_HEADERS,
  SERVICES_HEADERS,
  SERVICES_OPTIONAL_HEADERS,
  STAFF_HEADERS,
  STAFF_OPTIONAL_HEADERS,
} from "../src/SheetSchemas";
import { DEMO_SHEETS } from "../src/DemoSeed";
import { buildAppConfigFromRawRows } from "../src/ConfigStore";
import { ConfigRow } from "../src/SheetSchemas";

describe("DEMO_SHEETS", () => {
  it("covers every canonical sheet name exactly once", () => {
    const names = DEMO_SHEETS.map((seed) => seed.name).sort();
    expect(names).toEqual(Object.values(SHEET_NAMES).sort());
  });

  it("each non-catalog seed's headers match that sheet's REQUIRED_HEADERS exactly", () => {
    const catalogSheets: SheetName[] = [SHEET_NAMES.SERVICES, SHEET_NAMES.STAFF];
    DEMO_SHEETS.filter((seed) => !catalogSheets.includes(seed.name)).forEach((seed) => {
      expect(seed.headers).toEqual(REQUIRED_HEADERS[seed.name]);
    });
  });

  it("SERVICES/STAFF seed headers extend REQUIRED_HEADERS with their optional presentation columns (V1.1 Task 4)", () => {
    const servicesSeed = DEMO_SHEETS.find((s) => s.name === SHEET_NAMES.SERVICES)!;
    const staffSeed = DEMO_SHEETS.find((s) => s.name === SHEET_NAMES.STAFF)!;
    expect(servicesSeed.headers).toEqual([...SERVICES_HEADERS, ...SERVICES_OPTIONAL_HEADERS]);
    expect(staffSeed.headers).toEqual([...STAFF_HEADERS, ...STAFF_OPTIONAL_HEADERS]);
  });

  it("every demo row has exactly as many cells as there are headers", () => {
    DEMO_SHEETS.forEach((seed) => {
      seed.rows.forEach((row) => {
        expect(row).toHaveLength(seed.headers.length);
      });
    });
  });

  it("transactional sheets (RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG, ERROR_LOG) get no fabricated rows", () => {
    const transactional = [
      SHEET_NAMES.RESERVATIONS,
      SHEET_NAMES.CANCELLATION_REQUESTS,
      SHEET_NAMES.INQUIRIES,
      SHEET_NAMES.EMAIL_LOG,
      SHEET_NAMES.ERROR_LOG,
    ] as const;
    DEMO_SHEETS.filter((seed) =>
      transactional.includes(seed.name as never),
    ).forEach((seed) => {
      expect(seed.rows).toEqual([]);
    });
  });

  it("the CONFIG demo rows produce a valid AppConfig end-to-end", () => {
    const configSeed = DEMO_SHEETS.find((s) => s.name === SHEET_NAMES.CONFIG)!;
    const holidaysSeed = DEMO_SHEETS.find(
      (s) => s.name === SHEET_NAMES.HOLIDAYS,
    )!;
    const configRows: ConfigRow[] = configSeed.rows.map((row) => ({
      Key: row[0],
      Value: row[1],
      Description: row[2],
    }));
    const holidayDates = holidaysSeed.rows.map((row) => String(row[0]));
    expect(() =>
      buildAppConfigFromRawRows(configRows, holidayDates),
    ).not.toThrow();
  });
});
