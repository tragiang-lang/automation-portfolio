# トラブルシューティング

よくある症状ごとに、考えられる原因と確認手順をまとめています。ここに
掲載されている内容で解決しない場合は、原因調査を伴う個別サポートは
含まれておりませんので、導入・カスタマイズサービス（別売り）のご利用を
ご検討ください。

## 1. 予約ページにメニューが表示されない

**考えられる原因**
- `SERVICES`シートが空、またはすべての行の`Active`が`false`
- `CONFIG`シートの`features.reservation`が`false`
- `.env.local`の`GAS_WEBAPP_URL`が未設定、または誤っている
- GASのデプロイ設定で「アクセスできるユーザー」が正しく設定されていない

**確認手順**
1. `SERVICES`シートの`Active`列を確認する。
2. `CONFIG`シートの`features.reservation`が`true`になっているか確認する。
3. ブラウザの開発者ツール（F12）の「Network」タブで、`/api/gas`への
   リクエストがエラーになっていないか確認する。
4. GAS_SETUP_JA.mdの手順どおりにデプロイされているか再確認する。

## 2. スタッフが表示されない

**考えられる原因**
- `STAFF`シートが空、またはすべての行の`Active`が`false`
- `CONFIG`シートの`features.staffSelection`が`false`（この場合は
  仕様どおりの動作です。スタッフ一覧は空として扱われ、エラーには
  なりません）

**確認手順**
1. `CONFIG`シートの`features.staffSelection`を確認する。
2. `STAFF`シートの`Active`列を確認する。

## 3. 空き時間が表示されない

**考えられる原因**
- `CONFIG`シートの該当曜日の営業時間が`closed`になっている
- `HOLIDAYS`シートにその日付が登録されている
- カレンダーIDの設定ミス（`STAFF.CalendarID`または`CONFIG.calendar.id`）
- `reservation.minLeadHours`/`reservation.maxBookingDays`の範囲外の
  日時を選択している

**確認手順**
1. `CONFIG`シートの`hours.*`と`HOLIDAYS`シートを確認する。
2. `STAFF`シートの`CalendarID`、`CONFIG`シートの`calendar.id`を
   確認する（`CALENDAR_SETUP_JA.md`参照）。
3. 選択している日付が予約可能期間内か確認する。

## 4. 予約を送信できない

**考えられる原因**
- `.env.local`の`GAS_WEBAPP_URL`の設定ミス
- GASデプロイの権限設定ミス（実行ユーザー/アクセスできるユーザー）
- スクリプトプロパティ`SPREADSHEET_ID`が未設定
- 選択した時間帯が直前に埋まった（この場合は正常な仕様です。案内
  メッセージに従って別の時間を選択してください）

**確認手順**
1. `.env.local`の`GAS_WEBAPP_URL`を確認する。
2. GASのスクリプトプロパティに`SPREADSHEET_ID`が設定されているか
   確認する。
3. Apps Scriptエディタの「実行数」（実行ログ）でエラーが出ていないか
   確認する。

## 5. Google Calendarに予約が作成されない

**考えられる原因**
- `STAFF.CalendarID`または`CONFIG.calendar.id`の設定ミス
- GASの実行アカウントが、そのカレンダーへの編集権限を持っていない

**確認手順**
1. カレンダーIDが正しいか確認する（`CALENDAR_SETUP_JA.md`参照）。
2. カレンダーの共有設定で、GAS実行アカウントに編集権限があるか
   確認する。

**補足**: カレンダーへの登録に失敗した場合でも、予約自体は
`RESERVATIONS`シートに記録されており、「要確認」の状態としてお客様の
予約データそのものは失われません。手動でカレンダーに登録し直すことで
対応できます。

## 6. 予約確認メールが届かない

**考えられる原因**
- `CONFIG`シートの`features.emailNotification`が`false`
- 迷惑メールフォルダに振り分けられている
- GAS実行アカウントのGmail送信に一時的な制限がかかっている

**確認手順**
1. `CONFIG`シートの`features.emailNotification`を確認する。
2. `EMAIL_LOG`シートの該当行の`Status`/`ErrorMessage`列を確認する。
3. Apps Scriptエディタの実行ログを確認する。

## 7. Vercelでうまく動かない

**考えられる原因**
- Vercelプロジェクトの「Root Directory」が
  `01_WEB_TEMPLATE/salon-website`に設定されていない
- 環境変数`GAS_WEBAPP_URL`が未設定
- ビルドエラー

**確認手順**
1. Vercelのビルドログを確認する。
2. Vercelプロジェクト設定の「Environment Variables」を確認する。
3. `VERCEL_DEPLOY_JA.md`の手順を再確認する。
