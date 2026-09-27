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
  // Page layers: everything above the NEXT VERSION marker is the built demo; everything
  // below it is a proposal. Never describe nextVersion content as built or live.
  layers: {
    current: {
      eyebrow: "CURRENT DEMO",
      title: "現在のデモ構成",
      note: "ここから下は、制作済みのデモ構成の内容です。",
    },
    next: {
      eyebrow: "NEXT VERSION",
      title: "次期構成（構成イメージ）",
      note: "ここから下は今後実装予定の拡張イメージです。現在のデモには含まれていません。",
    },
  },
  nextVersion: {
    badge: "構成イメージ・今後実装予定",
    title: "次のステップ — LIFF + Google Calendar",
    description:
      "現在のLINE自動化を、LIFFとGoogle Calendarを組み合わせた予約・問い合わせ体験へ拡張できます。",
    summaries: [
      { label: "予約", chain: ["LIFF予約", "Google Calendar", "予約確定", "LINE通知"] },
      { label: "お問い合わせ", chain: ["LIFFフォーム", "GAS", "オーナー通知"] },
      { label: "メニュー", chain: ["LIFFメニュー", "サービス確認", "予約へ"] },
      { label: "情報案内", chain: ["営業時間 / アクセス", "LINEで即時回答"] },
      { label: "リマインド", chain: ["予約確定", "前日", "LINE自動リマインド"] },
    ],
    richMenu: {
      title: "リッチメニューの役割分担（次期構成）",
      description:
        "入力が必要なボタンはLIFF画面、すぐに答えられる情報はLINEの返信、という分担を想定しています。",
      currentLabel: "現在のデモ",
      buttons: [
        { label: "ご予約", kind: "LIFF", next: "LIFFの予約画面を開く", current: "LINEの日時選択画面" },
        { label: "メニュー", kind: "LIFF", next: "LIFFのメニュー・サービスページを開く", current: "LINEで返信" },
        { label: "お問い合わせ", kind: "LIFF", next: "LIFFのお問い合わせフォームを開く", current: "メッセージで受付" },
        { label: "アクセス", kind: "LINE返信", next: "LINEで直接返信", current: "LINEで返信" },
        { label: "営業時間", kind: "LINE返信", next: "LINEで直接返信", current: "LINEで返信" },
        { label: "スタイル写真", kind: "外部URL", next: "外部ページを開く", current: "外部ページを開く" },
      ],
    },
    flowsTitle: "フローの構成イメージ",
    reservation: {
      title: "予約フロー",
      steps: [
        { label: "LINEリッチメニュー", systems: ["LINE"], note: "「ご予約」をタップ" },
        { label: "LIFF予約画面", systems: ["LIFF"], note: "LINEの中で予約画面を開く" },
        { label: "空き時間の表示", systems: ["LIFF", "Google Calendar"], note: "カレンダーをもとに空いている枠だけを表示" },
        { label: "空き状況の再確認", systems: ["GAS"], note: "送信時にサーバー側でもう一度確認" },
        { label: "重複チェック", systems: ["Google Calendar"], note: "同じ時間に予定がないか確認" },
        { label: "予約の作成", systems: ["Google Calendar", "Google Sheets"], note: "カレンダーに登録し、シートにも記録" },
        { label: "お客様へ確定のお知らせ", systems: ["LINE"], note: "予約内容をLINEでお知らせ" },
        { label: "オーナーへ通知", systems: ["GAS"], note: "新しい予約を店舗へお知らせ" },
      ],
      dataRoles: [
        { system: "Google Calendar", role: "埋まっている時間枠の基準（正）。空き枠の表示と重複チェックはカレンダーで判断します。" },
        { system: "Google Sheets", role: "予約・お客様の記録とステータスを管理。これまで通りスプレッドシートで一覧できます。" },
      ],
      note: "現在のデモは「予約リクエスト → 店舗確認後に確定」の流れです。次期構成では、空き枠を確認したうえで、その場で予約を作成する形を想定しています。",
    },
    otherFlows: [
      {
        title: "お問い合わせフロー",
        steps: [
          { label: "LINEリッチメニュー", systems: ["LINE"], note: "「お問い合わせ」をタップ" },
          { label: "LIFFお問い合わせフォーム", systems: ["LIFF"], note: "項目に沿って入力" },
          { label: "内容を保存", systems: ["GAS", "Google Sheets"], note: "お問い合わせ一覧に記録" },
          { label: "オーナーへ通知", systems: ["GAS"], note: "店舗へお知らせ" },
          { label: "受付のお知らせ", systems: ["LINE"], note: "お客様へ受付完了をLINEで" },
        ],
        note: "自由なチャットではなく、項目（ご用件・ご希望の日時など）が決まった入力フォームを想定しています。",
      },
      {
        title: "メニューフロー",
        steps: [
          { label: "LINEリッチメニュー", systems: ["LINE"], note: "「メニュー」をタップ" },
          { label: "LIFFメニューページ", systems: ["LIFF"], note: "LINEの中でページを開く" },
          { label: "サービスの確認", systems: ["LIFF"], note: "メニュー名・所要時間・料金" },
          { label: "「予約する」ボタン（任意）", systems: ["LIFF"], note: "予約画面へ進む" },
        ],
        note: "メニューを見たあと、そのまま予約画面へ進める導線を想定しています。",
      },
      {
        title: "情報案内（営業時間・アクセス）",
        steps: [
          { label: "「営業時間」「アクセス」をタップ", systems: ["LINE"], note: "リッチメニューから" },
          { label: "LINEで返信", systems: ["LINE"], note: "画面を開かずトーク内で回答" },
        ],
        note: "かんたんな情報はLIFFを使わず、LINEの返信で十分です（現在のデモと同じ仕組み）。",
      },
      {
        title: "リマインド",
        steps: [
          { label: "予約確定", systems: ["Google Sheets"], note: "確定済みの予約" },
          { label: "定期実行", systems: ["GAS"], note: "決まった間隔で予約を確認" },
          { label: "近づいた予約を検出", systems: ["GAS"], note: "例：予約の24時間前" },
          { label: "LINEでリマインド", systems: ["LINE"], note: "お客様へ前日のお知らせ" },
          { label: "送信日時を記録", systems: ["Google Sheets"], note: "二重送信を防ぐ" },
        ],
        note: "例として「前日（24時間前）」のリマインドを想定しています。",
      },
    ],
    technology: {
      title: "次期構成で想定する技術",
      items: ["LINE Official Account", "LIFF", "Google Apps Script", "Google Calendar", "Google Sheets"],
    },
    disclaimer:
      "このセクションは次期構成の構成イメージです。LIFF画面・Google Calendarとの連携・リマインドは今後実装予定で、現在のデモには含まれていません。",
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
