# デザインカスタマイズ 早見表

「何を変更したいか」から、変更先のファイル/設定を探すための早見表です。
詳細な手順は各リンク先のガイドを参照してください。この表自体は
ナビゲーション用であり、詳細ガイドの内容を重複させていません。

対象フォルダ: `01_WEB_TEMPLATE/salon-website/`（パスはこのフォルダを
基準にしています）。

| 変更したいもの | 主な変更先 | 詳細ガイド |
|---|---|---|
| デザイン全体 | `SALON_DESIGN_PRESET`（環境変数） | [`05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md) §3 |
| カラー（配色） | `app/globals.css`（`--color-*`） | 同上 §5 |
| フォント（タイポグラフィ） | `config/typography-tokens.ts` / `app/globals.css` | 同上 §6 |
| Hero レイアウト | `config/design-presets.ts`（`heroVariant`） | 同上 §4.2 |
| メニュー レイアウト | `config/design-presets.ts`（`menuVariant`） | 同上 §4.3 |
| スタッフ レイアウト | `config/design-presets.ts`（`staffVariant`） | 同上 §4.4 |
| ギャラリー レイアウト | `config/design-presets.ts`（`galleryVariant`） | 同上 §4.5 |
| セクション表示/非表示 | `config/design-presets.ts`（`sectionVisibility`） | 同上 §7 |
| セクション順序 | `config/design-presets.ts`（`sectionOrder`） | 同上 §8 |
| 店舗名・キャッチコピー・営業時間・連絡先 | Google Sheets `CONFIG`シート | [`04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](04_SETUP_GUIDE/CONFIG_SETUP_JA.md) |
| 画像（Hero・ギャラリー・スタッフ写真） | `public/images/` フォルダ | [`05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md`](05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md) |
| MENU（施術内容・価格・所要時間） | Google Sheets `SERVICES`シート | [`05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`](05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md) |
| STAFF（名前・役職・紹介文） | Google Sheets `STAFF`シート | [`05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`](05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md) |

## 重要な原則

デザイン設定（上の表の上半分）と、業務データ（下半分・Google Sheets
で管理するもの）は、必ず分けて管理してください。業務データをデザイン
設定ファイルに直接書き込むと、Google Sheets側を更新しても画面に反映
されなくなります。詳しくは
[`05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md)
の「デザインと業務データの違い」を参照してください。

## デモパックとの関係

6つのデザインプリセットを実際の画面で見比べたい場合は
[`08_DEMO/README_JA.md`](08_DEMO/README_JA.md) を参照してください。
