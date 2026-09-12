# よくある質問（FAQ）

## Q1. 6つのデザインはどうやって切り替えますか？

`SALON_DESIGN_PRESET` という環境変数（`.env.local` またはVercelの
Environment Variables）に、`kinari`/`femme`/`noir`/`editorial`/
`natural`/`modern` のいずれかを設定します。**この設定はビルド時に
確定します。** ローカルなら開発サーバーの再起動、本番ならVercel上での
再デプロイが必要です。設定を保存しただけでは見た目は変わりません。
詳しくは
[`../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/DESIGN_CUSTOMIZATION_JA.md)
を参照してください。

## Q2. デザインを変えると予約機能も変わりますか？

変わりません。デザインプリセットが変えるのは、配色・フォント・
Hero/メニュー/スタッフ/ギャラリーのレイアウト・セクションの並び順
だけです。予約フォームの入力項目、Google Calendarとの空き状況連携、
Gmailでの確認メール送信といった予約の動作は、デザイン設定とは完全に
独立しており、どのプリセットを選んでも同じように動作します。

## Q3. MENUやSTAFFの内容はどこで変更しますか？

Google Sheetsです。MENU（施術内容・価格・所要時間）は `SERVICES`
シート、STAFF（名前・役職・紹介文）は `STAFF` シートで管理します。
デザイン設定ファイル（`config/`配下）ではありません。詳しくは
[`../../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md)・
[`../../05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md)
を参照してください。

## Q4. 画像は変更できますか？

できます。Hero写真・ギャラリー写真・スタッフ写真は、いずれも
`public/images/` フォルダ配下のファイルを差し替えることで変更します。
詳しくは
[`../../05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md`](../../05_CUSTOMIZATION/IMAGE_CUSTOMIZATION_JA.md)
を参照してください。

## Q5. スマートフォンにも対応していますか？

対応しています。本テンプレートはレスポンシブ対応のNext.js製サイトで、
デスクトップ・スマートフォンの両方で表示できます。このデモパックの
モバイルスクリーンショット（[`../02_SCREENSHOTS/mobile/`](../02_SCREENSHOTS/mobile/)）
も、実際にモバイル幅で表示した画面から撮影したものです。

## Q6. Vercelにデプロイできますか？

できます。本テンプレートはVercelでのデプロイを前提に構成された
Next.jsプロジェクトです。手順は
[`../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`](../../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md)
を参照してください。

## Q7. プログラミング知識は必要ですか？

はい、一定の知識が必要です。本製品は「専門知識不要」「誰でも簡単」を
うたう製品ではありません。Node.js/npmの基本操作、GitHubリポジトリの
扱い、Google Apps Scriptのデプロイ、Google Sheets/Calendarの設定など、
複数の作業をご自身で行っていただく必要があります。対象読者の詳細は
[`../../README_JA.md`](../../README_JA.md) の「誰向けか」を参照して
ください。

## Q8. 購入後に設定をお願いできますか？

本製品（コンテンツ ¥2,500）は、ソースコードとセットアップ・
カスタマイズガイド一式を提供するセルフサービス型の商品です。お客様
環境への導入代行、Vercel/GAS/Googleアカウントの設定代行、個別の
カスタマイズ作業は、本製品の価格には含まれていません。これらの
代行が必要な場合は、別売りの導入・カスタマイズサービスをご検討
ください。詳しくは
[`../../README_JA.md`](../../README_JA.md) の「サポート範囲」を
参照してください。
