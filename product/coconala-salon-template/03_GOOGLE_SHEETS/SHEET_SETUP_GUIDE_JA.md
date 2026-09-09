# Google Sheets テンプレート セットアップガイド

## この章の目的

予約システムはGoogle Sheetsをデータベースとして使用します。この章では、
ご自身のGoogle Sheetsに必要な9枚のシートを、正しい列構成で用意する
方法を説明します。方式A（推奨）と方式B（手動/参考用）のどちらかで
進めてください。

## 方式A（推奨）: setupDemoSheets を実行する

1. Google Driveで新しい空のGoogle Sheetsを作成します（「新規」→
   「Google スプレッドシート」）。作成したスプレッドシートのURL
   （`https://docs.google.com/spreadsheets/d/`の後ろの部分）が
   スプレッドシートIDです。控えておいてください。
2. `../04_SETUP_GUIDE/GAS_SETUP_JA.md` の手順に従ってGoogle Apps
   Scriptプロジェクトを作成し、スクリプトプロパティ`SPREADSHEET_ID`に
   手順1で控えたIDを設定します。
3. Apps Scriptのエディタ画面で、関数選択のドロップダウンから
   `setupDemoSheets` を選び、「実行」をクリックします。
4. これだけで、9枚のシートがヘッダー行＋安全なデモデータ付きで
   自動的に作成されます。

この関数は**既存の同名シートを一切上書きしません**。すでに同じ名前の
シートが存在する場合は、そのシートには触れず「スキップ」として扱われ
ます（`SetupDemoSheets.ts`の実装どおりの安全な動作です）。何度実行
しても、既存データが消えたり上書きされたりする心配はありません。

## 方式B（手動/参考用）: CSVテンプレートをインポートする

Apps Scriptを使わず、シート構成だけを先に確認したい場合や、手動で
1枚ずつ作成したい場合は、`templates/` フォルダ内の9個のCSVファイルを
使用してください。

1. Google Sheets で新しい空のスプレッドシートを開きます。
2. 1枚目のシートを開き、シート名を `CONFIG` に変更します。
3. 「ファイル」→「インポート」→「アップロード」で
   `templates/CONFIG.csv` を選択し、「現在のシートを置換する」を
   選んでインポートします。
4. 同様に、残り8枚のシートをそれぞれ追加し（右下の「＋」）、
   シート名を対応するCSVファイル名と完全に一致させたうえで
   インポートしてください。

シート名は次の9つと**完全に一致**させる必要があります（大文字・
アンダースコアも含め、1文字も違わないように）:

```text
CONFIG
HOLIDAYS
SERVICES
STAFF
RESERVATIONS
CANCELLATION_REQUESTS
INQUIRIES
EMAIL_LOG
ERROR_LOG
```

## 全9シートの構成一覧

| シート名 | 列（左から順に） |
|---|---|
| `CONFIG` | `Key`, `Value`, `Description` |
| `HOLIDAYS` | `Date`, `Label` |
| `SERVICES` | `ServiceID`, `Name`, `DurationMinutes`, `Price`, `Active`, `StaffRequired`, `DisplayOrder`, `Description`（任意）, `Category`（任意） |
| `STAFF` | `StaffID`, `Name`, `Active`, `CalendarID`, `DisplayOrder`, `Role`（任意）, `Bio`（任意）, `ImagePath`（任意） |
| `RESERVATIONS` | `ReservationID`, `SubmissionID`, `CreatedAt`, `UpdatedAt`, `Name`, `Email`, `Phone`, `Date`, `Time`, `ServiceID`, `StaffID`, `Notes`, `Status`, `CalendarEventID`, `EmailStatus`, `CancellationToken` |
| `CANCELLATION_REQUESTS` | `CancellationRequestID`, `ReservationID`, `RequestedAt`, `RequesterName`, `RequesterEmail`, `Reason`, `Status`, `ProcessedAt`, `ProcessedBy`, `Notes` |
| `INQUIRIES` | `InquiryID`, `SubmissionID`, `CreatedAt`, `Name`, `Email`, `Phone`, `Subject`, `Message`, `Source`, `Status` |
| `EMAIL_LOG` | `EmailLogID`, `CreatedAt`, `RelatedType`, `RelatedID`, `RecipientType`, `RecipientEmail`, `Subject`, `Status`, `ErrorMessage` |
| `ERROR_LOG` | `ErrorID`, `CreatedAt`, `Action`, `Message`, `Stack`, `ContextJSON`, `Severity` |

この列名・列順は変更しないでください。プログラム側がこの並び順で
データを読み書きします。

`（任意）`と記載された列（`SERVICES`の`Description`/`Category`、
`STAFF`の`Role`/`Bio`/`ImagePath`）は空欄のまま運用しても動作します。
既存のスプレッドシートをお使いの場合、これらの列を追加しなくても
エラーにはなりません — 追加すればトップページの「メニュー」「スタッフ
紹介」セクションの表示がより詳しくなります。詳細は
`../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md` /
`STAFF_CUSTOMIZATION_JA.md` を参照してください。

## デモデータの扱い方

`CONFIG` / `HOLIDAYS` / `SERVICES` / `STAFF` の4シートには、動作確認用の
安全なサンプル値があらかじめ入っています（店舗名「Demo Salon」、
メニュー「ハンド | ジェルネイル」など、実在しない架空のデータです）。
本番公開前に、必ずご自身の店舗情報に置き換えてください
（`../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`、
`../05_CUSTOMIZATION/MENU_CUSTOMIZATION_JA.md`、
`../05_CUSTOMIZATION/STAFF_CUSTOMIZATION_JA.md` を参照）。

`RESERVATIONS` / `CANCELLATION_REQUESTS` / `INQUIRIES` / `EMAIL_LOG` /
`ERROR_LOG` の5シートはヘッダー行のみで、データは空です。これらは
予約・問い合わせ・メール送信・エラーが発生するたびにシステムが
自動的に書き込む記録用シートのため、あらかじめデータを入れる
必要はありません。

## ご自身専用のコピーを作る重要性

開発者（販売者）が使用している本番のスプレッドシートは、このパッケージ
には含まれておらず、購入者の方が直接利用することもできません。上記の
方式A・方式Bのいずれかで、**必ずご自身のGoogleアカウント上に新しい
スプレッドシートを作成**してください。

## 次のステップ

スプレッドシートIDをApps Script側のスクリプトプロパティ`SPREADSHEET_ID`
に設定する詳しい手順は、`../04_SETUP_GUIDE/SHEETS_SETUP_JA.md` を
参照してください。
