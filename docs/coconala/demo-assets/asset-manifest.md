# アセット・マニフェスト（Task 13）

作成日: 2026-09-13。すべて実装調査・実機（ローカル）動作確認に基づく。

Status凡例: `READY` / `READY AFTER MANUAL VERIFICATION` /
`LOCAL DEMO ONLY` / `NEEDS REAL DEPLOYMENT` / `NEEDS REAL DEVICE` /
`NOT READY`

公開区分: `PUBLIC` / `INTERNAL` / `MANUAL-REVIEW` / `NOT-FOR-PUBLICATION`

| Asset | Service | Type | Status | Source | Public? | Manual Verification? |
|---|---|---|---|---|---|---|
| `screenshots/salon/salon-01-hero.jpg` | Salon | Screenshot | READY | 実撮影（ローカル`npm run dev`、2026-09-13） | PUBLIC | 不要 |
| `screenshots/salon/salon-02-service.jpg` | Salon | Screenshot | READY | 実撮影（同上） | PUBLIC | 不要 |
| `screenshots/salon/salon-04-form.jpg` | Salon | Screenshot | READY | 実撮影（同上、デモデータ入力済み） | PUBLIC | 不要 |
| `screenshots/salon/salon-06-mobile.jpg` | Salon | Screenshot | READY | 実撮影（同上、544×717実測） | PUBLIC | 実機（iPhone/Android）での崩れ確認は推奨 |
| `screenshots/_internal/salon-reservation-blocked-server-error.jpg` | Salon | Screenshot | NEEDS REAL DEPLOYMENT | 実撮影（GAS未接続時の実エラー） | NOT-FOR-PUBLICATION | GAS Web App実デプロイ後に再撮影 |
| 予約完了（`/thanks`）画面 | Salon | Screenshot | NOT READY | `apps/salon-portfolio/web/app/thanks/page.tsx` が未実装プレースホルダー | — | 実装完了後に撮影 |
| `product/.../08_DEMO/02_SCREENSHOTS/**`（6プリセット×desktop/mobile、showcase） | Salon | Screenshot（既存） | READY | 既存資産（本タスクでは検証のみ、新規撮影せず） | PUBLIC | 不要 |
| `screenshots/_internal/site-report-liff-config-missing.jpg` | Site Report | Screenshot | LOCAL DEMO ONLY | 実撮影（`NEXT_PUBLIC_LIFF_ID`未設定時の実エラー） | NOT-FOR-PUBLICATION | — |
| 現場選択/報告フォーム/写真添付UI | Site Report | Screenshot | NOT READY | LIFFゲートにより未到達 | — | REAL LIFF REQUIRED（`manual-device-capture.md`） |
| 送信成功/Sheets・Drive結果 | Site Report | Screenshot | NOT READY | 未到達 | — | REAL LIFF + REAL BACKEND E2E REQUIRED |
| `screenshot-plan.md` | 両方 | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | 不要 |
| `video/salon-storyboard.md` | Salon | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | 不要 |
| `video/salon-recording-script.md` | Salon | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | 不要 |
| `video/site-report-storyboard.md` | Site Report | ドキュメント | READY（台本のみ）／素材はNOT READY | 本タスクで新規作成 | INTERNAL | 素材撮影にはREAL LIFF/REAL BACKENDが必要 |
| `video/site-report-recording-script.md` | Site Report | ドキュメント | READY（台本のみ） | 本タスクで新規作成 | INTERNAL | 同上 |
| `video/editing-handoff.md` | 両方 | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | 不要 |
| `marketing-image-plan.md` | 両方 | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | 不要 |
| Salonマーケティンググラフィック（Hero文字入れ、図解） | Salon | 生成予定グラフィック | ASSET CAN BE GENERATED SEPARATELY | 未作成（実UIは既存/実撮影素材あり） | — | 不要 |
| Site Reportマーケティンググラフィック（Hero、図解、Before/After） | Site Report | 生成予定グラフィック | ASSET CAN BE GENERATED SEPARATELY | 未作成 | — | 実UIを使う版はREAL LIFF後 |
| `manual-device-capture.md` | 両方 | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | — |
| `buyer-perspective-review.md` | 両方 | ドキュメント | READY | 本タスクで新規作成 | INTERNAL | — |
| デモ写真（Site Report用、作業現場） | Site Report | 画像素材 | NOT READY | リポジトリ内に既存の適切な素材なし（§8・§28参照） | — | 実施時に用意 |

## 内部由来の未使用スクリーンショット

撮影の過程で生じた以下の中間カットは、最終的な公開素材としては
採用していません（重複、または情報量が少ないため）。削除はせず
`.evidence/`相当の記録として温存する方針とし、このマニフェストにのみ
記載します:

- 予約ページ「読み込んでいます...」中間状態
- お問い合わせフォーム未入力状態
- ホーム画面スクロール中の中間カット2枚
- モバイルリサイズがデスクトップ幅のまま撮影された失敗カット1枚
  （ツールの挙動により、既存タブのリサイズがviewportに反映されな
  かったもの。新規タブで作成し直すことで正しいモバイル幅を取得した
  — `salon-06-mobile.jpg` として採用）

## デモ写真ポリシー（Site Report、§28）

現時点でリポジトリ内に「現場報告」用の適切なデモ写真（実在の作業員・
実在の現場・著作権のある画像を含まないもの）は存在しません。実LIFF
録画を実施する際は、以下のいずれかを用意してください:

- 生成AIによる非実在の建設現場イメージ（内部利用・デモ目的である旨を
  明記）
- フリー素材（商用利用可・著作権表記不要なもの）
- 撮影者自身が用意した、個人を特定できない一般的な現場写真

いずれの場合も、ファイル名は `demo-site-photo-01.jpg` のように内部で
デモ用途と分かる名前にすることを推奨します。
