# Site Report デモ動画ストーリーボード

**重要な前提**: 現状、実装済みのUI（現場選択〜報告フォーム〜写真添付〜
送信〜成功）はすべてLIFF認証の後ろにあり、`NEXT_PUBLIC_LIFF_ID` が
無いローカル環境では `LIFF is not configured for this deployment.`
で止まります（実機で確認済み、`screenshots/_internal/site-report-liff-config-missing.jpg`）。

したがって、**このストーリーボードは「実LIFF環境が用意できた場合に
撮影する台本」であり、現時点でこの動画は撮影不能（NOT READY）です。**
フェイクのLINE画面・フェイクの現場選択画面・フェイクの送信成功画面を
作ってこの動画を「撮れたことにする」ことはしません（§11・§34）。

対象尺: 45〜55秒。

| Time | Scene | Action | On-screen text | Source | Status |
|---|---|---|---|---|---|
| 0–4s | フック | 静止画/装飾 | 「現場報告、もっと簡単に。」 | 新規作成（装飾のみ） | ASSET CAN BE GENERATED SEPARATELY |
| 4–9s | LINEから開く | LINEトーク画面からLIFF画面を開く操作 | 「LINEから、そのまま」 | **REAL LIFF REQUIRED** | NOT READY |
| 9–15s | 現場選択 | `SitePicker` で現場をタップ | 「現場を選択」 | **REAL LIFF REQUIRED** | NOT READY |
| 15–23s | 報告入力 | `ReportForm` に作業内容を入力 | 「作業内容を入力」 | **REAL LIFF REQUIRED** | NOT READY |
| 23–30s | 写真添付 | `PhotoUploader` で写真を選択・プレビュー | 「写真を添付」 | **REAL LIFF REQUIRED** | NOT READY |
| 30–36s | 送信 | 送信ボタンをタップ | 「そのまま送信」 | **REAL LIFF REQUIRED** | NOT READY |
| 36–43s | 成功表示 | アプリ側の成功画面 | 「送信完了」 | **REAL BACKEND E2E REQUIRED** | NOT READY |
| 43–50s | 管理側結果 | Google Sheets/Driveに記録が増える様子 | 「Google側で自動的に記録」 | **REAL BACKEND E2E REQUIRED**（実際にGASデプロイ・Sheets/Drive接続済みの環境が必要） | NOT READY |
| 50–55s | クロージング | 静止画＋CTA | 「導入サポートのご相談はこちら」 | 新規作成（装飾のみ） | ASSET CAN BE GENERATED SEPARATELY |

## 動画制作に進む前に必要なもの（ブロッカー）

1. LINE Developersで実LIFFチャンネルを作成し `NEXT_PUBLIC_LIFF_ID` を設定
2. GAS Web Appを実デプロイし、`CONFIG`/`SITES`/`WORKERS`/`REPORTS`/
   `REPORT_PHOTOS` シートとGoogle Driveフォルダを用意
3. デモ用のLINEアカウント（実際の顧客ではない、テスト用アカウント）
4. iPhone/Android実機（LINEアプリ内ブラウザでの動作が前提のため、
   デスクトップブラウザのエミュレーションでは「実際に動く証拠」になら
   ない — `manual-device-capture.md` 参照）

これらが揃うまで、この動画は台本のみ（READY）で、素材撮影は
BLOCKED / NOT READYです。
