# 実機撮影ランブック（手動実施が必要な項目）

ブラウザエミュレーションは実機動作の証明にはなりません（§23）。
以下は、実機・実LINE環境で改めて撮影・確認すべき項目のみを列挙します。

## Salon

```text
[ ] iPhone Safari — ホーム（レスポンシブ崩れが無いか）
[ ] Android Chrome — ホーム（同上）
[ ] iPhone Safari — お問い合わせフォームの入力体験（キーボード表示時の
    レイアウト崩れ確認）
[ ] 実GAS Web Appデプロイ環境での予約ウィザード一連の動作（現状ローカル
    では「サーバーエラー」で停止するため、実デプロイ後に要再検証）
```

Before recording:
- デプロイ済みのURL、実際に接続されたGAS Web AppのURL
- テスト用のGoogleカレンダー（実顧客の予定と混在しないもの）

## Site Report

```text
[ ] iPhone + LINE/LIFF起動（LIFF URLをLINEのトークから開く）
[ ] iPhone実機での現場報告送信（現場選択→入力→写真添付→送信→成功）
[ ] Android + LINE/LIFF起動
[ ] Android実機での現場報告送信
[ ] 送信後、実際にGoogle Sheets（REPORTS/REPORT_PHOTOS）に行が追加
    されていることの確認
[ ] 送信後、実際にGoogle Driveに写真が保存されていることの確認
[ ] 通知メールが実際に届くことの確認（実装されている場合のみ — 事前に
    `docs/site-report-architecture-overview.md` で通知仕様を再確認する）
```

Before recording:
- LINE Developersでのテスト用LIFFチャンネル
- 実デプロイ済みのWebアプリURL（Vercel等）
- 実デプロイ済みのGAS Web App URLとCONFIGキー一式
- テスト用のGoogle SheetsテンプレートとGoogle Driveフォルダ
- テスト用の写真（§28参照 — 実在の作業員・実在の現場を含まないもの）
- テスト用LINEアカウント（実際の顧客・実際の社員のアカウントを使わない）

Recording:
上記「実LIFF/実バックエンド」の各チェック項目を、
`video/site-report-recording-script.md` の「REAL LIFF / REAL E2E
RECORDING」セクションの手順に従って実施する。

After recording:
- 個人情報（実名・実在の顔・実在住所）が映っていないか確認
- 認証情報・トークン・APIキーが画面に映っていないか確認（URLバー、
  DevTools、環境変数設定画面等）
- デバッグUI・コンソールログが映っていないか確認
- 日本語表示が正しく読めるか確認
- 通知バナー（LINEの他のトーク通知等）が誤って映り込んでいないか確認
- 表示されている「成功」が、Sheets/Driveの実データで裏付けられている
  ことを確認（表示だけを信用しない）
