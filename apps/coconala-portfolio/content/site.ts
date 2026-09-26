// All homepage copy and site-wide settings live here.
// Components only render what this file provides.

export const siteConfig = {
  // TODO: replace with your Coconala service page URL once it is published.
  // This is the ONLY place the Coconala link is defined.
  coconalaUrl: "https://coconala.com/",
  // TODO: replace with your brand / display name.
  brandName: "LINE Automation Works",
  // Absolute base URL for Open Graph images. Vercel sets
  // VERCEL_PROJECT_PRODUCTION_URL automatically; NEXT_PUBLIC_SITE_URL overrides it.
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  title: "LINE公式アカウントの予約・お問い合わせ自動化",
  description:
    "LINE公式アカウントのリッチメニューから予約・お問い合わせを受け付け、Google Apps ScriptでGoogleスプレッドシートへ記録し、メールでお知らせする受付自動化サービス。",
};

export const siteContent = {
  nav: [
    { label: "LINE Automation", href: "/#services" },
    { label: "Works", href: "/#works" },
    { label: "Contact", href: "/#contact" },
  ],
  hero: {
    eyebrow: "LINE公式アカウント × Google Workspace",
    titleLines: ["LINE公式アカウントの", "予約・お問い合わせ受付を", "シンプルに自動化します"],
    descriptionLines: [
      "リッチメニューから予約・お問い合わせを受け付け、",
      "内容はGoogleスプレッドシートへ自動で記録。",
      "新しい受付はメールでお知らせします。",
    ],
    primaryCta: { label: "デモを見る", href: "#demo" },
    secondaryCtaLabel: "Coconalaで相談する",
    imageCaption: "ヘアサロン向けリッチメニュー",
  },
  features: {
    eyebrow: "WHAT I CAN BUILD",
    title: "できること",
    items: [
      { title: "リッチメニュー", description: "予約・メニュー・営業時間などへ、LINEのトーク画面からすぐアクセス" },
      { title: "予約受付", description: "LINEで希望日時を受け付け、スプレッドシートへ自動で記録" },
      { title: "お問い合わせ自動化", description: "LINEで届いたお問い合わせを記録し、担当者へメールでお知らせ" },
    ],
  },
  howItWorks: {
    eyebrow: "HOW IT WORKS",
    title: "受付の流れ",
    steps: [
      { label: "リッチメニュー", note: "お客様がLINEでボタンをタップ" },
      { label: "日時選択 / メッセージ", note: "希望日時やお問い合わせ内容を送信" },
      { label: "Google Apps Script", note: "受付内容を自動で処理" },
      { label: "スプレッドシート", note: "1件ずつ自動で記録" },
      { label: "メール通知", note: "担当者へお知らせ" },
    ],
  },
  demo: {
    eyebrow: "DEMO",
    title: "デモの流れ",
    badge: "DEMO SAMPLE",
    note: "掲載している画面はすべてデモ用のサンプルです。表示されている名前・メールアドレスは架空のものです。",
    // Set to "/demos/hair-salon/demo.mp4" after adding the file to public/.
    videoSrc: null as string | null,
    videoPoster: "/demos/hair-salon/rich-menu.png",
    videoPlaceholder: "デモ動画は準備中です",
    shots: [
      { kind: "richMenu", caption: "Rich Menu — LINEのメニュー画面" },
      { kind: "spreadsheet", caption: "Spreadsheet — 予約の記録" },
      { kind: "email", caption: "Email — 受付のお知らせ" },
    ] as const,
  },
  caseStudyPreview: {
    eyebrow: "WORKS",
    sectionTitle: "制作事例",
    badge: "デモ",
    featuredBadge: "メイン事例",
    backLabel: "制作事例一覧へ戻る",
    title: "Hair Salon",
    subtitle: "LINE予約受付 自動化デモ",
    description:
      "ヘアサロンを想定し、LINEのリッチメニューから予約リクエスト・お問い合わせを受け付けて、スプレッドシートへ記録し、メールでお知らせするデモ構成です。",
    href: "/works/hair-salon",
    linkLabel: "事例を見る",
    // Lightweight demos shown below the flagship Hair Salon case study.
    moreDemos: [
      {
        badge: "デモ",
        title: "Nail Salon",
        subtitle: "ネイルサロン向け LINE予約受付デモ",
        description: "同じ仕組みをネイルサロン向けのメニュー・デザインにしたデモです。",
        image: { src: "/demos/nail-salon/rich-menu.png", width: 2500, height: 1686, alt: "ネイルサロン向けリッチメニューのデモ画像" },
        href: "/works/nail-salon",
        linkLabel: "デモを見る",
      },
      {
        badge: "デモ",
        title: "Spa",
        subtitle: "スパ・リラクゼーション向け LINE予約受付デモ",
        description: "同じ仕組みをスパ・リラクゼーション向けのメニュー・デザインにしたデモです。",
        image: { src: "/demos/spa/rich-menu.png", width: 2500, height: 1686, alt: "スパ向けリッチメニューのデモ画像" },
        href: "/works/spa",
        linkLabel: "デモを見る",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "よくあるご質問",
    items: [
      {
        q: "LINE公式アカウントは必要ですか？",
        a: "はい。お客様のLINE公式アカウントを利用して構築します。",
      },
      {
        q: "予約内容をスプレッドシートへ保存できますか？",
        a: "はい。受付内容を自動で記録できます。",
      },
      {
        q: "メール通知できますか？",
        a: "はい。受付時に指定メールアドレスへ通知できます。",
      },
      {
        q: "予約は自動で確定しますか？",
        a: "デモでは「予約リクエスト」として記録し、店舗側でスプレッドシートを確認して確定する流れです。",
      },
      {
        q: "Googleフォームでの受付にも対応できますか？",
        a: "はい。ご希望に応じて、Googleフォームで受け付ける構成も可能です。（掲載中のヘアサロンのデモは、LINE上で日時を選ぶ構成です）",
      },
      {
        q: "仕様の変更にも対応できますか？",
        a: "ご希望の内容に応じて別途対応します。",
      },
    ],
  },
  cta: {
    titleLines: ["LINEでの予約・お問い合わせ受付を", "もっと簡単に。"],
    buttonLabel: "Coconalaで相談する",
  },
  footer: {
    note: "本サイトに掲載している画面・データはデモ用のサンプルです。",
  },
};
