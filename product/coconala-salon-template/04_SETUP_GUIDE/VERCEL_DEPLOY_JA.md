# Vercel デプロイガイド

本製品には、開発者（販売者）自身のVercelプロジェクトは一切含まれて
いません。以下の手順で、購入者ご自身のVercelアカウント上に、独立した
デプロイを作成してください。

## 1. GitHubリポジトリを用意する

`01_WEB_TEMPLATE/salon-website/` フォルダの内容を、ご自身のGitHub
リポジトリにpushしてください（新規リポジトリを作成し、この内容を
初回コミットとしてpushする形で問題ありません）。

## 2. Vercelへインポートする

1. [Vercel](https://vercel.com) にログインし、「Add New...」→
   「Project」を選択します。
2. 手順1で作成したGitHubリポジトリを選択してインポートします。
3. リポジトリ全体を`01_WEB_TEMPLATE/salon-website`だけの単独リポジトリ
   としてpushした場合は、そのままインポートできます。既存のモノレポ
   構成（複数プロジェクトを1つのリポジトリにまとめた構成）のまま
   pushした場合は、Vercelの「Root Directory」設定で
   `01_WEB_TEMPLATE/salon-website` を指定してください。

## 3. 環境変数を設定する

Vercelのプロジェクト設定 →「Environment Variables」で、以下を追加します。

| 変数名 | 値 |
|---|---|
| `GAS_WEBAPP_URL` | `GAS_SETUP_JA.md` の手順で発行したGAS WebアプリURL |
| `SALON_DESIGN_PRESET` | サイトのデザインプリセット（`kinari`/`femme`/`noir`/`editorial`/`natural`/`modern`のいずれか。未設定時は`kinari`） |

この2つの変数は役割が異なります。`GAS_WEBAPP_URL`は予約・お問い合わせ
などの**業務データ**（予約枠、Menu/Staffの内容など）をGAS側から取得する
ための接続先で、`SALON_DESIGN_PRESET`はサイトの**見た目**（配色・
フォント・レイアウト）だけを切り替える設定です。どちらか一方だけを
設定しても、もう一方には影響しません。

`SALON_DESIGN_PRESET`は**ビルド時に確定する静的な設定**です。デプロイ後に
管理画面などから動的に切り替えることはできません — 値を変更した場合は、
Vercelの環境変数を変更したうえで、再デプロイ（Redeploy）を実行して
ください（自動デプロイが有効なら、GitHubへのpushで自動的に再ビルドされ
ます）。各プリセットの詳しい違いは
`05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`を参照してください。

## 4. デプロイする

設定を保存すると、Vercelが自動的にビルド・デプロイを実行します。
完了すると、`https://xxxxx.vercel.app` のような本番URLが発行されます。

## 5. デプロイ後のテスト

1. `https://（発行されたURL）/api/health` にアクセスし、
   `{"status": "ok", ...}` が返ることを確認します。
2. トップページと `/reservation` ページが正しく表示されることを
   確認します。
3. 発行された本番URLを、GAS側のスクリプトプロパティ`SITE_BASE_URL`
   にも設定してください（`GAS_SETUP_JA.md` 参照。予約キャンセル用の
   リンク生成に使用されます）。
4. `START_HERE_JA.md` STEP 11の手順で、実際にテスト予約を送信して
   動作確認を行ってください。

## 補足

Vercelプロジェクト・GitHubリポジトリ・独自ドメインの有無は、すべて
購入者ご自身の環境・ご判断に委ねられます。特定のドメインを前提とした
設定は本パッケージには含まれていません。
