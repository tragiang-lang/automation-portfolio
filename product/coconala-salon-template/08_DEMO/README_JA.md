# デモパック — 6つのデザインプリセット

## このデモについて

このフォルダは、V1.1.0テンプレートが実際にどう見えるかを、購入前・
購入後に確認していただくためのデモパックです。掲載しているスクリーン
ショットはすべて、本製品と同じソースコード（`01_WEB_TEMPLATE/`）を
実際にビルド・起動し、実ブラウザで表示して撮影したものです。加工した
イメージ画像やモックアップではありません。

同じサロンコンテンツ（店名・メニュー・スタッフ・ギャラリー・予約導線）
を使い、デザイン設定だけを6通りに切り替えて撮影しています。

> 1つのサロンコンテンツを、6種類のデザインに変更できます。

## 6つのデザインプリセット

| プリセット | 方向性 | 詳細 |
|---|---|---|
| [KINARI（凛）](01_PRESETS/KINARI.md) | 自然・温かみのあるナチュラルなデザイン（初期設定） | [KINARI.md](01_PRESETS/KINARI.md) |
| [FEMME（フェム）](01_PRESETS/FEMME.md) | 女性らしい・上品で華やかなデザイン | [FEMME.md](01_PRESETS/FEMME.md) |
| [NOIR（ノワール）](01_PRESETS/NOIR.md) | 高級感・モダンで洗練されたデザイン | [NOIR.md](01_PRESETS/NOIR.md) |
| [EDITORIAL（エディトリアル）](01_PRESETS/EDITORIAL.md) | 雑誌のような洗練されたスタイリッシュなデザイン | [EDITORIAL.md](01_PRESETS/EDITORIAL.md) |
| [NATURAL（ナチュラル）](01_PRESETS/NATURAL.md) | ナチュラル・やさしく親しみやすいデザイン | [NATURAL.md](01_PRESETS/NATURAL.md) |
| [MODERN（モダン）](01_PRESETS/MODERN.md) | シンプル・都会的で洗練されたデザイン | [MODERN.md](01_PRESETS/MODERN.md) |

6つすべてを1枚にまとめたショーケース画像:
[`02_SCREENSHOTS/showcase/6-presets-showcase.png`](02_SCREENSHOTS/showcase/6-presets-showcase.png)

## プリセット比較表

`config/design-presets.ts`（実装）から抽出した、実際の設定値です。

| プリセット | 配色テーマ | 見出しフォント（和文/欧文） | Hero | メニュー | スタッフ | ギャラリー | 全体の雰囲気 |
|---|---|---|---|---|---|---|---|
| kinari | kinari | Shippori Mincho / Cormorant Garamond | fullscreen | editorial-list | portrait-grid | grid | 和・自然・静けさ |
| femme | femme | Shippori Mincho / Cormorant Garamond | split | card-grid | portrait-grid | masonry | 柔らか・上品・華やか |
| noir | noir | Shippori Mincho / Playfair Display | fullscreen | minimal-price-list | horizontal-profile | feature-editorial | 高級感・モード・ダーク |
| editorial | editorial | Zen Kaku Gothic New / Playfair Display | editorial | editorial-list | horizontal-profile | feature-editorial | 雑誌・ファッション性 |
| natural | natural | Shippori Mincho / Cormorant Garamond | split | minimal-price-list | portrait-grid | masonry | 自然・オーガニック・癒し |
| modern | modern | Zen Kaku Gothic New / Inter | split | card-grid | horizontal-profile | grid | シンプル・都会的 |

「どのデザインを選べばいいですか？」と迷ったときは、この表と各プリセット
の詳細ページ、[`02_SCREENSHOTS/`](02_SCREENSHOTS/) の実画面を見比べて
選んでください。

## デザインを変更すると何が変わる？

`SALON_DESIGN_PRESET` を切り替えると、以下がまとめて変わります。

- 配色（`app/globals.css` の `--color-*`、`config/theme-tokens.ts`）
- タイポグラフィ（見出しフォント、`config/typography-tokens.ts`）
- Hero のレイアウト（`heroVariant`）
- メニューのレイアウト（`menuVariant`）
- スタッフのレイアウト（`staffVariant`）
- ギャラリーのレイアウト（`galleryVariant`）
- セクションの並び順（`sectionOrder`）

## 何が共通？

デザインをどれに変えても、以下は一切変わりません。

- 店舗名・キャッチコピー・住所・営業時間などの業務データ（Google Sheets
  `CONFIG` シート）
- メニュー内容・価格・所要時間（Google Sheets `SERVICES` シート）
- スタッフの名前・役職・紹介文（Google Sheets `STAFF` シート）
- 予約フォーム・Google Calendar連携・メール通知などの予約機能

デザインの見た目と、業務データ・予約機能は完全に独立しています。
詳しくは
[`../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md)
の「デザインと業務データの違い」を参照してください。

## どうやって自分のサイトにする？

大まかな流れです（詳細は各ガイドを参照してください）。

```text
1. ZIPを展開
2. Google / GAS設定（Sheets・Apps Script・Calendar）
3. SALON_DESIGN_PRESETを選択（.env.local / Vercel環境変数）
4. サロン情報をカスタマイズ（店名・メニュー・スタッフ・画像）
5. npm run build
6. Vercelへデプロイ
```

詳しくは:

- [`03_GUIDE/QUICK_START_JA.md`](03_GUIDE/QUICK_START_JA.md) — 手を動かす
  ための最短ルート
- [`03_GUIDE/CUSTOMIZATION_FLOW_JA.md`](03_GUIDE/CUSTOMIZATION_FLOW_JA.md)
  — 何をどの順番で変えるかの地図
- [`03_GUIDE/CUSTOMER_FAQ_JA.md`](03_GUIDE/CUSTOMER_FAQ_JA.md) — よくある
  質問
- [`../WHAT_YOU_GET_JA.md`](../WHAT_YOU_GET_JA.md) — V1.1.0に含まれるもの
- [`../DESIGN_CUSTOMIZATION_MAP_JA.md`](../DESIGN_CUSTOMIZATION_MAP_JA.md)
  — 「何を変えたいか」から変更先を探す早見表
- [`../04_SETUP_GUIDE/START_HERE_JA.md`](../04_SETUP_GUIDE/START_HERE_JA.md)
  — 正式なセットアップ手順（全12ステップ）
- [`../05_CUSTOMIZATION/`](../05_CUSTOMIZATION/) — 各カスタマイズの詳細
  技術ガイド

## 対象スキルレベルについて

本製品は「誰でも簡単」「完全ノーコード」の製品ではありません。
Node.js/npm、Git/GitHub、TypeScript/React の基礎、Google Apps Script・
Google Sheets、Vercel の基本操作について、一定の知識があることを
前提としています。詳しくは
[`../README_JA.md`](../README_JA.md) の「誰向けか」を参照してください。
