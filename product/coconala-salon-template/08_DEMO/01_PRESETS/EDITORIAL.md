# EDITORIAL（エディトリアル）

**雑誌のような洗練されたスタイリッシュなデザイン**

白と黒を基調とした高コントラストな配色に、和文の力強いサンセリフ
（Zen Kaku Gothic New）と欧文の見出しセリフ（Playfair Display）を
組み合わせた、6プリセットの中でもっとも視覚的に個性の強い組み合わせ
です。中央寄せの名前・キャッチコピーから始まり、写真を左右にオフセット
配置する、雑誌の扉ページのような非対称レイアウトのHeroが特徴です。

## スクリーンショット

- デスクトップ: [`../02_SCREENSHOTS/desktop/editorial-desktop.jpg`](../02_SCREENSHOTS/desktop/editorial-desktop.jpg)
- モバイル: [`../02_SCREENSHOTS/mobile/editorial-mobile.png`](../02_SCREENSHOTS/mobile/editorial-mobile.png)

（実際にビルドしたV1.1.0テンプレートを、実ブラウザで表示して撮影した
スクリーンショットです。）

## 構成（`config/design-presets.ts` より）

| 項目 | 値 |
|---|---|
| 配色テーマ (`theme`) | `editorial` — 背景 `#ffffff` / アクセント `#86691f`（マスタードゴールド） |
| 見出しフォント | Zen Kaku Gothic New（和文） / Playfair Display（欧文） |
| Hero レイアウト | `editorial` — 中央寄せの名前・キャッチコピー＋写真の非対称オフセット配置 |
| メニュー レイアウト | `editorial-list` — カテゴリ見出し＋罫線区切りのリスト |
| スタッフ レイアウト | `horizontal-profile` — 正方形写真＋プロフィールを横並びにした1人1行形式 |
| ギャラリー レイアウト | `feature-editorial` — 1枚を大きく見せる「主役写真」＋周囲の小さな写真 |
| セクション順序 | Gallery を Concept より前に配置（hero → **gallery** → concept → menu → staff → …） |
| セクション表示 | 任意セクションはすべて表示 |

## こんなイメージに向いています

雑誌・ファッション誌のような、デザイン性を強く打ち出したいサロン。
最初の訪問で強い視覚的インパクトを残したい場合に向いた構成です
（これは方向性の説明であり、特定業種専用という意味ではありません）。
