import {
  RESERVATION_ID_PREFIX,
  generateRandomSuffix,
  generateReservationId,
} from "../src/ids/ReservationId";

describe("generateRandomSuffix", () => {
  it("is exactly six characters", () => {
    expect(generateRandomSuffix()).toHaveLength(6);
  });

  it("only uses uppercase letters and digits", () => {
    expect(generateRandomSuffix()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("uses the injected random source deterministically", () => {
    const values = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
    let i = 0;
    const random = () => values[i++];
    expect(generateRandomSuffix(random)).toBe(
      generateRandomSuffix((() => {
        let j = 0;
        return () => values[j++];
      })()),
    );
  });
});

describe("generateReservationId", () => {
  it("matches the RES-YYYYMMDD-XXXXXX format", () => {
    const id = generateReservationId(new Date("2026-09-10T01:00:00.000Z"));
    expect(id).toMatch(/^RES-\d{8}-[A-Z0-9]{6}$/);
  });

  it("uses the Asia/Tokyo date, not the UTC date", () => {
    // 2026-09-09T15:30:00Z = 2026-09-10T00:30:00 JST
    const id = generateReservationId(new Date("2026-09-09T15:30:00.000Z"));
    expect(id.startsWith(`${RESERVATION_ID_PREFIX}-20260910-`)).toBe(true);
  });

  it("is not sequential — two calls with different random sources produce different suffixes", () => {
    const now = new Date("2026-09-10T01:00:00.000Z");
    const idA = generateReservationId(now, () => 0.1);
    const idB = generateReservationId(now, () => 0.9);
    expect(idA).not.toBe(idB);
  });
});
