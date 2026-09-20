# スクリーンショット自動化について

## 調査結果

リポジトリ全体（`node_modules`除く）を検索した結果、Playwright /
Puppeteer / Cypress / その他のブラウザ自動化・スクリーンショット
ユーティリティは**どちらのアプリにも存在しません**（`package.json`に
該当の依存関係なし）。

## 今回採用した方法

新しいnpm依存関係を追加する明確な理由が無い限り追加しない方針
（§4・§31「Do not install a new browser automation framework if an
existing solution can accomplish the task」）に従い、**Claude Code
環境に既に用意されているブラウザ自動化ツール（Claude in Chrome）**を
使って、実際に起動したdevサーバー（`localhost:4001`/`4002`）を直接
操作・撮影しました。これは新規の依存関係やリポジトリへの変更を伴い
ません。

この方法は「スクリプト」としてリポジトリにコミットされたコードでは
なく、対話的なブラウザ操作セッションです。再現するには、
`../video/salon-recording-script.md` と
`../video/site-report-recording-script.md` に記載した手順を人間が
（またはブラウザ自動化ツールを持つエージェントが）そのままなぞって
ください。

## 将来、再現可能なスクリプトが必要な場合

もし継続的にスクリーンショットを自動生成したい場合は、次のいずれかを
検討してください（いずれも新規依存関係の追加を伴うため、実施前に
明示的な承認を得ることを推奨します）:

- Playwright（`@playwright/test`）を各Webアプリの devDependencies に
  追加し、`tests/`とは別の`e2e-screenshots/`のようなディレクトリで
  スクリーンショット専用のテストを書く。
- 既存のJest + Testing Libraryのセットアップは、DOM構造の検証には
  使えるが、ピクセル単位の見た目のスクリーンショットには向かない
  （ヘッドレスブラウザのレンダリングを行わないため）。

現時点ではこれらは未実施（ASSET CAN BE GENERATED SEPARATELY）です。
