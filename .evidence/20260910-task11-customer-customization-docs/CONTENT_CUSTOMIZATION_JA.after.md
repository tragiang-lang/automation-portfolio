# コンテンツ カスタマイズガイド

このテンプレートで変更できる内容は、大きく2種類に分かれます。

```text
業務データ（business data）
  → 店舗名・営業時間・メニュー・スタッフ・連絡先など
  → Google Sheets で編集する

プレゼンテーション/デザイン（presentation / design）
  → 配色・フォント・余白・レイアウトなど
  → ソースコード（app/globals.css, config/theme.ts など）で編集する
```

どのファイルを触ってよいか迷ったときは、「実際のお客様に見せる文言や
数字（店舗名・価格・営業時間など）を変えたいのか」「見た目のスタイル
（色・余白・アニメーションなど）を変えたいのか」で判断してください。
前者はGoogle Sheets、後者はソースコードです。

## 業務データ（Google Sheetsで編集）

| 変更したい内容 | 編集先 | 詳細ガイド |
|---|---|---|
| 店舗名・電話番号・メール・住所・営業時間・機能ON/OFF | `CONFIG`シート | [`../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](../04_SETUP_GUIDE/CONFIG_SETUP_JA.md) |
| 休業日 | `HOLIDAYS`シート | [`../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](../04_SETUP_GUIDE/CONFIG_SETUP_JA.md) |
| メニュー（施術内容・価格・所要時間） | `SERVICES`シート | [`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md) |
| スタッフ（名前・有効/無効・カレンダー） | `STAFF`シート | [`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md) |
| 画像（トップ画像・ギャラリー・スタッフアイコン） | `public/images/` フォルダ | [`IMAGE_CUSTOMIZATION_JA.md`](IMAGE_CUSTOMIZATION_JA.md) |

## プレゼンテーション/デザイン（ソースコードで編集）

| 変更したい内容 | 編集先 | 詳細ガイド |
|---|---|---|
| サイト全体のデザイン（プリセット） | `SALON_DESIGN_PRESET`（環境変数） | [`DESIGN_CUSTOMIZATION_JA.md`](DESIGN_CUSTOMIZATION_JA.md) |
| Hero/メニュー/スタッフ/ギャラリーのレイアウト型・セクション表示/順序 | `config/design-presets.ts` | [`DESIGN_CUSTOMIZATION_JA.md`](DESIGN_CUSTOMIZATION_JA.md) |
| 配色・アクセントカラー | `app/globals.css` | [`DESIGN_CUSTOMIZATION_JA.md`](DESIGN_CUSTOMIZATION_JA.md) |
| フォント | `config/typography-tokens.ts` | [`DESIGN_CUSTOMIZATION_JA.md`](DESIGN_CUSTOMIZATION_JA.md) |
| 余白・アニメーション速度 | `config/theme.ts` | [`DESIGN_CUSTOMIZATION_JA.md`](DESIGN_CUSTOMIZATION_JA.md) |

## `config/demo-content.ts` について（重要・データが優先される順番）

`01_WEB_TEMPLATE/salon-website/config/demo-content.ts` には、フロント
エンド専用のデモ文言（キャッチコピー・FAQ・アクセス案内・ご来店の
流れ・サロンの特徴・ギャラリー画像リストと、`GAS_WEBAPP_URL`未設定時
のメニュー/スタッフのフォールバック用データ）が含まれています。

**店舗の基本情報（店舗名・電話番号・メール・住所・営業時間・機能
ON/OFF）は`CONFIG`シートが優先されます**（`getRuntimeConfig()`経由で
Sheetsの値が使われ、`GAS_WEBAPP_URL`未設定時のみ`demo-content.ts`の
値がフォールバックとして使われます）。

**トップページの「メニュー」「スタッフ紹介」セクションと、予約フォーム
（`/reservation`）のメニュー選択・スタッフ選択は、どちらも同じ
`SERVICES`/`STAFF`シートを情報源としています**（`getServices`/
`getStaff`、`getRuntimeCatalog()`経由）。`SERVICES`/`STAFF`シートを
編集すると、次回のページ表示からトップページ・予約フォームの両方に
反映されます。`demo-content.ts`内の`SERVICES`/`STAFF`は、
`GAS_WEBAPP_URL`が未設定のとき、またはGAS側との通信でエラーが
発生したときにのみ使われるフォールバック用データであり、通常運用中に
編集する必要はありません。詳しい手順は
[`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md) と
[`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md) を参照して
ください。

一方で、FAQ・アクセス案内・ギャラリー・サロンの特徴・ご来店の流れは、
対応するGoogle Sheetsが存在せず、現バージョンでは
`config/demo-content.ts`に直接書かれた内容がそのまま表示されます
（画像の差し替え・`alt`テキストの変更は
[`IMAGE_CUSTOMIZATION_JA.md`](IMAGE_CUSTOMIZATION_JA.md)を参照）。

現在`demo-content.ts`に入っているデモ内容（すべて架空のデータです）:

- 店舗名: `凛`（Rin Nail & Eyelash）
- キャッチコピー: `静けさの中で、指先とまなざしを整える。`
- 電話番号: `03-1234-5678`
- メール: `info@rin-salon.example.com`
- 住所: `東京都中央区銀座1-2-3 銀座ビルディング5F`
- デモメニュー7件・デモスタッフ4名（田中あい・鈴木さくら・佐藤みなみ・
  山本ゆい）
- FAQ・アクセス案内・サロンの特徴・ご来店の流れ

編集する際は、既存のインポート構造（ページの組み立て元や`lib/config/`
配下の設定解決ロジックなど、あらかじめこのファイルを参照している箇所）
を変えないようにしてください。新しいコンポーネントから直接
`config/demo-content.ts`をインポートするような使い方は避け、必要な
データはページの組み立て元（`app/*/page.tsx`）経由でpropsとして渡す、
既存の設計を踏襲してください。
