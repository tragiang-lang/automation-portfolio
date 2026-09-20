# Google Sheets 連携設定ガイド

シート自体の作り方（9枚のシート構成、CSVテンプレート、
`setupDemoSheets`の使い方）は
[`../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`](../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md)
にまとめています。まだ読んでいない場合は先にそちらをご覧ください。

このページでは、作成したスプレッドシートをGAS側と接続する手順のみを
説明します。

## スプレッドシートIDの調べ方

Google Sheetsをブラウザで開いた状態のURLは、次のような形式です。

```text
https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
```

`/d/` と `/edit` の間の英数字の文字列が、スプレッドシートIDです。

## スクリプトプロパティへの設定

1. GASプロジェクトのApps Scriptエディタを開きます。
2. 左メニュー「プロジェクトの設定」→「スクリプト プロパティ」を開きます。
3. `SPREADSHEET_ID` という名前で、上記で調べたIDを値として追加します。

詳しくは [`GAS_SETUP_JA.md`](GAS_SETUP_JA.md) の「4. スクリプト
プロパティを設定する」を参照してください。

## 動作確認

1. Apps Scriptエディタの関数選択ドロップダウンから `setupDemoSheets`
   を選び、「実行」をクリックします。
2. 実行が完了したら、対象のGoogle Sheetsを開き、以下の9枚のタブが
   作成されていることを確認します。

```text
CONFIG / HOLIDAYS / SERVICES / STAFF / RESERVATIONS /
CANCELLATION_REQUESTS / INQUIRIES / EMAIL_LOG / ERROR_LOG
```

3. 各タブの1行目（ヘッダー行）が、
   [`../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md`](../03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md)
   に記載の列名と一致しているか確認します。
4. `CONFIG` / `HOLIDAYS` / `SERVICES` / `STAFF` にはデモデータが入って
   おり、`RESERVATIONS` 以下5枚はヘッダーのみで空になっていれば
   正常です。

これで、GASからこのスプレッドシートを読み書きする準備が整いました。
