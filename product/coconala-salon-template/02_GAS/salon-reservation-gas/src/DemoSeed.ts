import { SHEET_NAMES, SheetName } from "./SheetNames";
import {
  CANCELLATION_REQUESTS_HEADERS,
  CONFIG_HEADERS,
  EMAIL_LOG_HEADERS,
  ERROR_LOG_HEADERS,
  HOLIDAYS_HEADERS,
  INQUIRIES_HEADERS,
  RESERVATIONS_HEADERS,
  SERVICES_HEADERS,
  SERVICES_OPTIONAL_HEADERS,
  STAFF_HEADERS,
  STAFF_OPTIONAL_HEADERS,
} from "./SheetSchemas";

export interface DemoSheetSeed {
  name: SheetName;
  headers: readonly string[];
  rows: unknown[][];
}

/** Safe, non-production demo data for schema/data-layer verification
 *  (Phase 3A §21/§22) — never real customer information. Transactional
 *  sheets (RESERVATIONS, CANCELLATION_REQUESTS, INQUIRIES, EMAIL_LOG,
 *  ERROR_LOG) get their header row only; seeding fake transactional
 *  records would misrepresent real business activity. */
export const DEMO_SHEETS: DemoSheetSeed[] = [
  {
    name: SHEET_NAMES.CONFIG,
    headers: CONFIG_HEADERS,
    rows: [
      ["business.name", "Demo Salon", "店舗名"],
      ["business.nameLatin", "Demo Salon", "店舗名（ローマ字・任意）"],
      ["business.tagline", "丁寧な施術と、心地よいひとときを。", "キャッチコピー（任意）"],
      ["business.phone", "03-0000-0000", "電話番号"],
      ["business.email", "owner@example.com", "店舗メール"],
      ["business.address", "東京都千代田区1-1-1", "住所"],
      ["business.postalCode", "〒100-0001", "郵便番号（任意）"],
      ["hours.monday", "10:00-19:00", "月曜営業時間"],
      ["hours.tuesday", "10:00-19:00", "火曜営業時間"],
      ["hours.wednesday", "10:00-19:00", "水曜営業時間"],
      ["hours.thursday", "10:00-19:00", "木曜営業時間"],
      ["hours.friday", "10:00-19:00", "金曜営業時間"],
      ["hours.saturday", "10:00-18:00", "土曜営業時間"],
      ["hours.sunday", "closed", "日曜営業時間（定休日）"],
      ["reservation.timezone", "Asia/Tokyo", "タイムゾーン"],
      ["reservation.slotMinutes", 30, "予約枠の単位（分）"],
      ["reservation.minLeadHours", 1, "予約締切（時間前）"],
      ["reservation.maxBookingDays", 60, "予約可能期間（日）"],
      ["features.contactForm", true, "問い合わせ受付"],
      ["features.reservation", true, "予約受付"],
      ["features.staffSelection", true, "スタッフ指名"],
      ["features.calendar", true, "カレンダー連携"],
      ["features.emailNotification", true, "メール通知"],
      ["staff.anyAvailableOption", true, "指名なし（お任せ）を表示"],
      ["social.instagram", "", "InstagramのURL（任意・空欄可）"],
      ["social.line", "", "LINEのURL（任意・空欄可）"],
      ["calendar.id", "primary", "カレンダーID（開発用プレースホルダー）"],
      ["email.ownerNotifyAddress", "owner@example.com", "店舗通知メール宛先"],
      ["email.fromName", "Demo Salon", "送信者表示名"],
    ],
  },
  {
    name: SHEET_NAMES.HOLIDAYS,
    headers: HOLIDAYS_HEADERS,
    rows: [
      ["2026-01-01", "元日"],
      ["2026-01-02", "年始休業"],
    ],
  },
  {
    name: SHEET_NAMES.SERVICES,
    // Optional presentation columns (V1.1 Task 4) appended after the
    // required ones — a fresh setupDemoSheets() install shows richer Menu
    // content immediately; an existing sheet from before this task is
    // never touched (setupDemoSheets never overwrites an existing sheet).
    headers: [...SERVICES_HEADERS, ...SERVICES_OPTIONAL_HEADERS],
    rows: [
      ["SV001", "ハンド | ジェルネイル", 60, 6000, true, true, 1, "指先に一色をまとわせる、定番の仕上がりです。", "ハンド"],
      ["SV002", "フット | ジェルペディキュア", 90, 8000, true, true, 2, "一年を通して整えたい足先に。", "フット"],
      ["SV003", "その他 | パラフィンパック", 20, 1500, true, false, 3, "乾燥が気になる季節におすすめです。", "その他"],
    ],
  },
  {
    name: SHEET_NAMES.STAFF,
    // Optional presentation columns (V1.1 Task 4) — ImagePath stays blank
    // in the seed: GAS has no way to know what image files exist in the
    // buyer's own Next.js public/ folder, and a fabricated path could
    // point at a file that doesn't exist. A blank photoSrc already
    // degrades gracefully (StaffCard.tsx's initial-letter tile).
    headers: [...STAFF_HEADERS, ...STAFF_OPTIONAL_HEADERS],
    rows: [
      ["ST001", "スタッフA", true, "", 1, "店長", "丁寧なカウンセリングを心がけています。", ""],
      ["ST002", "スタッフB", true, "", 2, "スタイリスト", "", ""],
      ["ST003", "スタッフC", true, "", 3, "", "", ""],
    ],
  },
  { name: SHEET_NAMES.RESERVATIONS, headers: RESERVATIONS_HEADERS, rows: [] },
  {
    name: SHEET_NAMES.CANCELLATION_REQUESTS,
    headers: CANCELLATION_REQUESTS_HEADERS,
    rows: [],
  },
  { name: SHEET_NAMES.INQUIRIES, headers: INQUIRIES_HEADERS, rows: [] },
  { name: SHEET_NAMES.EMAIL_LOG, headers: EMAIL_LOG_HEADERS, rows: [] },
  { name: SHEET_NAMES.ERROR_LOG, headers: ERROR_LOG_HEADERS, rows: [] },
];
