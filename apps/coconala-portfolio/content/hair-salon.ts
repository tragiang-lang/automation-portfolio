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
  // Buttons mirror projects/2026/demo-hair-salon/rich-menu/menu-config.json (2x3 grid,
  // top-left to bottom-right); behavior mirrors workflow/workflow.json. Static copy only.
  richMenu: {
    title: "Rich Menu 全体構成",
    description:
      "リッチメニューは6つのボタンで構成しています。受付の仕事を自動化する「予約・お問い合わせ」と、お店の情報をご案内する「情報・案内」のボタンを、ひとつのメニューにまとめました。",
    image: {
      src: "/demos/hair-salon/rich-menu.png",
      width: 2500,
      height: 1686,
      alt: "ヘアサロン向けリッチメニューのデモ画像（ご予約・メニュー・お問い合わせ・アクセス・営業時間・スタイル写真）",
    },
    groups: {
      automation: "予約・お問い合わせ",
      info: "情報・案内",
    },
    buttons: [
      { label: "ご予約", group: "automation", summary: "LINEの日時選択画面から予約リクエストを送れます" },
      { label: "メニュー", group: "info", summary: "メニュー・所要時間・料金をLINEで返信します" },
      { label: "お問い合わせ", group: "automation", summary: "メッセージでお問い合わせを受け付けます" },
      { label: "アクセス", group: "info", summary: "住所・地図などのアクセス情報を返信します" },
      { label: "営業時間", group: "info", summary: "営業時間を返信します" },
      { label: "スタイル写真", group: "info", summary: "スタイル写真を載せたページを開きます" },
    ],
  },
  automation: {
    title: "予約・お問い合わせの自動化",
    description:
      "リッチメニューのうち「ご予約」と「お問い合わせ」の2つは、受付・記録・店舗へのお知らせまでを自動で行います。",
    flows: [
      {
        title: "ご予約",
        steps: [
          { label: "LINEリッチメニュー", note: "「ご予約」をタップ" },
          { label: "日時の選択", note: "LINEの日時選択画面で希望日時を選ぶ" },
          { label: "Google Apps Script", note: "営業時間・休業日・受付枠・既存の予約を確認" },
          { label: "スプレッドシート", note: "「REQUESTED（リクエスト）」として記録" },
          { label: "メール通知", note: "店舗へお知らせ" },
        ],
        note: "予約は自動確定ではなく、店舗確認後に確定します。お客様のLINEには「ご予約リクエストを受け付けました」という予約番号つきのメッセージが自動で届きます。店舗側でスプレッドシートのステータスを「CONFIRMED（確定）」に変更する流れです。",
      },
      {
        title: "お問い合わせ",
        steps: [
          { label: "LINEリッチメニュー", note: "「お問い合わせ」をタップ" },
          { label: "メッセージ入力", note: "案内に沿って、内容をトークで送信" },
          { label: "Google Apps Script", note: "送られたメッセージを受け付け" },
          { label: "スプレッドシート", note: "お問い合わせ一覧に記録" },
          { label: "メール通知", note: "店舗へお知らせ" },
        ],
        note: "ボタンを押すと、お問い合わせ内容をメッセージで送るよう案内が届きます（10分以内に送られた内容を受け付けます）。お客様のLINEには受付番号つきの受付メッセージが自動で届き、内容へのご返信は店舗から行います。",
      },
    ],
  },
  otherButtons: {
    title: "その他のボタン",
    description:
      "残りの4つは、お店の情報をご案内するボタンです。予約や受付の処理は行わず、お客様が知りたい情報にすぐたどり着けるようにしています。",
    items: [
      { name: "メニュー", detail: "スプレッドシートに登録したメニューの名前・所要時間・料金を、LINEで自動返信" },
      { name: "アクセス", detail: "住所・アクセス案内・地図・電話番号を、LINEで自動返信" },
      { name: "営業時間", detail: "営業時間と電話番号を、LINEで自動返信" },
      { name: "スタイル写真", detail: "スタイル写真を載せたページ（Instagramなど）を開くリンク" },
    ],
    note: "メニュー・アクセス・営業時間の内容は、スプレッドシートを書き換えるだけで更新できます。スタイル写真のリンク先は、デモではサンプルのURLです。",
  },
  spreadsheet: {
    title: "Spreadsheet",
    description:
      "受付内容は1件ずつスプレッドシートの行として記録されます。店舗側は「REQUESTED（リクエスト）」の行を確認し、「CONFIRMED（確定）」に変更します。",
  },
  email: {
    title: "Email Notification",
    description:
      "新しい予約リクエストやお問い合わせが入ると、指定のメールアドレスへお知らせが届きます（画面は予約リクエストの例）。",
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
