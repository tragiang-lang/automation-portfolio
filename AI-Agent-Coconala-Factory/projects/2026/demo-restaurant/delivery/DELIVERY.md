# 納品書（成果物一覧） — Demo Bistro（デモ）

## 今回の構成

- 業種プロファイル: restaurant-v1@1.0.0（飲食店 / Restaurant）
- リッチメニュー: restaurant-basic-v1／デザインプリセット: friendly-local-v1
- リッチメニュー画像: `rich-menu/rich-menu.png`（2500×1686px、PNG、sha256 `79af79b90f00b0f1…`）
- ワークフロー:
  - **Reservation request (basic)** (`reservation-basic-v1@1.0.0`): intent:book (requirement)
  - **Service menu / price list** (`service-menu-v1@1.0.0`): intent:view_menu (requirement)
  - **Business info / access** (`business-info-v1@1.0.0`): intent:find_access (requirement)
  - **Inquiry (basic)** (`inquiry-basic-v1@1.0.0`): intent:ask_question (requirement)

## 含まれるもの

- LINE リッチメニュー（画像・ボタン設定）と、その登録・切り戻しの手順
- ボタンからの自動受付・自動返信（Google Apps Script）
- 受付内容を記録する Google スプレッドシートの構成と自動作成
- 本物の LINE からの通信だけを受け付ける署名確認プロキシ
- 品質チェック結果（`qa/QA_REPORT.md`、`qa/LINE_QA_REPORT.md`）と、この資料一式

## 含まれないもの

- お客様向けの Web 予約画面・LIFF アプリ
- 予約の自動確定、Google カレンダー連携、スタッフ指名、キャンセル受付、来店履歴
- LINE でのお客様への自動プッシュ通知（リマインド等）
- LINE 公式アカウント・Google・Cloudflare の利用料金、アカウントの開設

## お客様にご用意・ご対応いただくこと

- LINE 公式アカウント（Messaging API を有効化）と、テスト用の LINE 公式アカウント（推奨）
- Google アカウント、Cloudflare アカウント（無料プランで可）
- 店舗情報・営業時間の確認と入力（`CONFIG` シート）
- 受付後のご対応（予約の確定連絡、お問い合わせへの返信）と、スプレッドシートの共有範囲の管理
- スマートフォンでの最終確認（[E2E_TEST.md](E2E_TEST.md)）

## 納品側で行う設定

- Apps Script へのプログラムの設置と公開（[GAS_SETUP.md](GAS_SETUP.md)）
- 署名確認プロキシの設置と Webhook の設定、リッチメニューの登録（[LINE_SETUP.md](LINE_SETUP.md)）
- スプレッドシートの自動作成と初期値の入力（[SPREADSHEET_SETUP.md](SPREADSHEET_SETUP.md)）

## LINE アカウントの条件

- Messaging API が有効な LINE 公式アカウント（チャネルアクセストークン・チャネルシークレットが発行できること）
- リッチメニューはスマートフォンの LINE アプリで表示されます（パソコン版 LINE には表示されません）

## テスト

- 自動テスト: プログラム・署名確認・ボタンごとの受付を納品前に自動で確認しています（`qa/`）。
- 実機テスト: テスト用アカウントとスマートフォンで [E2E_TEST.md](E2E_TEST.md) を確認し、記録欄に記入します。
  実機での確認は、LINE アカウントの準備ができてから行うため、納品物の自動チェックには含まれません。

## 成果物

