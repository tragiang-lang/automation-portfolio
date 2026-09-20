# V1.1.0で含まれるもの

このページは、本製品（V1.1.0）に実際に含まれる機能・成果物の一覧です。
すべて [`MANIFEST.md`](MANIFEST.md) と [`VERSION.txt`](VERSION.txt)、
および実装ソースコードと突き合わせて確認したものです。

## Webサイト・予約機能

- ✓ Next.js製・レスポンシブ対応のサロンホームページ（`01_WEB_TEMPLATE/`）
- ✓ 予約ウィザードUI（`/reservation`）
- ✓ 6種類のデザインプリセット（kinari / femme / noir / editorial /
  natural / modern）
- ✓ Hero レイアウト3種（fullscreen / split / editorial）
- ✓ メニュー レイアウト3種（editorial-list / card-grid /
  minimal-price-list）
- ✓ スタッフ レイアウト2種（portrait-grid / horizontal-profile）
- ✓ ギャラリー レイアウト3種（grid / masonry / feature-editorial）
- ✓ セクションの表示/非表示・並び替え設定（ホームページ11セクション）

## バックエンド・データ連携

- ✓ 予約フォーム連携（Google Apps Script API: `getConfig` /
  `getServices` / `getStaff` / `getAvailability` / `createReservation`）
- ✓ Google Sheets データ層（`CONFIG` / `HOLIDAYS` / `SERVICES` /
  `STAFF` / `RESERVATIONS` / `CANCELLATION_REQUESTS` / `INQUIRIES` /
  `EMAIL_LOG` / `ERROR_LOG`）
- ✓ Google Calendar 連携（空き状況確認・予約イベント作成）
- ✓ Gmail による予約確認メール送信
- ✓ 二重予約防止（LockServiceによる排他制御）・予約直前の空き状況再チェック

## ガイド・ドキュメント

- ✓ セットアップガイド一式（`04_SETUP_GUIDE/` — START_HERE / WEB_SETUP /
  GAS_SETUP / SHEETS_SETUP / CALENDAR_SETUP / CONFIG_SETUP /
  VERCEL_DEPLOY）
- ✓ カスタマイズガイド一式（`05_CUSTOMIZATION/` — CONTENT / MENU /
  STAFF / IMAGE / DESIGN）
- ✓ トラブルシューティングガイド（`06_TROUBLESHOOTING/`）
- ✓ デモパック — 6プリセットの実画面スクリーンショット＋クイックスタート
  （`08_DEMO/`、本ページと同じ場所にあります）
- ✓ 利用ライセンス（`07_LICENSE/`）

## 含まれないもの

[`README_JA.md`](README_JA.md) の「4. 何が含まれないか」の通り、
お客様環境への導入代行・Vercel/GAS/Googleアカウントの設定代行・
デザイン制作/原稿作成/画像選定・個別カスタマイズ・原因調査を伴う
個別トラブル対応は、本製品（コンテンツ ¥2,500）には含まれません。
これらは別売りの導入・カスタマイズサービスの対象です。

## 変更されていないもの

V1.1.0は、Hero/Menu/Staff/Galleryのレイアウトとデザインプリセットを
追加したバージョンです。予約の受付処理（`createReservation`）・空き状況
確認・Google Calendar連携・メール通知の仕組み自体は、V1.0.0から変更
されていません。なお、`SERVICES`/`STAFF`/`CONFIG`シートには、より
詳しい情報（説明文・カテゴリ・役職・紹介文・写真パス・和文表記/
キャッチコピー/郵便番号/SNSリンクなど）を入力できる任意項目が追加
されています（既存シートに列が無くても壊れない後方互換の拡張です）。
