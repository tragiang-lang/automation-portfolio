## Task 3: Timestamp helper and reservation ID generator

**Files:**
- Create: `apps/salon-portfolio/gas/src/Utils.ts`
- Create: `apps/salon-portfolio/gas/src/ids/ReservationId.ts` (replaces the empty `.gitkeep` scaffold)
- Test: `apps/salon-portfolio/gas/tests/Utils.test.ts`
- Test: `apps/salon-portfolio/gas/tests/ReservationId.test.ts`

**Interfaces:**
- Produces: `nowIso(clock?: () => Date): string`; `formatDateYYYYMMDDInTokyo(date: Date): string`; `RESERVATION_ID_PREFIX`; `generateRandomSuffix(random?: () => number): string`; `generateReservationId(now?: Date, random?: () => number): string`.

- [ ] **Step 1: Write the failing test `tests/Utils.test.ts`**

```ts
import { formatDateYYYYMMDDInTokyo, nowIso } from "../src/Utils";

describe("formatDateYYYYMMDDInTokyo", () => {
  it("formats a UTC instant that is still the previous day in Tokyo", () => {
    // 2026-01-01T14:59:00Z + 9h = 2026-01-01T23:59:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T14:59:00.000Z")),
    ).toBe("20260101");
  });

  it("formats a UTC instant that has already rolled into the next Tokyo day", () => {
    // 2026-01-01T15:00:00Z + 9h = 2026-01-02T00:00:00 JST
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-01-01T15:00:00.000Z")),
    ).toBe("20260102");
  });

  it("zero-pads single-digit months and days", () => {
    expect(
      formatDateYYYYMMDDInTokyo(new Date("2026-03-05T01:00:00.000Z")),
    ).toBe("20260305");
  });
});

describe("nowIso", () => {
  it("returns a valid ISO 8601 string from the injected clock", () => {
    const fixed = new Date("2026-06-01T00:00:00.000Z");
    const result = nowIso(() => fixed);
    expect(result).toBe("2026-06-01T00:00:00.000Z");
    expect(new Date(result).toISOString()).toBe(result);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: FAIL — `Cannot find module '../src/Utils'`.

- [ ] **Step 3: Write `Utils.ts`**

```ts
/**
 * Pure date/timezone helpers shared across the backend. The application
 * timezone is always Asia/Tokyo (Phase 0 §D) — never the server's local
 * timezone, never browser-locale-dependent formatting (Phase 3A §16/§18).
 *
 * Asia/Tokyo has used a fixed UTC+9 offset with no daylight saving since
 * 1951, so a plain offset is correct here (and avoids relying on `Intl`
 * timezone data, which is not guaranteed under this project's `ES2019`
 * lib target).
 */

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Current instant as an ISO 8601 UTC string — the canonical internal
 *  timestamp representation (Phase 3A §18). `clock` is injectable for
 *  deterministic tests. */
export function nowIso(clock: () => Date = () => new Date()): string {
  return clock().toISOString();
}

/** Formats a Date as YYYYMMDD in the Asia/Tokyo calendar day — used by
 *  ID generators (Phase 3A §17). */
export function formatDateYYYYMMDDInTokyo(date: Date): string {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoTime.getUTCFullYear();
  const month = String(tokyoTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(tokyoTime.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test `tests/ReservationId.test.ts`**

```ts
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd apps/salon-portfolio/gas && npx jest tests/ReservationId.test.ts`
Expected: FAIL — `Cannot find module '../src/ids/ReservationId'`.

- [ ] **Step 7: Write `ids/ReservationId.ts`** (delete the sibling `.gitkeep`)

```ts
import { formatDateYYYYMMDDInTokyo } from "../Utils";

/** Reservation ID prefix (Phase 0 §E Decision 4). */
export const RESERVATION_ID_PREFIX = "RES";

const ID_SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_SUFFIX_LENGTH = 6;

/** Generates a random, non-sequential six-character alphanumeric suffix
 *  from an injectable random source (defaults to Math.random) — Phase 3A
 *  §17. Not cryptographically secure; adequate for this v1 scale
 *  (collision probability is negligible against a single salon's daily
 *  reservation volume). */
export function generateRandomSuffix(
  random: () => number = Math.random,
): string {
  let suffix = "";
  for (let i = 0; i < ID_SUFFIX_LENGTH; i++) {
    const index = Math.floor(random() * ID_SUFFIX_ALPHABET.length);
    suffix += ID_SUFFIX_ALPHABET[index];
  }
  return suffix;
}

/** Generates a reservation ID in the fixed `RES-YYYYMMDD-XXXXXX` format
 *  (Phase 0 §E Decision 4): the date portion is today's date in
 *  Asia/Tokyo, and the suffix is six random alphanumeric characters —
 *  never derived from a sheet row number, never sequential. `now` and
 *  `random` are injectable for deterministic tests (Phase 3A §17). Only
 *  the generator is implemented here — no reservation row is created by
 *  this module or anywhere else in Phase 3A. */
export function generateReservationId(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const datePart = formatDateYYYYMMDDInTokyo(now);
  const suffix = generateRandomSuffix(random);
  return `${RESERVATION_ID_PREFIX}-${datePart}-${suffix}`;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/salon-portfolio/gas && npx jest tests/Utils.test.ts tests/ReservationId.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 9: Commit**

```bash
git add apps/salon-portfolio/gas/src/Utils.ts apps/salon-portfolio/gas/src/ids/ReservationId.ts apps/salon-portfolio/gas/tests/Utils.test.ts apps/salon-portfolio/gas/tests/ReservationId.test.ts
git rm apps/salon-portfolio/gas/src/ids/.gitkeep
git commit -m "feat(gas): add Asia/Tokyo timestamp helper and reservation ID generator"
```

---