| ファイル | 内容 |
|---|---|
| `project.json` | プロジェクト情報とトレーサビリティ |
| `brief/brief.json` | ご要望（入力データ） |
| `brief/business-requirements.md` | ご要望まとめ |
| `analysis/industry-profile.json` | 業種分析 |
| `workflow/selected-workflows.json` | 採用したワークフローと理由 |
| `workflow/workflow.json` | ワークフロー・アクション定義（このプロジェクト用の固定コピー） |
| `rich-menu/design-spec.json` | リッチメニュー画像のデザイン仕様 |
| `rich-menu/menu-config.json` | LINE に登録するリッチメニュー設定 |
| `rich-menu/rich-menu.png` | LINE に登録するリッチメニュー画像 |
| `rich-menu/preview.svg` | リッチメニュー画像のプレビュー（画像の元データ） |
| `rich-menu/image.json` | 画像の情報（サイズ・ハッシュ・作成ツールの版） |
| `spreadsheet/schema.json` | スプレッドシートの構成（シート・列・設定項目） |
| `spreadsheet/config-seed.json` | CONFIG シートの初期値 |
| `gas/` | Google Apps Script プログラム一式（テスト付き） |
| `line/deployment.json` | LINE への登録内容と、ボタンからプログラムまでの対応表 |
| `line/README.md` | LINE 登録の作業者向けメモ |
| `line/webhook/` | 署名確認プロキシ（Cloudflare Worker、テスト付き） |
| `delivery/SETUP.md` | セットアップ手順（全体） |
| `delivery/SPREADSHEET_SETUP.md` | スプレッドシートの構成と設定項目 |
| `delivery/GAS_SETUP.md` | Apps Script の設定（作業者向け） |
| `delivery/LINE_SETUP.md` | LINE・署名確認プロキシ・リッチメニューの設定 |
| `delivery/E2E_TEST.md` | スマートフォンでの動作確認チェックリスト |
| `delivery/ROLLBACK.md` | 元に戻す方法 |
| `delivery/DELIVERY.md` | この納品書 |
| `qa/qa-report.json` | 品質チェック結果（機械可読） |
| `qa/QA_REPORT.md` | 品質チェック結果 |
| `qa/line-qa-report.json` | LINE 連携の品質チェック結果（機械可読） |
| `qa/LINE_QA_REPORT.md` | LINE 連携の品質チェック結果 |

## 前提・注意事項

- Party size is recorded but not used for capacity in reservation-basic-v1 (capacity counts groups).
- Same-day requests may need a shorter reservation.minLeadHours.

## 品質確認

自動品質チェックの結果は `qa/QA_REPORT.md`（全体）と `qa/LINE_QA_REPORT.md`（LINE 連携）を参照してください。

## 使用した部品と版（トレーサビリティ）

ファクトリー 0.1.0／画像レンダラー local-svg-resvg@1.0.0

| 部品 | 版 |
|---|---|
| `business-info-v1` | 1.0.0 |
| `core-config-v1` | 1.0.0 |
| `createInquiry@1` | 1.0.0 |
| `createReservation@1` | 1.0.0 |
| `customer-intents-v1` | 1.0.0 |
| `customers-basic-v1` | 1.0.0 |
| `friendly-local-v1` | 1.0.0 |
| `gas-modules-v1` | 1.1.0 |
| `getAvailability@1` | 1.0.0 |
| `getBusinessInfo@1` | 1.0.0 |
| `getServiceList@1` | 1.0.0 |
| `hero-1-plus-3-v1` | 1.0.0 |
| `inquiries-basic-v1` | 1.0.0 |
| `inquiry-basic-v1` | 1.0.0 |
| `line-webhook-proxy-v1` | 1.0.0 |
| `reservation-basic-v1` | 1.0.0 |
| `reservations-basic-v1` | 1.0.0 |
| `restaurant-basic-v1` | 1.0.0 |
| `restaurant-v1` | 1.0.0 |
| `service-menu-v1` | 1.0.0 |
| `services-basic-v1` | 1.0.0 |

## 今後の拡張候補

- `reservation-basic-v1` / google-calendar: Add Calendar busy times as extra BookedInterval sources in services/availability.ts; create an event on CONFIRMED.
- `reservation-basic-v1` / staff-availability: Per-staff capacity (reference: hair-salon-portfolio StaffAvailabilityStrategy).
- `reservation-basic-v1` / cancellation: cancelReservation@1 (planned) with ownership check by lineUserId.
- `reservation-basic-v1` / customer-notifications: Confirmation/reminder push via sendLineMessage@1 (planned).
- `reservation-basic-v1` / customer-history: Query RESERVATIONS by customerId for a 'my bookings' button.
- `service-menu-v1` / flex-carousel: Flex carousel with photos per service (needs image hosting).
- `business-info-v1` / flex-message: Replace the text reply with a Flex Message card (map thumbnail, call button).
- `inquiry-basic-v1` / line-owner-push: Notify the owner by LINE push instead of email (sendLineMessage@1, planned).
- `inquiry-basic-v1` / auto-reply-hours: Different acknowledgement outside business hours.
- （任意）お客様向け Web 予約画面（Next.js / LIFF）、Canva 連携による画像デザイン、AI による受付内容の整理

---

<sub>Generated by AI-Agent-Coconala-Factory 0.1.0 for 2026/demo-restaurant (restaurant; reservation-basic-v1@1.0.0, service-menu-v1@1.0.0, business-info-v1@1.0.0, inquiry-basic-v1@1.0.0).</sub>
