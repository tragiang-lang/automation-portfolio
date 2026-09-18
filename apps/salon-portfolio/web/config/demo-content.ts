/**
 * TEMPORARY DEMO CONTENT — Phase 2B.
 *
 * Everything in this file is realistic placeholder business content, not
 * real business data. It exists only so the Phase 2A UI can render before
 * Phase 3 (`ConfigStore`/`getConfig`) and Phase 4 (`getServices`/
 * `getStaff`) exist — see docs/roadmap.md.
 *
 * Import this file only from `app/*page.tsx` (the composition root).
 * Components under `components/` must keep taking this data as props
 * (Phase 2A §17/§18) so this file is the *only* thing later phases swap
 * out for a real API response.
 */
import type {
  AccessInfo,
  CustomerFlowStep,
  FaqItem,
  GalleryImageItem,
  NavItem,
  SalonFeature,
  Service,
  SiteConfig,
  StaffMember,
} from "@/types/content";

export const SITE_CONFIG: SiteConfig = {
  business: {
    name: "凛",
    nameLatin: "Rin Nail & Eyelash",
    tagline: "静けさの中で、指先とまなざしを整える。",
    phone: "03-1234-5678",
    email: "info@rin-salon.example.com",
    address: "東京都中央区銀座1-2-3 銀座ビルディング5F",
    postalCode: "〒104-0061",
  },
  hours: {
    monday: "10:00-19:00",
    tuesday: "10:00-19:00",
    wednesday: "closed",
    thursday: "10:00-19:00",
    friday: "10:00-20:00",
    saturday: "10:00-20:00",
    sunday: "10:00-18:00",
  },
  features: {
    contactForm: true,
    reservation: true,
    staffSelection: true,
  },
  staffAnyAvailableOption: true,
  socialLinks: [
    { label: "Instagram", href: "https://instagram.com/example" },
    { label: "LINE", href: "https://line.me/example" },
  ],
  // Starter MVP reusability (labels/content) — these are the exact
  // literals `app/page.tsx`/`MenuSection.tsx` previously hard-coded, moved
  // here as this business's config values so the current site's rendered
  // output is byte-for-byte unchanged. A different business type overrides
  // these via the CONFIG sheet's labels.*/content.* keys instead of
  // editing this file or any component.
  labels: {
    service: "メニュー",
    bookingCta: "ご予約はこちら",
    inquiryMessage: "お問い合わせ内容",
  },
  content: {
    heroSubheadline: "銀座の一角で、丁寧なネイル・まつげのお手入れをご提供しています。",
    conceptEyebrow: "Concept",
    conceptTitle: "静けさの中で、指先を整える時間を",
    conceptParagraph1:
      "流行を追いかけるより、長く付き合える美しさを。当店では、派手さよりも一つひとつの仕上がりの丁寧さを大切にしています。",
    conceptParagraph2: "落ち着いた空間で過ごすひとときそのものも、施術と同じくらい価値のあるものだと考えています。",
    serviceSubtitle: "施術時間は目安です。カウンセリングのお時間を含め、少し余裕を持ってご来店ください。",
    ctaHeading: "仕上がりを見て、気持ちが決まったら",
    ctaMessage: "ご希望のメニューやお日にちが決まっていなくても大丈夫です。まずはお気軽にご予約ください。",
    ctaClosingHeading: "最後まで読んでくださり、ありがとうございます",
    ctaClosingMessage: "少しでも気になることがあれば、まずはご予約からお気軽にどうぞ。",
  },
};

export const NAV_ITEMS: NavItem[] = [
  { label: "コンセプト", href: "#concept" },
  { label: "メニュー", href: "#menu" },
  { label: "スタッフ", href: "#staff" },
  { label: "ギャラリー", href: "#gallery" },
  { label: "アクセス", href: "#access" },
  { label: "お問い合わせ", href: "#contact" },
];

