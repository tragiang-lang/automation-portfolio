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
      ["business.name", "アトリエ イト", "店舗名"],
      ["business.nameLatin", "atelier ito", "店舗名（ローマ字・任意）"],
      ["business.tagline", "髪と向き合う、静かな時間。", "キャッチコピー（任意）"],
      ["business.phone", "03-2345-6789", "電話番号"],
      ["business.email", "owner@example.com", "店舗メール"],
      ["business.address", "東京都渋谷区神宮前3-4-5", "住所"],
      ["business.postalCode", "〒150-0001", "郵便番号（任意）"],
      ["hours.monday", "closed", "月曜営業時間（定休日）"],
      ["hours.tuesday", "10:00-19:00", "火曜営業時間"],
      ["hours.wednesday", "10:00-19:00", "水曜営業時間"],
      ["hours.thursday", "10:00-19:00", "木曜営業時間"],
      ["hours.friday", "10:00-20:00", "金曜営業時間"],
      ["hours.saturday", "10:00-19:00", "土曜営業時間"],
      ["hours.sunday", "10:00-18:00", "日曜営業時間"],
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
      ["email.fromName", "atelier ito", "送信者表示名"],
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
      ["SV001", "カット", 60, 5500, true, true, 1, "ベースとなる髪型を、丁寧なカウンセリングから整えます。", "カット"],
      ["SV002", "カット＋カラー", 120, 11000, true, true, 2, "なりたい髪色まで、カットとカラーを一度に。", "カラー"],
      ["SV003", "カット＋パーマ", 150, 12000, true, true, 3, "動きのある柔らかなスタイルを、丁寧なパーマで。", "パーマ"],
      ["SV004", "カラー", 90, 7700, true, true, 4, "白髪染めから明るいトーンまで、幅広く対応します。", "カラー"],
      ["SV005", "トリートメント", 30, 4400, true, false, 5, "髪と頭皮に、うるおいとまとまりを。", "トリートメント"],
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
      ["ST001", "伊藤 美咲", true, "", 1, "オーナー / スタイリスト", "一人ひとりの髪質に合わせたスタイル提案を得意としています。", ""],
      ["ST002", "高橋 直子", true, "", 2, "スタイリスト", "自然な質感を活かしたカットが得意です。", ""],
      ["ST003", "中村 玲奈", true, "", 3, "スタイリスト", "", ""],
      ["ST004", "小林 陽菜", true, "", 4, "", "", ""],
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
