# Site Report — 公開用スクリーンショット

現時点で、このフォルダに置ける「買い手向けに公開可能な実UIスクリーン
ショット」は**ありません**。

理由: `apps/site-report/web` の実画面（現場選択・報告フォーム・写真
添付・送信成功）はすべてLIFF認証の後ろにあり、`NEXT_PUBLIC_LIFF_ID`
未設定のローカル環境では到達できません（実機確認済み）。

- 実際に撮影できた唯一の実画面（LIFF未設定エラー）は
  `../_internal/site-report-liff-config-missing.jpg` に置いており、
  **INTERNAL / NOT-FOR-PUBLICATION** です。
- 公開用スクリーンショットを揃える手順は
  `../../manual-device-capture.md` と
  `../../video/site-report-recording-script.md` の
  「REAL LIFF / REAL E2E RECORDING」を参照してください。

詳細は `../../asset-manifest.md` と `../../screenshot-plan.md` を
参照してください。