export const SERVICES: Service[] = [
  {
    serviceId: "SV001",
    name: "ジェルネイル（ワンカラー）",
    description: "指先に一色をまとわせる、もっとも定番の仕上がり。",
    category: "ジェルネイル",
    durationMinutes: 60,
    price: 6000,
  },
  {
    serviceId: "SV002",
    name: "ジェルネイル（アート込み）",
    description: "季節や気分に合わせた、繊細なデザインアート付き。",
    category: "ジェルネイル",
    durationMinutes: 90,
    price: 9500,
  },
  {
    serviceId: "SV003",
    name: "フットジェル",
    description: "夏だけでなく、一年を通して整えたい足先に。",
    category: "ジェルネイル",
    durationMinutes: 75,
    price: 8000,
  },
  {
    serviceId: "SV004",
    name: "まつげエクステ（ナチュラル）",
    description: "普段のまなざしに、さりげない華やぎを。",
    category: "まつげエクステ",
    durationMinutes: 60,
    price: 7000,
  },
  {
    serviceId: "SV005",
    name: "まつげエクステ（ボリューム）",
    description: "写真映えする、しっかりとした存在感のある仕上がり。",
    category: "まつげエクステ",
    durationMinutes: 100,
    price: 11000,
  },
  {
    serviceId: "SV006",
    name: "まつげパーマ",
    description: "エクステを付けない、地まつげを活かした自然な仕上がり。",
    category: "まつげエクステ",
    durationMinutes: 50,
    price: 6500,
  },
  {
    serviceId: "SV007",
    name: "ハンドケア（オフのみ）",
    description: "他店でお付けになったジェルの、丁寧なオフのみ。",
    category: "その他",
    durationMinutes: 30,
    price: 3000,
  },
];

/**
 * Staff photos are intentionally illustrated stand-ins, not stock photos
 * of real people (Phase 2C decision) — attaching a real stranger's face to
 * a fictional staff name/bio in a business demo would misrepresent a real
 * person. `photoAlt` says "イメージアイコン" (image icon), not "写真"
 * (photo), so the alt text itself doesn't claim to be a photograph either.
 */
export const STAFF: StaffMember[] = [
  {
    staffId: "ST001",
    name: "田中 あい",
    role: "店長 / ネイリスト",
    introduction: "繊細なアートと、丁寧なカウンセリングが得意です。",
    photoSrc: "/images/staff/staff-avatar-01.svg",
    photoAlt: "スタッフ 田中あいのイメージアイコン",
  },
  {
    staffId: "ST002",
    name: "鈴木 さくら",
    role: "アイリスト",
    introduction: "ナチュラルな仕上がりを大切にしています。",
    photoSrc: "/images/staff/staff-avatar-02.svg",
    photoAlt: "スタッフ 鈴木さくらのイメージアイコン",
  },
  {
    staffId: "ST003",
    name: "佐藤 みなみ",
    role: "ネイリスト",
    introduction: "季節ごとのデザイン提案を得意としています。",
    photoSrc: "/images/staff/staff-avatar-03.svg",
    photoAlt: "スタッフ 佐藤みなみのイメージアイコン",
  },
  {
    staffId: "ST004",
    name: "山本 ゆい",
    role: "アイリスト / ネイリスト",
    introduction: "初めてのお客様にも安心していただけるよう心がけています。",
    photoSrc: "/images/staff/staff-avatar-04.svg",
    photoAlt: "スタッフ 山本ゆいのイメージアイコン",
  },
];

/**
 * Gallery photography (Phase 2C): free-license real stock photos (Unsplash
 * License — free for commercial use, no attribution required), downloaded
 * once and hosted locally under `public/images/gallery/` — no runtime
 * dependency on an external image host. `width`/`height` mirror each
 * photo's real aspect ratio (scaled down), so the masonry grid varies
 * height the way actual nail-art photography would (Phase 2A §11), rather
 * than forcing every tile to an invented ratio.
 */
