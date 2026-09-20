# FEMME（フェム）

**女性らしい・上品で華やかなデザイン**

ブラッシュクリームの背景に、あえて彩度を抑えたダスティローズの
アクセントを合わせた、柔らかく上品な配色です。写真を左右に大きく
見せるHeroと、写真の訴求力を活かすため通常より前に置いたギャラリーで、
華やかさと上品さを両立させています。

## スクリーンショット

- デスクトップ: [`../02_SCREENSHOTS/desktop/femme-desktop.jpg`](../02_SCREENSHOTS/desktop/femme-desktop.jpg)
- モバイル: [`../02_SCREENSHOTS/mobile/femme-mobile.png`](../02_SCREENSHOTS/mobile/femme-mobile.png)

（実際にビルドしたV1.1.0テンプレートを、実ブラウザで表示して撮影した
スクリーンショットです。）

## 構成（`config/design-presets.ts` より）

| 項目 | 値 |
|---|---|
| 配色テーマ (`theme`) | `femme` — 背景 `#fdf5f3` / アクセント `#a14f5a` |
| 見出しフォント | Shippori Mincho（和文） / Cormorant Garamond（欧文） — Kinariと共通の上品なセリフ体 |
| Hero レイアウト | `split` — テキストと写真を左右2カラムに分ける構成 |
| メニュー レイアウト | `card-grid` — メニュー1件ごとに枠線付きカードでグリッド表示 |
| スタッフ レイアウト | `portrait-grid` — 縦長ポートレート写真のグリッド |
| ギャラリー レイアウト | `masonry` — タイルの大きさを変化させる雑誌風レイアウト |
| セクション順序 | Gallery を Menu より前に配置（hero → concept → **gallery** → menu → staff → …） |
| セクション表示 | 任意セクションはすべて表示 |

## こんなイメージに向いています

女性らしい柔らかさ・華やかさを前面に出したいサロン。写真の訴求力を
早い段階で見せたい場合に向いた構成です（これは方向性の説明であり、
特定業種専用という意味ではありません）。
