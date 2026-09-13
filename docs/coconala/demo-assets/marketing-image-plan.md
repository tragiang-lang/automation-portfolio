# マーケティング画像プラン

生成する装飾要素（背景・抽象アクセント・図解の枠線など）はすべて
非機能的な装飾に限定し、実在しない製品画面を「本物の画面」のように
見せる合成は行いません（§19・§21）。

---

## Salon

### 1. Hero画像 — READY（既存素材を流用）

コンセプト:「サロンの予約・お問い合わせを、もっとスムーズに」

実素材: `docs/coconala/demo-assets/screenshots/salon/salon-01-hero.jpg`
（今回実撮影）、または既存の
`product/coconala-salon-template/08_DEMO/02_SCREENSHOTS/desktop/kinari-desktop.jpg`
（既存の実撮影済み素材）。文字はオーバーレイとして追加するのみで、
UI自体は加工しない。

### 2. ワークフロー図解 — ASSET CAN BE GENERATED SEPARATELY

```text
サロンLP
↓
メニュー確認
↓
予約・お問い合わせ
↓
受付
```

実装調査の結果、上記のうち「予約」はGAS未接続だと動作しないため、
図解内では「予約・お問い合わせ」とまとめ、予約単体の完了を断定的に
描かない表現にする（誇張防止）。HTML/SVGで新規作成可能（実UIの合成は
不要な純粋な図解のため、製品画面の捏造にはあたらない）。

### 3. デザイン切替訴求 — READY（既存素材そのまま）

`product/coconala-salon-template/08_DEMO/02_SCREENSHOTS/showcase/6-presets-showcase.png`
をそのまま採用。実際にビルド・起動して撮影された6プリセットの実画面
であることが `product/coconala-salon-template/08_DEMO/README_JA.md`
に明記されている（本タスクで新規検証は行っていないが、既存ドキュメント
の記載を信頼し、二次利用のみ行う）。

---

## Site Report

### 1. Hero画像 — PARTIALLY READY

コンセプト:「LINEから、現場報告をもっと簡単に」

実装調査の結果、現状ローカルで撮影できる実画面は「LIFF未設定エラー」
のみで、これは買い手向けには使えません。したがって:

- 背景・雰囲気を伝える装飾画像（LINEのトークUIを模した抽象イラスト
  ではなく、施工現場を思わせる非機能的な背景素材など）を使い、
  「実際の製品画面」だと誤認させない構成にする。
- 実UIスクリーンショットを使う場合は、REAL LIFF環境で撮影できた後に
  差し替える（ASSET CAN BE GENERATED SEPARATELY — 現時点ではNOT READY）。

### 2. ワークフロー図解 — ASSET CAN BE GENERATED SEPARATELY

```text
LINE
↓
現場選択
↓
報告入力
↓
写真
↓
送信
↓
Google側で記録
```

GAS `Api.ts` の実装（`SUBMIT_REPORT`がGoogle Sheets/Driveに書き込む
こと）は確認済みのため、この図解の内容自体は実装と矛盾しない。ただし
これは「図解」であって「実画面」ではないことをキャプションで明示する。

### 3. Before/After — ASSET CAN BE GENERATED SEPARATELY

```text
BEFORE
電話・個別連絡・手入力

AFTER
LINEから報告
↓
記録を集約
```

「自動的に集計する」「自動的に管理者へ通知する」等、実装が明確に
サポートしていない機能（例: 集計ダッシュボードは存在しない —
`coconala-service-listings.md` 記載の既存の正直な回答を参照）は
描かない。

---

## 共通ルール

- 実UIスクリーンショットと装飾的な図解は明確に区別し、図解には
  「イメージ図」等の注記を入れることを推奨する。
- Site Reportの図解・Hero画像は、REAL LIFF/REAL BACKENDの検証が
  完了するまで「LOCAL DEMO / 図解」であることが分かるようにする。
