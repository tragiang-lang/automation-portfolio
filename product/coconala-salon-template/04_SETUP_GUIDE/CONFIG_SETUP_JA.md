# CONFIG（店舗設定）ガイド

## CONFIGシートの開き方

Google Sheetsで、`03_GOOGLE_SHEETS/SHEET_SETUP_GUIDE_JA.md` の手順で
作成したスプレッドシートを開き、`CONFIG` タブを選択します。1行につき
1つの設定項目が、`Key`（項目名）・`Value`（値）・`Description`（説明）
の3列で並んでいます。

## 変更してよい項目

| Key | 説明 | 例 |
|---|---|---|
| `business.name` | 店舗名 | `凛` |
| `business.phone` | 電話番号 | `03-1234-5678` |
| `business.email` | 店舗メール | `info@example.com` |
| `business.address` | 住所 | `東京都中央区銀座1-2-3` |
| `hours.monday` | 月曜営業時間 | `10:00-19:00` または `closed` |
| `hours.tuesday` | 火曜営業時間 | 同上 |
| `hours.wednesday` | 水曜営業時間 | 同上 |
| `hours.thursday` | 木曜営業時間 | 同上 |
| `hours.friday` | 金曜営業時間 | 同上 |
| `hours.saturday` | 土曜営業時間 | 同上 |
| `hours.sunday` | 日曜営業時間 | 同上 |
| `features.contactForm` | 問い合わせフォームの有効/無効 | `true` / `false` |
| `features.reservation` | 予約受付の有効/無効 | `true` / `false` |
| `features.staffSelection` | スタッフ指名機能の有効/無効 | `true` / `false` |
| `features.calendar` | カレンダー連携の有効/無効 | `true` / `false` |
| `features.emailNotification` | メール通知の有効/無効 | `true` / `false` |
| `staff.anyAvailableOption` | 「指名なし（お任せ）」選択肢の表示 | `true` / `false` |

`true`/`false`は半角英字（大文字・小文字どちらでも可）で入力するか、
Google Sheetsのチェックボックス機能（TRUE/FALSE）を使っても構いません。

## 任意項目（トップページの表示を充実させたい場合）

以下はすべて任意です。空欄のままでもエラーにはならず、これまでどおり
デモの内容がトップページに表示されます。入力すると、その内容がご自身
の店舗の内容としてトップページに反映されます。

| Key | 説明 | 例 |
|---|---|---|
| `business.nameLatin` | 店舗名（ローマ字表記） | `Rin Nail & Eyelash` |
| `business.tagline` | キャッチコピー（トップページの見出し） | `静けさの中で、指先とまなざしを整える。` |
| `business.postalCode` | 郵便番号 | `〒104-0061` |
| `social.instagram` | InstagramのURL | `https://instagram.com/example` |
| `social.line` | LINEのURL | `https://line.me/example` |
| `social.x` | X（旧Twitter）のURL | `https://x.com/example` |
| `social.facebook` | FacebookのURL | `https://facebook.com/example` |

## 慎重に変更する項目

以下は予約の受付ロジックに直接影響するため、変更後は必ず
`START_HERE_JA.md` STEP 11の手順でテスト予約を行い、意図どおりに
動作するか確認してください。

| Key | 説明 | 例 |
|---|---|---|
| `reservation.slotMinutes` | 予約枠の単位（分） | `30` |
| `reservation.minLeadHours` | 予約締切（何時間前まで受付可能か） | `1` |
| `reservation.maxBookingDays` | 何日先まで予約可能か | `60` |

## 変更しない項目

| Key | 理由 |
|---|---|
| `reservation.timezone` | `Asia/Tokyo` 固定です。他の値を入れるとCONFIGの検証エラーになります。 |
| `calendar.id` | カレンダー連携のフォールバック用IDです。設定方法は `CALENDAR_SETUP_JA.md` を参照してください。この値はホームページの公開API（`getConfig`）には一切含まれません。 |
| `email.ownerNotifyAddress` | 店舗宛の予約通知メールの送信先です。この値も公開APIには含まれません。 |
| `email.fromName` | 送信メールの表示名です。この値も公開APIには含まれません。 |

## HOLIDAYSシートについて

休業日は`CONFIG`シートのキーではなく、別の`HOLIDAYS`シート（`Date`列・
`Label`列）で管理します。休業日を追加・削除したい場合は、`HOLIDAYS`
シートを直接編集してください。

## 変更の反映タイミング

`CONFIG`シートを保存すると、次回のページ表示・API呼び出しから
そのまま反映されます。再デプロイやビルドのやり直しは不要です。
