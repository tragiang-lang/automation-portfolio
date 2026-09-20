# スクリーンショット計画（Task 13）

このドキュメントは、実際にリポジトリのコードを動かして検証した結果に
基づく、ココナラ出品用スクリーンショットの計画・実施記録です。捏造した
画面や、実装されていない機能を示す画面は含みません。

検証方法: `apps/salon-portfolio/web`（port 4001）と `apps/site-report/web`
（port 4002）を `npm run dev` でローカル起動し、Claude in Chrome の
ブラウザ自動化で実画面を操作・撮影しました（2026-09-13 実施）。
バックエンド（GAS Web App）は未デプロイ・未接続の状態です。

ステータス凡例: `IMPLEMENTED` / `PARTIALLY IMPLEMENTED` / `LOCAL-DEMO ONLY`
/ `MANUAL VERIFICATION REQUIRED` / `FUTURE / NOT AVAILABLE`

---

## デモデータ戦略

実在の顧客・個人情報は一切使用していません。

**Salon（お問い合わせフォーム入力値）**

| 項目 | 値 |
|---|---|
| お名前 | 田中 花子（架空） |
| メール | hanako.tanaka@example.com（架空・example.comドメイン） |
| 電話番号 | 090-1234-5678（架空） |
| 問い合わせ内容 | 「ネイルサロンの予約について問い合わせです。地元のサロン向けに使いたいと思っています。」 |

サロン自体のコンテンツ（店名「凛 RIN NAIL & EYELASH」、メニュー、価格、
スタッフ、ギャラリー画像）は `apps/salon-portfolio/web/config/demo-content.ts`
等に既に定義されているリポジトリ標準のデモコンテンツをそのまま使用して
おり、新たに作成したものではありません。

**Site Report（今後、深い画面を撮影する場合の想定デモ値 — 現状は未到達）**

| 項目 | 値 |
|---|---|
| 現場名 | 渋谷第二現場（架空） |
| 作業者名 | 佐藤 健一（架空） |
| 報告日 | 2026-09-13 |
| 作業内容 | 外壁塗装・足場点検 |
| コメント | 「本日の作業は予定通り完了しました。特記事項なし。」 |
| 写真ファイル名 | demo-site-photo-01.jpg（実在の作業員・実在現場を含まない、後述の§8参照） |

これらはLIFFゲート（後述）のため、今回のパスでは実画面に投入できて
いません。

---

## Salon — 実装調査結果サマリ

| 画面 | 実装状況 | 根拠 |
|---|---|---|
| ホーム（Hero/Concept/Menu/Staff/Gallery/FAQ/Access/Contact） | IMPLEMENTED | `apps/salon-portfolio/web/app/page.tsx` — 静的コンテンツ、API依存なし |
| お問い合わせフォーム | PARTIALLY IMPLEMENTED | UIは実装済みだが送信をシミュレートするのみ（実際の送信先なし）— 既存の `docs/coconala/coconala-service-listings.md` に記載済みの既知事項 |
| 予約ウィザード（`/reservation`） | MANUAL VERIFICATION REQUIRED（実質ブロック） | `getAvailability`/`getServices` 等がGAS Web Appを呼ぶが、ローカルに `GAS_WEBAPP_URL` が未設定のため「サーバーエラーが発生しました」で停止（実機で確認・スクリーンショット済み） |
| 予約完了ページ（`/thanks`） | FUTURE / NOT AVAILABLE | `apps/salon-portfolio/web/app/thanks/page.tsx` が `PagePlaceholder`（"This confirmation screen is not implemented yet."）を返すのみ |
| 予約キャンセル（`/reservation/cancel`） | FUTURE / NOT AVAILABLE | 同上、プレースホルダー |
| デザインプリセット6種（LP） | IMPLEMENTED（既存の実撮影素材あり） | `product/coconala-salon-template/08_DEMO/02_SCREENSHOTS/` に6プリセット×デスクトップ/モバイルの実スクリーンショットが既に存在（本タスクで新規作成したものではない） |

## Salon — スクリーンショット表

| Order | Screenshot | Purpose | Route/Screen | Viewport | Status |
|---|---|---|---|---|---|
| 1 | `salon-01-hero.jpg` | 「これは何のサービスか」を3秒で伝える | `/`（Hero） | 1416×761（実測、デスクトップ相当） | READY（実撮影・PUBLIC） |
| 2 | `salon-02-service.jpg` | 実際のメニュー・価格が見える＝実在の商品だと分かる | `/`（Menuセクション） | 同上 | READY（実撮影・PUBLIC） |
| 3 | `salon-03-reservation` | 予約導線がある事を示す | `/reservation` | 同上 | **BLOCKED** — GASバックエンド未接続のため「サーバーエラー」画面のみ取得（`_internal/salon-reservation-blocked-server-error.jpg`）。NEEDS REAL DEPLOYMENT。公開用には未使用 |
| 4 | `salon-04-form.jpg` | 問い合わせが簡単に完結する体験を見せる | `/#contact`（デモ値入力済み） | 同上 | READY（実撮影・デモデータ入力済み・PUBLIC）※送信ボタンは押していない（実送信されないため誤解を招く完了画面は作らない） |
| 5 | 完了画面 | 予約完了体験を見せる | `/thanks` | — | **NOT READY** — 未実装のプレースホルダーのため撮影対象から除外（正直な理由をasset-manifestに明記） |
| 6 | `salon-06-mobile.jpg` | モバイル利用感を見せる | `/`（Hero、モバイル幅） | 544×717（実測） | READY（実撮影・PUBLIC） |

