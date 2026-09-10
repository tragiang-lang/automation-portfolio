# Web（Next.js）セットアップガイド

対象フォルダ: `01_WEB_TEMPLATE/salon-website/`

## 前提条件

- Node.js 20以上
- npm

## インストール

```bash
cd 01_WEB_TEMPLATE/salon-website
npm install
```

## 環境変数の設定

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

`.env.local` の中身は次の2つです:

```text
GAS_WEBAPP_URL=
SALON_DESIGN_PRESET=kinari
```

`GAS_WEBAPP_URL` には、`GAS_SETUP_JA.md` の手順でデプロイした後に発行
される、Google Apps ScriptのWebアプリURLを設定します。

このコネクションは**サーバー側専用**です（`NEXT_PUBLIC_`が付いていない
ため、ブラウザ側のJavaScriptコードには一切渡りません）。値を設定していない
間は、`config/demo-content.ts`に含まれるデモデータでページが表示され、
GAS側のAPIとは通信しません。

`SALON_DESIGN_PRESET` には、サイト全体の見た目（配色・フォント・
Hero/メニュー/スタッフ/ギャラリーのレイアウト・セクション順序）を切り替える
デザインプリセットを設定します。指定できる値は次の6種類です:

```text
kinari / femme / noir / editorial / natural / modern
```

未設定の場合は`kinari`（初期設定の見た目）になります。上記6種類にない
値を指定した場合も、安全に`kinari`へフォールバックします（サイトが
壊れたり真っ白になったりすることはありません）。

**この値はビルド時に確定する、静的な設定です。** デプロイ後に管理画面
などから動的に切り替えることはできません — 値を変更した場合は、
再ビルド・再デプロイが必要です（ローカルなら`npm run build`のやり直し、
Vercelなら環境変数を変更して再デプロイ）。

各プリセットの詳しい違いや、色・フォント・レイアウトを個別にカスタマイズ
する方法は、`05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`を参照して
ください。

## ローカル開発

```bash
npm run dev
```

http://localhost:3000 で表示を確認できます。

## 本番ビルド

```bash
npm run build
npm start
```

## 動作確認コマンド

```bash
npm run typecheck   # 型チェック（tsc --noEmit）
npm test            # Jest + React Testing Library
npm run lint         # ESLint
```

**注意**: `npm run typecheck` は、`npm run dev` または `npm run build`
を一度も実行していない状態（`.next`フォルダが存在しない状態）で
先に単独実行すると、`Cannot find name 'LayoutProps'` というエラーに
なることがあります。これはNext.js側が`.next/types/`にルート情報から
自動生成する型定義で、`npm run dev`または`npm run build`を一度実行
すれば解消します。上記の「ローカル開発」または「本番ビルド」を先に
一度実行してから、型チェックを行ってください。

## フロントエンドとGASの通信経路

ブラウザは直接GASのWebアプリURLを呼び出すのではなく、Next.jsの
サーバー側プロキシ経由で通信します。

```text
ブラウザ → /api/gas (Next.jsサーバー側、app/api/gas/route.ts)
        → GAS Webアプリ (GAS_WEBAPP_URL)
```

`GAS_WEBAPP_URL`のようなシークレットに近い値がブラウザ側に露出しない
設計になっています。
