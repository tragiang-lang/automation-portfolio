# はじめに（START HERE）

## 対象読者

本パッケージは、**基本的なWeb開発・Googleサービスの操作ができる方**を
対象としています。具体的には、フリーランスエンジニア・個人のWeb制作者、
Next.js/GitHub/Vercelにある程度慣れている方、または技術的なサポートを
受けられる店舗運営者を想定しています。

「専門知識不要」「誰でも簡単」「完全自動」「コピペだけで完成」という
製品ではありません。Node.js/npmの操作、GitHubリポジトリの扱い、
Google Apps Scriptのデプロイ、Google Sheets/Calendarの設定など、複数の
Googleサービスをご自身で設定していただく必要があります。

導入が難しいと感じる場合は、`06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md`
をご確認いただくか、導入・カスタマイズサービス（別売り）のご利用を
ご検討ください。

## セットアップの流れ（全12ステップ）

### STEP 1: 準備するもの

- Node.js 20以上、npm
- GitHubアカウント
- Googleアカウント（Sheets / Calendar / Apps Script / Gmail を使用）
- Vercelアカウント（無料プランで開始可能）

### STEP 2: テンプレートを取得

このZIPファイルを、作業用フォルダに展開してください。

### STEP 3: Next.jsプロジェクトをセットアップ

詳細手順は [`WEB_SETUP_JA.md`](WEB_SETUP_JA.md) を参照してください。

### STEP 4: Google Sheetsを作成

詳細手順は
[`../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`](../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md)
を参照してください。

### STEP 5: Google Apps Scriptをセットアップ

詳細手順は [`GAS_SETUP_JA.md`](GAS_SETUP_JA.md) を参照してください。

### STEP 6: Google Calendarを設定

詳細手順は [`CALENDAR_SETUP_JA.md`](CALENDAR_SETUP_JA.md) を参照して
ください。

### STEP 7: Gmailを確認

予約確認メールは、Apps Scriptをデプロイした際の実行アカウント（あなたの
Googleアカウント）のGmailからそのまま送信されます。特別な設定は不要
ですが、送信元アドレスがそのGoogleアカウントのメールアドレスになる点を
ご確認ください（詳細は [`GAS_SETUP_JA.md`](GAS_SETUP_JA.md) 参照）。

### STEP 8: CONFIGを設定

詳細手順は [`CONFIG_SETUP_JA.md`](CONFIG_SETUP_JA.md) を参照してください。

### STEP 9: ローカルで動作確認

`01_WEB_TEMPLATE/salon-website` で `npm run dev` を実行し、
http://localhost:3000 で表示を確認します。

### STEP 10: Vercelへデプロイ

詳細手順は [`VERCEL_DEPLOY_JA.md`](VERCEL_DEPLOY_JA.md) を参照してください。

### STEP 11: 予約テスト

本番URLの `/reservation` から、実際に1件テスト予約を送信し、Google
Sheets・Google Calendar・確認メールにそれぞれ反映されるか確認します。

### STEP 12: 本番利用開始

`CONFIG`/`SERVICES`/`STAFF`シートのデモデータ、および画像・文言を
すべてご自身の実データに置き換えてから、正式に公開してください。

## 次に読むもの

- コンテンツ（文言・メニュー・スタッフ・画像・デザイン）を変更したい場合
  → [`../05_CUSTOMIZATION/`](../05_CUSTOMIZATION/)
- うまく動かない場合
  → [`../06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md`](../06_TROUBLESHOOTING/TROUBLESHOOTING_JA.md)
