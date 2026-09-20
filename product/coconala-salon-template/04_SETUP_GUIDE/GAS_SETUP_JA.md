# Google Apps Script（GAS）セットアップガイド

対象フォルダ: `02_GAS/salon-reservation-gas/`

## 1. Apps Scriptプロジェクトを用意する

以下のいずれかの方法で、ご自身のGoogle Apps Scriptプロジェクトを
用意してください。

**方法A: 新規プロジェクトを作成する**

```bash
cd 02_GAS/salon-reservation-gas
npm install
npx clasp login                       # 初回のみ、Googleアカウントでログイン
npx clasp create --type webapp --title "任意のプロジェクト名" --rootDir build
```

**方法B: 既存のApps Scriptプロジェクトに接続する**

```bash
cp .clasp.json.example .clasp.json
```

`.clasp.json` を開き、`scriptId` に実際のApps ScriptプロジェクトIDを
入力してください。

いずれの場合も、`.clasp.json` にはご自身のプロジェクトIDが入ります。
**開発者（販売者）の実際のプロジェクトIDやデプロイURLは、本パッケージ
のどこにも含まれていません**。必ずご自身のIDを設定してください。

## 2. ビルドとデプロイ

```bash
npm run build     # esbuildでソースをビルド（build/Code.js, build/appsscript.json を生成）
npm run push      # ビルド後、clasp push でApps Scriptプロジェクトへアップロード
```

## 3. Webアプリとしてデプロイ

1. Apps Scriptエディタを開きます（`npx clasp open` でも開けます）。
2. 右上の「デプロイ」→「新しいデプロイ」を選択します。
3. 種類は「ウェブアプリ」を選択します。
4. 「実行するユーザー」は **自分（デプロイした本人のGoogleアカウント）**
   を選択します。これは `appsscript.json` の設定
   （`executeAs: "USER_DEPLOYING"`）どおりで、このアカウントが予約確認
   メールの送信元にもなります。
5. 「アクセスできるユーザー」は **全員** を選択します
   （`appsscript.json` の `access: "ANYONE_ANONYMOUS"` 設定どおりで、
   予約フォームからログインなしで呼び出せる必要があるためです）。
6. デプロイすると、WebアプリのURL（`https://script.google.com/macros/s/
   .../exec` の形式）が発行されます。このURLを控えてください。

## 4. スクリプトプロパティを設定する

Apps Scriptエディタの左メニュー「プロジェクトの設定」→
「スクリプト プロパティ」から、以下の2つを設定します。

| プロパティ名 | 説明 | 設定例 |
|---|---|---|
| `SPREADSHEET_ID` | 予約データを保存するGoogle SheetsのID（必須） | `03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md` で作成したスプレッドシートのURL中のID |
| `SITE_BASE_URL` | 予約キャンセル用リンクの生成に使用するサイトのURL | Vercelデプロイ後の本番URL（例: `https://your-salon.vercel.app`） |

この2つのプロパティは、GASのコード全体でこの用途にのみ使われる
スクリプトプロパティです（他に読み取られるプロパティはありません）。

## 5. WebアプリURLをフロントエンド側に設定する

STEP 3で発行されたWebアプリURLを、
`01_WEB_TEMPLATE/salon-website/.env.local` の `GAS_WEBAPP_URL` に
設定します（`WEB_SETUP_JA.md` 参照）。

```text
GAS(デプロイ) → WebアプリURL発行
              ↓
Web(.env.local) の GAS_WEBAPP_URL に設定
```

## 動作確認コマンド

```bash
npm run typecheck   # 型チェック
npm test            # Jest単体テスト（src/**/*.ts を直接テスト、ビルド後のバンドルは対象外）
```

## 実装されているAPIアクション

`doPost` へのリクエスト（`{"action": "...", "payload": {...}}`）で
呼び出せるアクションは次の5つです（`src/Api.ts`のディスパッチ）:
`getConfig` / `getServices` / `getStaff` / `getAvailability` /
`createReservation`。これ以外のアクション名を指定すると
`VALIDATION_ERROR` が返ります。