export const GALLERY_IMAGES: GalleryImageItem[] = [
  { id: "g1", src: "/images/gallery/gallery-manicure-application.jpg", alt: "ネイルポリッシュを丁寧に塗布する施術の様子", width: 1200, height: 800 },
  { id: "g2", src: "/images/gallery/gallery-nail-art-pink.jpg", alt: "ピンクのグラデーションが美しいジェルネイルの仕上がり例", width: 1200, height: 800 },
  { id: "g3", src: "/images/gallery/gallery-lash-extensions.jpg", alt: "自然な仕上がりのまつげエクステンションのクローズアップ", width: 1200, height: 870 },
  { id: "g4", src: "/images/gallery/gallery-nail-art-lavender.jpg", alt: "淡いラベンダーカラーでまとめたジェルネイルの仕上がり例", width: 1200, height: 800 },
  { id: "g5", src: "/images/gallery/gallery-salon-interior-lounge.jpg", alt: "窓から光が差し込む、静かな店内スペースの様子", width: 1200, height: 633 },
  { id: "g6", src: "/images/gallery/gallery-nail-art-bordeaux.jpg", alt: "深みのあるボルドーカラーのジェルネイルの仕上がり例", width: 1200, height: 796 },
  { id: "g7", src: "/images/gallery/gallery-nail-polish-detail.jpg", alt: "ラメ入りポリッシュを重ねるアート仕上げの一場面", width: 1200, height: 801 },
  { id: "g8", src: "/images/gallery/gallery-nail-art-nude.jpg", alt: "上品なヌードカラーとリングを合わせた指先の仕上がり例", width: 1200, height: 900 },
];

export const SALON_FEATURES: SalonFeature[] = [
  {
    id: "hygiene",
    title: "器具はすべてお客様ごとに滅菌",
    description:
      "施術に使用する器具は一件ごとに滅菌・消毒を行い、清潔な状態でご用意しています。",
  },
  {
    id: "private",
    title: "個室・半個室でゆったりと",
    description:
      "隣のお客様の視線を気にせず、施術に集中していただける空間をご用意しています。",
  },
  {
    id: "parking",
    title: "近隣にコインパーキング完備",
    description: "お車でお越しの際は、近隣のコインパーキングをご利用いただけます。",
  },
  {
    id: "first-visit",
    title: "初めての方も安心のカウンセリング",
    description:
      "施術前に仕上がりのご要望をゆっくり伺い、認識をすり合わせてから施術を始めます。",
  },
];

export const CUSTOMER_FLOW_STEPS: CustomerFlowStep[] = [
  { step: 1, title: "ご予約", description: "お電話またはWEBから、ご希望の日時・メニューをご予約ください。" },
  { step: 2, title: "ご来店・カウンセリング", description: "当日は開始5分前にご来店ください。仕上がりのご希望を伺います。" },
  { step: 3, title: "施術", description: "ご要望に沿って、担当スタッフが丁寧に施術を行います。" },
  { step: 4, title: "お会計・次回のご案内", description: "施術後にお会計、必要に応じて次回のご来店目安もご案内します。" },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    question: "予約は当日でも可能ですか？",
    answer:
      "空き状況によりご案内可能です。お電話にてお問い合わせいただくか、WEB予約ページの空き枠をご確認ください。",
  },
  {
    id: "faq-2",
    question: "施術にはどのくらい時間がかかりますか？",
    answer:
      "メニューにより異なりますが、目安時間はメニュー一覧に記載しています。カウンセリングを含めると、記載時間より少し余裕を見てご来店ください。",
  },
  {
    id: "faq-3",
    question: "担当スタッフを指名できますか？",
    answer:
      "ご予約時に指名も可能ですし、「指名なし（お任せ）」を選んでいただくこともできます。お任せの場合は、その時間に対応可能なスタッフがご案内します。",
  },
  {
    id: "faq-4",
    question: "キャンセルはどうすればよいですか？",
    answer:
      "ご予約確認のメールに記載のリンクよりお手続きいただけます。恐れ入りますが、直前のキャンセルはお電話でもご連絡ください。",
  },
];

export const ACCESS_INFO: AccessInfo = {
  transitDirections: [
    { id: "t1", label: "銀座駅（東京メトロ）より徒歩5分" },
    { id: "t2", label: "東銀座駅（都営浅草線）より徒歩7分" },
    { id: "t3", label: "有楽町駅（JR）より徒歩10分" },
  ],
};