既存の6プリセットショーケース（`product/coconala-salon-template/08_DEMO/02_SCREENSHOTS/showcase/6-presets-showcase.png`
ほかdesktop/mobile個別画像）は差別化訴求（デザイン切替）の主力素材として
そのまま流用可能・READY・PUBLICです。

---

## Site Report — 実装調査結果サマリ

`apps/site-report/web/lib/liff.ts` を確認した結果、このアプリは
**LIFF設定（`NEXT_PUBLIC_LIFF_ID`）が無いと `liff.init()` の時点で
`LIFF_CONFIG_MISSING` エラーになり、それ以降の画面（現場選択・報告
フォーム・写真添付・送信・成功画面）には一切到達できません**。実際に
ローカルでこの状態を確認・撮影しました
（`_internal/site-report-liff-config-missing.jpg`）。

これはLIFFを偽装していないことの裏付けでもあります — 実装は正直に
「設定がありません」というエラーを返し、フェイクのLINEログイン画面や
フェイクの現場選択画面を表示したりはしません。

| 画面 | 実装状況 | ティア（§11） |
|---|---|---|
| 初期化中/LIFF未設定エラー | IMPLEMENTED（エラーハンドリングとして実装済み） | A（ローカルUIデモ・撮影済み・INTERNAL — マーケティング非公開） |
| LINEログイン（`login-required`） | IMPLEMENTED（コード上） | B（REAL LIFF REQUIRED — 未検証） |
| 現場選択（`SitePicker`） | IMPLEMENTED（コード上） | B（REAL LIFF REQUIRED — 未検証、LIFFゲートの後ろ） |
| 報告フォーム（`ReportForm`） | IMPLEMENTED（コード上） | B（REAL LIFF REQUIRED） |
| 写真添付（`PhotoUploader`/`PhotoPreviewList`） | IMPLEMENTED（コード上、圧縮パイプライン含む） | B（REAL LIFF REQUIRED） |
| 送信成功 | IMPLEMENTED（コード上） | C（REAL BACKEND E2E REQUIRED — GAS Sheets/Drive書き込みの実証が必要） |
| Google Sheets/Drive側の結果 | IMPLEMENTED（GAS側、`Api.ts`のSUBMIT_REPORT） | C（REAL BACKEND E2E REQUIRED） |

## Site Report — スクリーンショット表

| Order | Screenshot | Purpose | Route/Screen | Viewport | Status |
|---|---|---|---|---|---|
| 1 | LIFF初期化エラー | 内部エビデンス（実装が正直にエラーを返すことの証跡） | `/` | 544×717（実測） | READY（実撮影・**INTERNAL / NOT-FOR-PUBLICATION**）— 買い手向けには使わない |
| 2 | 現場選択UI | 「どうやって使うのか」を見せる主力候補 | `SitePicker`コンポーネント | — | **NOT READY** — 本パスでは未取得。REAL LIFF、または後述§19の外部レンダリング手法が必要（ASSET CAN BE GENERATED SEPARATELY） |
| 3 | 報告フォームUI | 入力の簡単さを見せる | `ReportForm`コンポーネント | — | 同上・NOT READY |
| 4 | 写真添付UI | 現場写真をその場で送れることを見せる | `PhotoUploader`コンポーネント | — | 同上・NOT READY |
| 5 | 送信成功 | 完了体験を見せる | `ReportEntryShell`成功状態 | — | NOT READY・REAL BACKEND E2E REQUIRED |
| 6 | 管理側（Sheets/Drive） | 「実際に何が届くのか」を見せる | Google Sheets/Drive | — | NOT READY・NEEDS REAL DEPLOYMENT + NEEDS REAL DEVICE（実LINEアカウントでの提出が前提） |

**現時点でSite Reportの「買い手に見せられる実画面」はゼロ枚です。**
これは実装が悪いのではなく、LIFFという性質上、正規のフローがLINE
アカウント経由の認証を要求するためです。詳細は
[`manual-device-capture.md`](manual-device-capture.md) と
[`asset-manifest.md`](asset-manifest.md) を参照してください。
