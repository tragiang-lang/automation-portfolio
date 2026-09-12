# 納品物一覧（MANIFEST）

Package version: **v1.1.0**（バージョン詳細は `VERSION.txt` を参照）

## 納品物

1. `01_WEB_TEMPLATE/salon-website/` — Next.jsホームページ＋予約UI
   テンプレート一式（ソースコード）
2. `02_GAS/salon-reservation-gas/` — Google Apps Script予約バックエンド
   一式（ソースコード）
3. `03_GOOGLE_SHEETS/` — Google Sheetsテンプレート（CSV 9枚）＋
   セットアップガイド
4. `04_SETUP_GUIDE/` — セットアップガイド（7ファイル: START_HERE /
   WEB_SETUP / GAS_SETUP / SHEETS_SETUP / CALENDAR_SETUP /
   CONFIG_SETUP / VERCEL_DEPLOY）
5. `05_CUSTOMIZATION/` — カスタマイズガイド（5ファイル: CONTENT /
   MENU / STAFF / IMAGE / DESIGN）
6. `06_TROUBLESHOOTING/` — トラブルシューティングガイド
7. `07_LICENSE/` — 利用ライセンス
8. `08_DEMO/` — デモパック（6デザインプリセットの実画面スクリーンショット、
   プリセット詳細、クイックスタート/カスタマイズの流れ/FAQガイド）
9. `README_JA.md` — 本製品の概要
10. `WHAT_YOU_GET_JA.md` — 含まれるもの一覧
11. `DESIGN_CUSTOMIZATION_MAP_JA.md` — デザインカスタマイズ早見表
12. `VERSION.txt` — バージョン情報

## 実装されている主な機能

- レスポンシブ対応のNext.js製サロンホームページ
- 予約ウィザードUI（`/reservation`）
- Google Apps Script API: `getConfig` / `getServices` / `getStaff` /
  `getAvailability` / `createReservation`
- Google Sheetsデータ層（`CONFIG` / `HOLIDAYS` / `SERVICES` / `STAFF` /
  `RESERVATIONS` / `CANCELLATION_REQUESTS` / `INQUIRIES` / `EMAIL_LOG` /
  `ERROR_LOG`）
- Google Calendarとの空き状況確認・予約イベント作成
- Gmailによる予約確認メール送信
- 二重予約防止（LockServiceによる排他制御）・予約直前の空き状況再チェック
- 【V1.1】6種類のデザインプリセット（`kinari`/`femme`/`noir`/
  `editorial`/`natural`/`modern`）— 配色・フォント・Hero/メニュー/
  スタッフ/ギャラリーのレイアウト・セクション順序をまとめて切り替え、
  `SALON_DESIGN_PRESET`環境変数でビルド時に選択（詳細は
  `05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`）
- 【V1.1】Heroレイアウト3種（fullscreen/split/editorial）、メニュー
  レイアウト3種（editorial-list/card-grid/minimal-price-list）、
  スタッフレイアウト2種（portrait-grid/horizontal-profile）、
  ギャラリーレイアウト3種（grid/masonry/feature-editorial）
- 【V1.1】ホームページ11セクションの表示/非表示・並び替え設定
  （末尾の予約CTA・ヘッダー/フッターは並び替え対象外の固定要素）

## 秘匿情報について

本製品には、開発者ご自身のGoogleアカウント情報・APIキー・スクリプト
ID・デプロイURLなどの秘匿情報は一切含まれていません。すべて購入者
ご自身のGoogle/GitHub/Vercelアカウントで設定していただく設計です。
