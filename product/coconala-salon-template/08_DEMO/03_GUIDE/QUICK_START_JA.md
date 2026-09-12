# クイックスタート

このガイドは、基本的な技術知識をお持ちの方向けの「最短ルート」です。
各ステップの詳細な手順は、リンク先の正式なセットアップガイドを
参照してください。正式な手順は
[`../../04_SETUP_GUIDE/START_HERE_JA.md`](../../04_SETUP_GUIDE/START_HERE_JA.md)
（全12ステップ）です。このクイックスタートはそれを置き換えるものでは
なく、全体像を先につかむためのものです。

## 1. 必要なもの

- Node.js 20以上、npm
- GitHubアカウント
- Googleアカウント（Sheets / Calendar / Apps Script / Gmail を使用）
- Vercelアカウント（無料プランで開始可能）
- Node.js/npm、Git/GitHub、TypeScript/Reactの基礎知識
- Google Apps Script・Google Sheetsの基本操作ができること

「専門知識不要」の製品ではありません。上記に不慣れな場合は、導入前に
[`../../README_JA.md`](../../README_JA.md) の「誰向けか」もご確認ください。

## 2. ZIPを展開

購入したZIPファイルを、作業用フォルダに展開します。

## 3. Node.js / npm

`01_WEB_TEMPLATE/salon-website/` に移動し、依存パッケージをインストール
します。

```bash
cd 01_WEB_TEMPLATE/salon-website
npm install
```

## 4. GitHub

このフォルダの内容をご自身のGitHubリポジトリにプッシュします
（Vercelへのデプロイに必要です）。本製品自体の公開リポジトリでの
再配布は利用ライセンスで禁止されています —
[`../../07_LICENSE/LICENSE_JA.txt`](../../07_LICENSE/LICENSE_JA.txt)
を参照してください。

## 5. Google Apps Script

予約バックエンドをデプロイします。詳細手順は
[`../../04_SETUP_GUIDE/GAS_SETUP_JA.md`](../../04_SETUP_GUIDE/GAS_SETUP_JA.md)
を参照してください。

## 6. Google Sheets

`CONFIG` / `HOLIDAYS` / `SERVICES` / `STAFF` などのシートを作成します。
詳細手順は
[`../../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`](../../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md)
を参照してください。

## 7. 環境変数

`01_WEB_TEMPLATE/salon-website/.env.local` に、以下の2つを設定します
（`.env.example` を参考にしてください）。

```env
GAS_WEBAPP_URL=
SALON_DESIGN_PRESET=kinari
```

- `GAS_WEBAPP_URL` — STEP 5でデプロイしたGoogle Apps WebアプリのURL。
  未設定のままだとデモ表示（`config/demo-content.ts` のサンプルデータ）
  で動作します。
- `SALON_DESIGN_PRESET` — 6つのデザインプリセット
  （`kinari`/`femme`/`noir`/`editorial`/`natural`/`modern`）のいずれか。
  未設定の場合は `kinari` になります。

**`SALON_DESIGN_PRESET` はビルド時に確定する設定です。** 値を変更したら、
ローカルでは開発サーバーの再起動、本番ではVercel上での再デプロイが
必要です。設定画面から即座に切り替わるライブ機能ではありません。
詳しくは
[`../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md)
を参照してください。

## 8. デザインプリセット選択

上記の `SALON_DESIGN_PRESET` で、6つのデザインから選びます。迷ったら
[`../README_JA.md`](../README_JA.md) の比較表と
[`../01_PRESETS/`](../01_PRESETS/) の各詳細ページを参照してください。

## 9. ローカル確認

```bash
npm run dev
```

http://localhost:3000 で表示を確認します。あわせて以下も実行し、
問題がないことを確認してください。

```bash
npm test           # Jest + React Testing Library
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run build      # 本番ビルド（デザイン設定はここで確定する）
```

## 10. Vercelデプロイ

詳細手順は
[`../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`](../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md)
を参照してください。Vercelの環境変数にも `GAS_WEBAPP_URL` と
`SALON_DESIGN_PRESET` の設定を忘れないようにしてください。

## 次に読むもの

- 何をどの順番でカスタマイズするか
  → [`CUSTOMIZATION_FLOW_JA.md`](CUSTOMIZATION_FLOW_JA.md)
- よくある質問 → [`CUSTOMER_FAQ_JA.md`](CUSTOMER_FAQ_JA.md)
- 正式なセットアップ手順（全12ステップ）
  → [`../../04_SETUP_GUIDE/START_HERE_JA.md`](../../04_SETUP_GUIDE/START_HERE_JA.md)
