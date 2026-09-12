# カスタマイズの流れ（ナビゲーション）

このページは、「何をどの順番で変更すればよいか」の地図です。詳しい
手順は各カスタマイズガイド（[`../../05_CUSTOMIZATION/`](../../05_CUSTOMIZATION/)）
にまとまっているため、ここでは重複させず、行き先だけを示します。

## 推奨の順序

```text
まず変更する
↓
店名・住所・営業時間（Google Sheets CONFIGシート）
↓
MENU（Google Sheets SERVICESシート）
↓
STAFF（Google Sheets STAFFシート）
↓
画像（public/images/ フォルダ）
↓
デザイン（SALON_DESIGN_PRESET・config/design-presets.ts）
↓
予約設定（CONFIGシートの機能ON/OFF・Google Calendar）
↓
npm run build
↓
Vercelへデプロイ
```

業務データ（店名・メニュー・スタッフなど）を先に固めてから、最後に
デザインを選ぶ順序を推奨します。デザインプリセットを変えても業務データ
は変わらないため、逆順（デザインを先に決めてから業務データを入れる）
でも問題ありません。

## 各ステップの詳細ガイド

| ステップ | 変更先 | 詳細ガイド |
|---|---|---|
| 店名・住所・営業時間・連絡先 | Google Sheets `CONFIG`シート | [`../../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](../../04_SETUP_GUIDE/CONFIG_SETUP_JA.md) |
| MENU（施術内容・価格・所要時間） | Google Sheets `SERVICES`シート | [`../../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md) |
| STAFF（名前・役職・紹介文） | Google Sheets `STAFF`シート | [`../../05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md) |
| 画像（Hero・ギャラリー・スタッフ写真） | `public/images/` フォルダ | [`../../05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md) |
| デザイン（配色・フォント・レイアウト） | `SALON_DESIGN_PRESET` / `config/design-presets.ts` | [`../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md) |
| 文言全般（見出し・コンセプト文など） | 各種設定/コンポーネント | [`../../05_CUSTOMIZATION/CONTENT_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/CONTENT_CUSTOMIZATION_JA.md) |
| 予約設定（機能ON/OFF・カレンダー） | Google Sheets `CONFIG`シート / Google Calendar | [`../../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](../../04_SETUP_GUIDE/CONFIG_SETUP_JA.md)・[`../../04_SETUP_GUIDE/CALENDAR_SETUP_JA.md`](../../04_SETUP_GUIDE/CALENDAR_SETUP_JA.md) |
| ビルド・確認 | `npm run build` ほか | [`../README_JA.md`](../README_JA.md) の「ビルドと確認」 |
| デプロイ | Vercel | [`../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`](../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md) |

## 重要な注意点

- 業務データ（店名・価格・スタッフ情報など）は、必ずGoogle Sheetsで
  編集してください。デザイン設定ファイル（`config/design-presets.ts`
  など）に直接書き込むと、Sheets側の更新が画面に反映されなくなります。
- デザインを変更しても、予約フォームの動作・Google Calendar連携・
  メール通知は一切変わりません。
- 変更後は必ず `npm run typecheck` / `npm run lint` / `npm test` /
  `npm run build` を実行してから公開してください
  （[`../README_JA.md`](../README_JA.md) の「ビルドと確認」参照）。
