// Copy for /works/hair-salon. All data shown is synthetic demo data.

export const hairSalonCaseStudy = {
  badge: "DEMO SAMPLE",
  eyebrow: "Hair Salon",
  title: "LINE予約受付 自動化デモ",
  titleLines: ["LINE予約受付", "自動化デモ"],
  metaDescription:
    "ヘアサロンを想定した、LINE公式アカウントの予約・お問い合わせ受付を自動化するデモ構成。",
  overview: {
    title: "Overview",
    lines: [
      "LINE公式アカウントからの",
      "予約・お問い合わせ受付を整理し、",
      "受付内容をスプレッドシートへ記録する",
      "デモ構成を制作しました。",
    ],
    note: "実在の店舗ではなく、ヘアサロンを想定したデモです。",
  },
  beforeAfter: {
    title: "Before / After",
    before: {
      label: "BEFORE",
      steps: ["LINEや電話で受付", "内容を確認", "手作業で記録"],
      summary: "LINEや電話で受け付けた内容を確認し、手作業で記録。",
    },
    after: {
      label: "AFTER",
      steps: ["LINE（リッチメニュー）", "日時を選んで予約リクエスト", "Google Apps Script", "スプレッドシート", "メール通知"],
      summary: "受付の入口をLINEにまとめ、記録と通知は自動。",
    },
  },
  richMenu: {
    title: "Rich Menu",
    description:
      "ご予約・メニュー・お問い合わせ・アクセス・営業時間・スタイル写真の6ボタン構成。「ご予約」はLINEの日時選択、「メニュー」「アクセス」「営業時間」はスプレッドシートの情報を自動で返信、「お問い合わせ」はメッセージで受け付けます。",
    image: {
      src: "/demos/hair-salon/rich-menu.png",
      width: 2500,
      height: 1686,
      alt: "ヘアサロン向けリッチメニューのデモ画像（ご予約・メニュー・お問い合わせ・アクセス・営業時間・スタイル写真）",
    },
  },
  workflow: {
    title: "Workflow",
    steps: [
      { label: "リッチメニュー", note: "「ご予約」をタップ" },
      { label: "日時の選択", note: "LINEの日時選択画面で希望日時を選ぶ" },
      { label: "Google Apps Script", note: "営業時間・空き状況を確認" },
      { label: "スプレッドシート", note: "「REQUESTED（リクエスト）」として記録" },
      { label: "メール通知", note: "店舗へお知らせ" },
    ],
    note: "予約は「リクエスト」として記録され、お客様のLINEには受付メッセージが自動で届きます。店舗側でスプレッドシートを確認し、ステータスを「CONFIRMED（確定）」に変更する流れです。お問い合わせも同じように、LINEで届いたメッセージを記録してメールでお知らせします。",
  },
  spreadsheet: {
    title: "Spreadsheet",
    description:
      "受付内容は1件ずつスプレッドシートの行として記録されます。店舗側は「REQUESTED（リクエスト）」の行を確認し、「CONFIRMED（確定）」に変更します。",
  },
  email: {
    title: "Email Notification",
    description: "新しい予約リクエストが入ると、指定のメールアドレスへお知らせが届きます。",
  },
  technology: {
    title: "Technology",
    items: ["LINE Official Account", "Google Apps Script", "Google Sheets"],
    portfolioNote: "Portfolio site: Next.js / TypeScript / Tailwind CSS",
  },
  cta: {
    titleLines: ["同じ仕組みを、", "あなたのお店のLINEにも。"],
    buttonLabel: "Coconalaで相談する",
  },
};

// Synthetic rows for the spreadsheet mock. Never put real customer data here.
// Mirrors the demo's RESERVATIONS sheet (date / startTime / endTime /
// reservationId / source / status). A LINE date-time picker booking only
// carries the date and time, so name / email / menu are not shown.
// The compact thumbnail keeps the first two columns and the last one.
export const demoReservations = {
  headers: ["日付", "開始", "終了", "予約番号", "経路", "ステータス"],
  rows: [
    ["2026-10-03", "10:00", "11:00", "RES-20260926-A7K2Q9", "line", "REQUESTED"],
    ["2026-10-03", "14:30", "15:30", "RES-20260925-M3X8D1", "line", "CONFIRMED"],
    ["2026-10-04", "11:00", "12:00", "RES-20260926-P5T2W4", "line", "CONFIRMED"],
    ["2026-10-06", "16:00", "17:00", "RES-20260927-Z9B6H3", "line", "REQUESTED"],
  ],
  confirmedStatus: "CONFIRMED",
};

// Same subject / body shape as the demo's owner notification.
export const demoEmail = {
  from: "notify@example.com",
  to: "owner@example.com",
  subject: "【予約リクエスト】10月3日(土) 10:00 RES-20260926-A7K2Q9",
  fields: [
    ["予約番号", "RES-20260926-A7K2Q9"],
    ["日時", "10月3日(土) 10:00"],
  ],
  footer: "スプレッドシートの RESERVATIONS シートで内容を確認し、status を CONFIRMED に変更してください。",
};
