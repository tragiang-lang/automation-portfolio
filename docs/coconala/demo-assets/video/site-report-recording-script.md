# Site Report 録画スクリプト

## LOCAL RECORDING（現状すぐ実施可能な範囲）

### Environment

- Device/Viewport: モバイル幅（390–412×844–915相当）推奨
- Browser: Chrome
- URL: `http://localhost:4002`
- 必要な環境変数: なし（何も設定しない状態が、むしろ「正直な現状」）
- デプロイ必要: いいえ
- LINE必要: いいえ
- Google連携必要: いいえ

### Preparation

1. `apps/site-report/web` で `npm run dev -- -p 4002` を起動。
2. `.env.local` に `NEXT_PUBLIC_LIFF_ID` を設定しない（設定すると
   `liff.init()` が実際にLINEサーバーへ通信しようとし、無効なIDでは
   別のエラーになるだけで、これも実UIには進めない）。

### Recording steps

1. `http://localhost:4002` を開く。
2. 「読み込んでいます...」→「アプリの初期化に失敗しました。LIFF is not
   configured for this deployment.」が表示されるまで2〜3秒待つ。
3. この画面を2秒静止して撮る。

### After recording

この画像・録画は **INTERNAL / NOT-FOR-PUBLICATION** です。実装が
「設定なしでは動かない」ことを正直に示す内部エビデンスとしてのみ使用し、
買い手向けマーケティング動画には使用しません。

---

## REAL LIFF / REAL E2E RECORDING（実施には以下が必須）

### Environment

- Device: **iPhone（LINEアプリ内ブラウザ）または Android（LINEアプリ内
  ブラウザ）** — デスクトップブラウザのモバイルエミュレーションは
  「LINEの中で動く」ことの証明にはならないため不可。
- URL: 実デプロイ済みのLIFF URL（`https://liff.line.me/<LIFF ID>`）
- 必要な環境変数: `NEXT_PUBLIC_LIFF_ID`（実チャンネルのID）、
  GAS側の `GAS_WEBAPP_URL` 等（`docs/site-report-architecture-overview.md`
  の必須CONFIGキーを参照）
- デプロイ必要: **はい**（Vercel等へのWebアプリデプロイ＋GAS Web App
  デプロイ）
- LINE必要: **はい**（テスト用LINEアカウント、LIFFチャンネル）
- Google連携必要: **はい**（Sheets/Drive、テスト用のCONFIG/SITES行が
  事前に用意されていること）

### Preparation

1. LINE Developersコンソールで、テスト用LIFFチャンネルを作成し、
   実デプロイ済みURLをエンドポイントに設定する。
2. Google Sheetsの `SITES` シートに、架空の現場（例:「渋谷第二現場」）
   を1行以上用意する。
3. テスト用の写真ファイルを1枚、スマートフォンのカメラロールに用意
   する（§8章参照 — 実在の作業員・実在の現場・識別可能な顔を含まない
   もの）。
4. テスト用LINEアカウントで事前にログインしておく（初回ログイン画面も
   別途撮る場合は、ログアウト状態からもう1カット用意する）。

### Recording steps

1. LINEのトークルーム（リッチメニュー等）からLIFF URLを開く。
2. （未ログインの場合）「LINEでログイン」画面を撮る。
3. ログイン後、現場選択画面が表示されるまで待つ。
4. 「渋谷第二現場」をタップする。
5. 作業内容欄に「外壁塗装・足場点検」、コメント欄に「本日の作業は予定
   通り完了しました。特記事項なし。」と入力する。
6. 写真添付欄でテスト用写真を1枚選択し、プレビューが表示されるのを待つ。
7. 送信ボタンをタップする。
8. 成功画面が表示されるまで待つ（3〜5秒程度を見込む）。
9. 別途、PC側でGoogle Sheets（REPORTS/REPORT_PHOTOSシート）とGoogle
   Driveの該当フォルダを開き、今回の送信が反映されていることを確認して
   から撮影する。

### After recording

- 実在の作業員の顔・実名・実在の現場住所が映っていないか確認する。
- LINEアカウントのプロフィール画像・表示名がテスト用の架空のもので
  あることを確認する（実アカウントの個人情報を映さない）。
- Google SheetsやDriveの画面に、他の顧客の実データが同じシートに
  混在していないか確認する（テスト専用のスプレッドシートを使う）。
- 実際に送信が成功したことを、Sheets/Driveの実データで裏付けてから
  「成功画面」を公開素材として使う（見た目だけの成功表示を鵜呑みに
  しない）。

このセクションはブロッカー（§その他のドキュメント参照）が解消される
まで実施できません。現時点のステータスは **NOT READY** です。
