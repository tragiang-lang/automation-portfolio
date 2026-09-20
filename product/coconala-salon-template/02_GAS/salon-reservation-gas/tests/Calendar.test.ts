import { toBusyInterval } from "../src/Calendar";

describe("toBusyInterval", () => {
  it("formats start/end as Tokyo-local strings", () => {
    expect(toBusyInterval(new Date("2026-09-10T01:00:00.000Z"), new Date("2026-09-10T02:00:00.000Z"))).toEqual({
      start: "2026-09-10T10:00",
      end: "2026-09-10T11:00",
      staffId: undefined,
    });
  });

  it("carries an optional staffId through unchanged", () => {
    expect(toBusyInterval(new Date("2026-09-10T01:00:00.000Z"), new Date("2026-09-10T02:00:00.000Z"), "ST001").staffId).toBe(
      "ST001",
    );
  });
});
