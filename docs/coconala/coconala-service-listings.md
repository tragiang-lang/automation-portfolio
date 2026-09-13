# Coconala Service Listings

このドキュメントは、リポジトリの実装・ドキュメントを実際に調査した結果に
基づいて作成した、ココナラ出品用の日本語ドラフトです。実装されていない
機能は「できること」に含めていません。断定できない/確認できない事項は
「ご購入前にご確認ください」に明記しています。

調査対象（主な一次情報源）:

- `apps/salon-portfolio/gas/src/Api.ts`（実装されているアクション: `getConfig`
  / `getServices` / `getStaff` / `getAvailability` / `createReservation`）
- `apps/salon-portfolio/web/components/forms/ContactForm.tsx`（お問い合わせ
  フォームは送信をシミュレートするUIのみで、実際の送信先が存在しない）
- `apps/salon-portfolio/web/app/reservation/cancel/page.tsx`（キャンセル画面は
  プレースホルダーで未実装）
- `product/coconala-salon-template/README_JA.md` / `WHAT_YOU_GET_JA.md` /
  `MANIFEST.md`（現行 V1.1.0 パッケージの実態、価格 ¥2,500、対象顧客、
  含まれるもの/含まれないもの）
- `docs/roadmap.md` / `docs/changelog.md`（salon-portfolioのフェーズ進捗）
- `docs/site-report-architecture-overview.md`（Task 1〜12まで、コントラクト・
  制限事項の詳細な監査記録）
- `apps/site-report/START_HERE.md`（§16 セキュリティノート、§17
  顧客所有モデル）
- `apps/site-report/gas/src/Api.ts` / `Config.ts` / `index.ts`（実装アクション:
  `GET_SITES` / `SUBMIT_REPORT`、必須CONFIGキー）

---

## Service 1 — Salon

### Positioning

```text
サービス名　　　美容サロン向け ホームページ＋オンライン予約システム テンプレート
一言でいうと　　ゼロから作らず導入できる、Googleカレンダー連携済みの
                サロン予約サイト テンプレート（コンテンツ販売＋導入代行）
対象顧客　　　　フリーランスのWeb制作者・エンジニア（サロン案件を持つ人）、
                ある程度自分で手を動かせる開業予定/開業直後のサロンオーナー
解決する課題　　サロンの予約サイトを毎回ゼロから設計・実装する手間、
                Googleカレンダー連携・二重予約防止ロジックの実装コスト
最大のメリット　予約受付〜カレンダー登録〜確認メール送信〜二重予約防止まで
                実装済みの完成形を、すぐに使い始められる
差別化ポイント　6種類のデザインプリセット×Hero/メニュー/スタッフ/ギャラリー
                の複数レイアウトで、サロンごとに見た目を変えて使い回せる
                （実際のビルド済みスクリーンショットで確認可能）
```

**重要な前提**: 本製品は現状、非技術者が単独でゼロから導入できる
「完全パッケージ商品」ではありません。ソースコード一式＋日本語ガイド一式を
セルフサービスで提供する「コンテンツ商品」（¥2,500）と、developer側が
Google/Vercel設定〜デプロイまで行う「導入・カスタマイズサービス」（別売り）
の2階建て構成です（`product/coconala-salon-template/README_JA.md` に準拠）。

### Recommended Service Name

**美容サロン向け ホームページ＋オンライン予約システム テンプレート**

### Alternative Names

1. サロン予約サイト すぐ導入テンプレート（Next.js × GAS）
2. ネイル・まつげサロン向け予約サイトキット

### Recommended Title

**【Next.js×GAS】美容サロン向け 予約システム付きホームページ テンプレートをお渡しします**

### Alternative Titles

1. ネイル・まつげサロン向け｜Googleカレンダー連携の予約サイトテンプレート（デザイン6種）
2. サロンの予約サイトをゼロから作らず導入できるテンプレート（Sheets/Calendar/Gmail連携済み）

### Catch Copy

> Googleカレンダー連携・二重予約防止・確認メール自動送信まで実装済み。
> サロンの予約サイトを、ゼロから作らず今すぐ導入できます。

### Full Listing Description

```text
こんなお悩みありませんか？

・サロン案件の予約サイトを、毎回イチから設計・実装するのが大変
・Googleカレンダー連携やメール通知を自前で実装する時間がない
・二重予約を防ぐ排他制御のロジックを自分で設計するのが不安
・テンプレートはあっても、デザインの選択肢が少なく差別化しづらい

このサービスについて

美容サロン（ネイル・まつげサロンなどを想定）向けの、ホームページと
オンライン予約システムがセットになった、完成済みのソースコード
テンプレートです。ご自身で（またはオプションの導入代行サービスで）
セットアップ・カスタマイズ・デプロイしていただくことで、Google
Sheets/Calendar/Gmailと連携した実用的な予約機能をすぐに導入できます。

できること

・お客様がホームページの予約ウィザードから、メニュー・スタッフ（任意）・
　日時を選んでオンライン予約できます
・予約は自動でGoogleカレンダーの空き状況を確認し、確定時にカレンダー
　イベントを作成します
・予約確定時、お客様・オーナー双方に確認メールが自動送信されます
　（Gmail経由）
・二重予約防止のしくみ（LockServiceによる排他制御・予約直前の空き状況
　再チェック）が組み込まれています
・予約データはGoogle Sheetsに記録され、ふだんお使いのスプレッドシート
　感覚で確認できます
・6種類のデザインプリセット（kinari/femme/noir/editorial/natural/modern）
　と、Hero・メニュー・スタッフ・ギャラリーの複数レイアウトから組み合わせて
　見た目を選べます
・ホームページの各セクションは表示/非表示・並び替えが可能です
・スタッフ選択機能・予約受付そのもののON/OFFなど、機能の一部を設定で
　切り替えられます

こんな方におすすめ

・サロン系の制作案件を持つ、または請け負いたいフリーランスWeb制作者・
　エンジニアの方
・Next.js/GitHub/Vercel、Google Apps Scriptにある程度慣れている方
・技術的なサポートを受けられる、開業予定/開業直後のサロンオーナー様

サービス内容

【コンテンツ ¥2,500（基本）】
・Next.js製のホームページ＋予約UIのソースコード一式
・Google Apps Script製の予約バックエンドのソースコード一式
・Google Sheetsテンプレート（CSV 9枚）
・日本語セットアップガイド一式（Web/GAS/Sheets/Calendar/CONFIG/Vercel）
・日本語カスタマイズガイド一式（文言/メニュー/スタッフ/画像/デザイン）
・トラブルシューティングガイド
・利用ライセンス
・デモパック（6デザインプリセットの実画面スクリーンショット）

【導入・カスタマイズサービス（別売りオプション）】
・ヒアリング → Google環境設定 → コンテンツ差し替え → デザイン調整 →
　デプロイ → 動作確認 → 納品、をこちらで代行します

導入・制作の流れ

セルフサービス（コンテンツ ¥2,500）の場合:
準備 → テンプレート取得 → Next.jsセットアップ → Google Sheets作成 →
Google Apps Scriptセットアップ → Google Calendar設定 → Gmail確認 →
CONFIG設定 → ローカル動作確認 → Vercelデプロイ → 予約テスト → 本番利用開始

導入・カスタマイズサービス（別売り）の場合:
ヒアリング → Google環境設定 → コンテンツ差し替え → デザイン調整 →
デプロイ → 動作確認 → 納品

ご購入前にご確認ください

・本製品は「専門知識不要」「誰でも簡単」「完全自動」の商品ではありません。
　Node.js/npmの基本操作、GitHubの基本操作、Vercelでのデプロイ経験、
　Google Apps Scriptのデプロイ経験、Google Sheets/Calendar/Gmailの基本
　操作ができる方を対象としています。
・トップページの「お問い合わせ」フォームは、現状バリデーション・送信中/
　送信完了の表示までは動作しますが、実際にメールやシートへ送信する
　バックエンドはまだ実装されていません（送信ボタンを押すとUI上の
　完了表示になるのみです）。問い合わせを実際に受け取りたい場合は、
　外部フォームサービスとの連携、または追加開発をご相談ください。
・確認メールに記載されるキャンセル用リンクの先（予約キャンセル画面）は、
　現状「後日実装予定」のプレースホルダー画面です。オンラインでの
　予約キャンセル受付は、現時点ではまだご利用いただけません。
・本製品（コンテンツ ¥2,500）には、お客様環境への導入代行・Vercel/GAS/
　Googleアカウントの設定代行・デザイン制作/原稿作成/画像選定・個別
　カスタマイズ・原因調査を伴う個別トラブル対応は含まれません。
・Googleアカウント・Vercelアカウントは、原則としてお客様（実際に運用する
　方）ご自身のアカウントをご利用いただく設計です。

納品後について

・ソースコード・Google Sheetsの両方を自由にカスタマイズいただけます。
　機能を意図的に制限しているものはありません。
・本製品自体の再配布・再販売・公開リポジトリでの公開は禁止です
　（詳細はライセンスファイルをご確認ください）。
・原因調査を伴う個別トラブル対応は、コンテンツ料金には含まれません。
　トラブルシューティングガイドで解決しない場合は、別売りの導入・
　カスタマイズサービスをご案内します。

よくある質問

Q. スマホでも見られますか？
A. はい。レスポンシブ対応のレイアウトで、スマホ・タブレット・PCの
　いずれでも閲覧できます。

Q. 予約フォームの内容（メニューやスタッフ）は変更できますか？
A. はい。Google SheetsのSERVICES/STAFFシートを編集することで、
　メニュー内容やスタッフ情報を変更できます。

Q. 写真やロゴは用意する必要がありますか？
A. はい。実店舗の写真・ロゴなどは含まれておらず、お客様にご用意
　いただく想定です（画像の差し替え方法はガイドに記載しています）。

Q. Googleフォームは必要ですか？
A. いいえ。予約受付はGoogle Sheets/Calendar/Gmailと連携した専用の
　予約ウィザードで行うため、Googleフォームは使用しません。

Q. LINEとの連携はできますか？
A. 現状のテンプレートにはLINE連携機能は実装されていません。
　必要な場合は追加開発としてご相談ください。

Q. お問い合わせフォームからのメール受信はできますか？
A. 現状、フォームのUIは動作しますが実際の送信先（バックエンド）は
　実装されていません。実際に問い合わせを受け取りたい場合は、追加開発
　または外部フォームサービスとの併用をご検討ください。

Q. 予約のキャンセルはお客様自身でできますか？
A. 確認メールにキャンセル用リンクは記載されますが、リンク先の画面は
　現状未実装（準備中の案内が表示されるのみ）です。現時点ではキャンセル
　対応は店舗側で手動対応いただく前提となります。

Q. 公開後の修正はできますか？
A. ソースコードとGoogle Sheetsはお客様（またはご購入者）の管理下に
　なるため、公開後も自由に修正いただけます。

Q. 複数店舗で使い回せますか？
A. 1ライセンスにつき1店舗・1サイトでの利用を想定しています。複数店舗
　への導入をご希望の場合はご相談ください。
```

### Service Contents

| 区分 | 内容 |
|---|---|
| ソースコード | Next.js製ホームページ＋予約UI、Google Apps Script製予約バックエンド一式 |
| データ | Google Sheetsテンプレート（CSV 9枚） |
| ドキュメント | セットアップガイド7点、カスタマイズガイド5点、トラブルシューティングガイド、README/WHAT_YOU_GET |
| デモ | 6デザインプリセットの実画面スクリーンショット（デスクトップ/モバイル） |
| ライセンス | 自社事業での利用・改変は自由、再配布/再販売/公開リポジトリでの公開は禁止 |
| オプション | 導入・カスタマイズ代行サービス（別売り） |

### Recommended Pricing

**推奨開始価格：コンテンツ ¥2,500**

現状 `product/coconala-salon-template/README_JA.md` に実際に設定されている
価格をそのまま踏襲するのが妥当です。理由: 本製品は完成済みソースコード＋
ガイド一式のセルフサービス型コンテンツであり、買い手自身が実装工数を負担
する前提のため、フルスクラッチのシステム開発よりも大幅に低い価格帯が
妥当。

**基本パッケージ（現在提供可能）**

- コンテンツ ¥2,500：ソースコード一式＋ガイド一式＋デモパック（上記
  「Service Contents」参照）。予約・カレンダー連携・メール通知・二重予約
  防止など、実装済み機能はすべてそのまま利用可能。

**オプション（別売り・現在提供可能）**

- 導入・カスタマイズ代行サービス：ヒアリング〜Google環境設定〜コンテンツ
  差し替え〜デザイン調整〜デプロイ〜動作確認〜納品まで一式代行。価格は
  作業範囲（店舗情報の反映のみ〜デザイン大幅カスタマイズまで）により
  変動するため、都度見積りを推奨。

**追加開発として対応可能（現状は未実装・要相談）**

- お問い合わせフォームの実送信対応（`createInquiry` 相当のバックエンド
  実装）
- オンライン予約キャンセル画面の実装（`requestCancellation` 相当）
- LINE連携（通知・予約導線など）
- 独自ドメイン・追加ページ・追加フォーム項目
- Googleカレンダー以外の外部カレンダー連携

### Optional Add-ons

| 区分 | 内容 |
|---|---|
| 現在提供可能 | 導入・カスタマイズ代行サービス、デザインプリセット/レイアウトの組み合わせ変更、コンテンツ（文言・メニュー・スタッフ・画像）差し替え |
| 追加開発として対応可能 | お問い合わせフォームの実送信対応、オンライン予約キャンセル画面、LINE連携、追加ページ、独自ドメイン設定支援 |

### Buyer Requirements

```text
必須
・Googleアカウント（Sheets/Calendar/Gmail/Apps Script用）
・Vercelアカウント、またはそれに準じるホスティング環境
・店舗情報（店舗名、営業時間、休業日、メニュー/料金、スタッフ情報（使う場合））

あるとスムーズ
・ロゴデータ
・実店舗の写真
・独自ドメイン（任意）

こちらで案内可能（ガイドで手順を提供）
・Google Sheets/Calendar/Gmailの初期設定手順
・Google Apps Scriptのデプロイ手順（clasp）
・Vercelへのデプロイ手順
```

※パスワードやアカウントの認証情報自体をお預かりすることはありません。
　セットアップは購入者ご自身の環境で行っていただく設計です。

### Delivery Flow

コンテンツ商品（¥2,500）はデジタル納品のため、購入後すみやかにソース
コード一式・ガイド一式をお渡しします。導入自体にかかる期間は、購入者の
経験値により半日〜数日と幅があります（`product/coconala-listing-draft-ja.md`
の目安を踏襲：Web制作・Google Workspace操作の経験がある方で半日〜1日、
初めてclasp/Apps Scriptを扱う場合は1〜2日程度）。別売りの導入・
カスタマイズサービスを利用する場合の具体的な納期は、依頼内容に応じて
都度ご案内します（一律の納期を保証するものではありません）。

### FAQ

上記「Full Listing Description」内のFAQを参照。

### Internal Claim Audit

| Claim | Evidence | Status |
|---|---|---|
| 予約ウィザードUI（サービス→スタッフ→日時→顧客情報→確認の5ステップ） | `docs/roadmap.md` Phase 6、`apps/salon-portfolio/web/components/reservation/` | Verified |
| `getConfig`/`getServices`/`getStaff`/`getAvailability`/`createReservation` の5アクションが実装済み | `apps/salon-portfolio/gas/src/Api.ts` の `handleApiRequest` dispatcher | Verified |
| Googleカレンダーとの空き状況確認・イベント作成 | `apps/salon-portfolio/gas/src/Calendar.ts`、`Api.ts` の `runReservationCriticalSection` | Verified |
| Gmailによる予約確認メール送信（顧客・オーナー双方） | `apps/salon-portfolio/gas/src/Mail.ts`、`ReservationEmailTemplates.ts`、`Api.ts` の `sendReservationEmailsForOutcome` | Verified |
| 二重予約防止（LockService）・直前再チェック | `apps/salon-portfolio/gas/src/Api.ts` の `CRITICAL_SECTION_LOCK_TIMEOUT_MS`/`runReservationCriticalSection` | Verified |
| 送信の冪等性（同一submissionIdの二重登録防止） | `apps/salon-portfolio/gas/src/Idempotency.ts`、`Api.ts` の `claimSubmissionOrGetExisting` | Verified |
| 6種類のデザインプリセット・Hero/メニュー/スタッフ/ギャラリーのレイアウトバリエーション | `apps/salon-portfolio/web/config/design-presets.ts`、`product/coconala-salon-template/WHAT_YOU_GET_JA.md`、`08_DEMO/02_SCREENSHOTS/` の実画面 | Verified |
| セクション表示/非表示・並び替え | `product/coconala-salon-template/MANIFEST.md`（ホームページ11セクション） | Documented（コードの直接確認は概要レベルに留まる） |
| お問い合わせフォームは実送信できる | `apps/salon-portfolio/web/components/forms/ContactForm.tsx`（`window.setTimeout` で完了状態を演出するのみ、送信APIなし） | **Remove — 実送信は未実装。リスティングでは明示的に「未実装」と案内** |
| オンライン予約キャンセルができる | `apps/salon-portfolio/web/app/reservation/cancel/page.tsx`（`PagePlaceholder`、"not implemented yet"） | **Remove — 未実装。リスティングでは明示的に「未実装」と案内** |
| LINE連携機能がある | salon-portfolio配下を検索したが、LINEメッセージング/LIFF関連の実装は見つからず | Not available（未実装。FAQで正直に回答） |
| 価格 ¥2,500 | `product/coconala-salon-template/README_JA.md` 冒頭 | Verified（実際に設定されている価格） |
| 1ライセンス1店舗、再配布/再販売禁止 | `product/coconala-salon-template/07_LICENSE/LICENSE_JA.txt`、`README_JA.md` §8 | Verified |

---

## Service 2 — Site Report

### Positioning

```text
サービス名　　　LINEで送れる現場報告システム 導入サービス
一言でいうと　　現場スタッフが普段使うLINEから、作業報告・写真をGoogle
                Sheets/Driveへ自動記録できる仕組みを導入します
対象顧客　　　　現場スタッフを抱える建設業・工事会社・リフォーム会社・
                設備工事会社など、複数現場を管理する中小事業者
解決する課題　　現場からの日報・作業報告が電話や個人LINEトーク、紙で
                属人化し、記録として残らない/後から確認しづらい
最大のメリット　現場スタッフはLINEを開いて現場を選び、作業内容と写真を
                送るだけ。管理者はGoogle Sheets/Driveを開くだけで記録を
                確認でき、送信のたびにメール通知も届く
差別化ポイント　ゼロからLIFF開発するより、既に一通り動作確認済みの技術
                基盤（LIFFログイン〜写真圧縮〜Sheets/Drive記録〜メール
                通知）をベースに導入するため、開発期間とリスクを抑えられる
```

**重要な前提**: 本サービスは、汎用の完成品SaaSやアプリストア配布アプリの
販売ではありません。現状リポジトリに実装されている「MVP（最小限の動作
検証済み機能一式）」を技術基盤として、お客様専用の環境（お客様ご自身の
Google/LINE Developersアカウント）に導入するサービスです
（`apps/site-report/START_HERE.md` §17 の顧客所有モデルに準拠）。

### Recommended Service Name

**LINEで送れる現場報告システムを導入します**

### Alternative Names

1. 現場報告LINEアプリ 導入サポート（写真添付・Sheets自動記録）
2. LIFFで作る現場日報アプリ 導入サービス

### Recommended Title

**LINEから現場報告を送れる仕組みを導入します｜写真添付・Googleスプレッドシート自動記録**

### Alternative Titles

1. 【建設・工事業向け】LINEで現場日報を送れるLIFFアプリを導入します
2. 現場スタッフのLINEから作業報告→Google Sheets/Driveへ自動記録する仕組みを作ります

### Catch Copy

> 現場スタッフは普段使っているLINEを開くだけ。作業内容と写真を送ると、
> Google Sheetsへの記録と担当者へのメール通知まで自動化します。

### Full Listing Description

```text
こんなお悩みありませんか？

・現場からの報告が電話や個人LINEのトークで届き、記録として残らない
・現場ごとの作業内容や写真を、あとから一覧で確認しづらい
・現場スタッフに新しいアプリを覚えてもらうのが難しい
・現場報告の仕組みを開発したいが、LINE/LIFFの開発経験がなく着手できない

このサービスについて

現場スタッフが普段使っているLINEアプリから、専用画面（LIFF）を開いて
現場報告を送信できる仕組みを導入します。送信された報告は、Google
スプレッドシートに自動記録され、写真はGoogleドライブに保存、担当者
（管理者）宛にメールで通知されます。既製のSaaSではなく、実際に動作
検証済みの技術基盤をお客様専用の環境に導入するサービスです。

できること（現場スタッフ側）

・LINEアプリ内から専用画面（LIFF）を開き、LINEアカウントでログインします
・登録済みの現場一覧から、報告したい現場を選択します
・作業者名・作業内容・作業日・コメントを入力します（作業者名はLINEの
　表示名が初期値として自動入力され、編集も可能です）
・写真を複数枚選択して添付できます（選択した写真は自動的に圧縮され、
　その場でプレビュー・削除ができます）
・「送信」を押すと報告が送信され、成功時は受付番号が表示されます。
　送信中の二重クリックは防止されますが、通信エラー時は再試行できます
・送信成功後は「別のレポートを作成」ボタンで、同じ現場に続けて次の
　報告を作成できます

管理者側で受け取れるもの

・現場ごとの報告が、Googleスプレッドシートの行として自動的に記録されます
　（作業者名・作業内容・作業日・コメント・写真枚数など）
・添付された写真は、指定したGoogleドライブのフォルダに、報告ごとに
　まとめて保存されます
・報告が正常に記録されると、指定した管理者用メールアドレスに通知メールが
　届きます（LINEへの通知ではなく、メールでの通知です）
・専用の管理画面・ダッシュボードはありません。記録の確認は、Google
　スプレッドシートとGoogleドライブを直接開いて行います

こんな方におすすめ

・現場スタッフを抱え、複数現場を管理している建設業・工事会社・
　リフォーム会社・設備工事会社の方
・現場報告を「電話」「個人LINEのトーク」「紙」で行っており、記録が
　残る仕組みに切り替えたい方
・Googleスプレッドシート・Googleドライブを日常的に使っている（または
　使い始められる）方

サービス内容

・ヒアリング（現場数、通知先メールアドレス、現場一覧の内容などの確認）
・LINE Developers（LIFFチャンネル）設定のサポート
・Google Sheets/Driveの初期設定サポート
・GASバックエンドのデプロイ
・Next.jsフロントエンド（LIFFアプリ）のデプロイ
・現場一覧（SITESシート）の初期データ登録サポート
・動作確認・引き渡し

導入・制作の流れ

ヒアリング
　↓
LINE Developers・Googleアカウントのご準備（お客様ご自身）
　↓
Google Sheets/Driveの初期設定
　↓
GASバックエンドのデプロイ
　↓
Webアプリ（LIFF）のデプロイ・LIFFチャンネルへの連携設定
　↓
現場一覧データの登録
　↓
テスト送信・動作確認
　↓
引き渡し

ご購入前にご確認ください（現状のMVPとしての制約）

・現状は「なりすまし対策」が実装されていません。送信されたLINEユーザー
　IDは、サーバー側で本人確認（LIFFのIDトークン検証）を行わず、クライア
　ントから送られた値をそのまま信用する設計です。デプロイURLが分かれば、
　技術的には任意のLINEユーザーIDを名乗って送信することが可能な状態です。
　社内の限られたメンバーだけがURLを知っている運用を前提としており、
　より強固な本人確認が必要な場合は追加開発でのご相談となります。
・二重送信防止は、同じ画面でのボタン連打を防ぐ範囲のみです。複数の
　ブラウザタブや、通信タイムアウト後の再送信までは防げません（同じ
　内容の報告が2件登録される可能性があります）。
・写真の枚数・サイズについて、サーバー側（GAS）には上限のチェックが
　ありません。アプリ側で「1枚あたり15MBまで」「JPEG/PNG/WebP推奨」
　という目安の制御はありますが、これは利便性のための目安であり、
　厳密な制限機能ではありません。
・管理者への通知は「メール」のみです。LINEへの通知（LINE公式アカウント
　からのメッセージなど）は現状実装されていません。
・オフライン時の下書き保存や再送信キュー、送信履歴の一覧画面、分析・
　集計機能はありません。記録の確認はGoogle SheetsとGoogleドライブを
　直接開く運用になります。
・iPhone/Androidそれぞれの実機・LINEアプリ内ブラウザでの動作確認は、
　導入時にあらためて実施することを前提としています（保証された動作
　環境として決め打ちにはしていません）。

納品後について

・Googleアカウント、LINE Developersアカウント、Googleスプレッドシート、
　Googleドライブは、原則としてお客様ご自身のアカウント・環境をご利用
　いただきます。開発者個人のアカウントに依存し続ける設計ではありません。
・ソースコードと設定手順書一式をお渡しするため、納品後の運用・現場
　追加（SITESシートへの行追加）はお客様側でも行えます。
・継続的な保守・監視・不具合対応が必要な場合は、別途ご相談ください。

よくある質問

Q. LINEから利用できますか？
A. はい。LINEアプリ内でLIFFという仕組みを使い、専用画面を開いて
　利用します。

Q. iPhone / Androidの両方で使えますか？
A. どちらの端末でも動作する設計ですが、実機・LINEアプリ内ブラウザでの
　最終確認は導入時にあらためて実施します。特定の機種・OSバージョンでの
　動作を無条件に保証するものではありません。

Q. 写真を添付できますか？
A. はい。複数枚の写真を選択して添付できます。選択した写真は自動的に
　圧縮され、送信前にプレビュー・削除ができます。

Q. Googleスプレッドシートに記録できますか？
A. はい。報告内容はスプレッドシートに自動で記録され、写真はGoogle
　ドライブに保存されます。

Q. 現場ごとに管理できますか？
A. はい。あらかじめ登録した現場一覧（SITESシート）から、報告のたびに
　現場を選択する形になります。

Q. LINE Developersの設定は必要ですか？
A. はい、必須です。LIFFアプリを動かすために、LINE Developersの
　アカウントとLIFFチャンネルの作成が必要です。設定手順はこちらで
　ご案内します。

Q. Googleアカウントは必要ですか？
A. はい、必須です。Google Sheets/Drive/Apps Scriptを利用するため、
　お客様ご自身のGoogleアカウントが必要です。

Q. なりすまし対策はありますか？
A. 正直にお答えすると、現状のMVPにはサーバー側での本人確認（LIFFの
　IDトークン検証）は実装されていません。限られたメンバーだけが使う
　運用を前提としており、より強固な本人確認が必要な場合は追加開発として
　ご相談ください。

Q. 管理画面やダッシュボードはありますか？
A. 現状はありません。記録の確認はGoogleスプレッドシートとGoogle
　ドライブを直接開いて行っていただきます。
```

### Service Contents

| 区分 | 内容 |
|---|---|
| フロントエンド | Next.js製のLIFFアプリ（LINEログイン→現場選択→報告フォーム→写真添付→送信） |
| バックエンド | Google Apps Script製API（`GET_SITES`/`SUBMIT_REPORT`） |
| データ | Google Sheets（CONFIG/SITES/WORKERS/REPORTS/REPORT_PHOTOS）、Googleドライブへの写真保存 |
| 通知 | 管理者宛のメール通知（Gmail経由） |
| ドキュメント | セットアップ・運用ハンドブック（`START_HERE.md`）、アーキテクチャ概要 |
| 導入作業 | ヒアリング〜Google/LINE環境設定〜デプロイ〜データ登録〜動作確認〜引き渡し |

### Recommended Pricing

**推奨開始価格：¥50,000〜（導入サービスとして）**

現状リポジトリには本サービス専用の価格設定ファイルは存在しないため、
以下は本ドキュメント作成にあたっての提案であり、リポジトリの既存価格を
そのまま引用したものではありません。理由: salon-portfolioの「コンテンツ
販売」とは異なり、本サービスは (1) LINE Developers/LIFFチャンネルの
設定支援、(2) Google Sheets/Driveの初期設定、(3) GAS・Webアプリ両方の
デプロイ、(4) 現場データ登録・動作確認までを実際に代行する「導入作業」
そのものであるため、コンテンツのみを渡すセルフサービス型より工数が
大きくなります。

**基本パッケージ（現在提供可能）**

- 現状実装済みのMVP一式（LIFFログイン→現場選択→報告入力→写真添付・
  圧縮→送信→Sheets/Drive記録→メール通知）を、お客様の環境に導入
- 現場一覧（1事業者分）の初期データ登録
- 動作確認・引き渡し

**オプション（追加開発として対応可能・要相談）**

- サーバー側でのLINE本人確認強化（LIFF IDトークン検証の実装）
- 複数の管理者へのメール通知、または通知内容のカスタマイズ
- 現場マスタ・作業員（Worker）管理機能の拡張
- 管理用の一覧・検索画面の追加
- 導入後の保守・監視契約

### Optional Add-ons

| 区分 | 内容 |
|---|---|
| 現在提供可能 | 現状実装済みのMVP一式の導入、現場一覧の初期登録、Google/LINE環境設定サポート |
| 追加開発として対応可能 | サーバー側LINE本人確認の強化、通知内容のカスタマイズ、管理用の一覧・検索画面、作業員管理機能、保守・監視契約 |

### Buyer Requirements

```text
必須
・Googleアカウント（Sheets/Drive/Apps Script用、お客様ご自身の名義）
・LINE Developersアカウント（LIFFチャンネル作成用、個人アカウントでも
  作成可能）
・現場（サイト）一覧の情報（現場名、現場コードなど）
・通知を受け取る管理者用メールアドレス

あるとスムーズ
・既存の現場コード・現場名の一覧（Excel/スプレッドシート等）
・作業内容の分類イメージ（自由入力か、ある程度定型化したいか）

こちらで案内可能
・LINE Developers/LIFFチャンネルの作成手順
・Google Sheets/Driveの初期設定手順
・GASのデプロイ手順
```

※LINEチャンネルシークレットやGoogleの認証情報そのものをお預かりする
　ことはありません。設定作業はお客様のアカウント内で、画面共有等で
　ご案内しながら進めます。

### Delivery Flow

導入作業（ヒアリング〜環境設定〜デプロイ〜データ登録〜動作確認〜引き渡し）
のため、コンテンツ商品のような即時デジタル納品ではありません。具体的な
納期は、現場数・ヒアリング内容・お客様側の環境準備の進み具合によって
変動するため、purchase前の見積り時に個別にご案内します（一律の納期を
保証するものではありません）。LINE Developers/LIFFの審査や承認について、
本サービスは設定作業の支援を行いますが、LINE側の審査・承認自体を
保証するものではありません。

### FAQ

上記「Full Listing Description」内のFAQを参照。

### Internal Claim Audit

| Claim | Evidence | Status |
|---|---|---|
| LINEアプリ内のLIFF画面からログインできる | `apps/site-report/web/lib/liff.ts`、`docs/site-report-architecture-overview.md`「LIFF初期化+LINEプロフィール基盤（Task 6）」 | Verified |
| 現場一覧から現場を選択できる（GET_SITES） | `apps/site-report/gas/src/Api.ts` の `getSitesAction`、`components/site-report/SiteReportScreen.tsx` | Verified |
| 作業者名・作業内容・作業日・コメントを入力できる | `docs/site-report-architecture-overview.md`「報告フォーム&ドラフト検証（Task 9）」、`components/site-report/reportDraft.ts` | Verified |
| 写真を複数添付・自動圧縮・プレビュー・削除できる | `docs/site-report-architecture-overview.md`「写真パイプライン（Task 10）」、`photoValidation.ts`/`photoCompression.ts`/`photoPipeline.ts` | Verified |
| 送信するとGoogle SheetsとDriveに記録される（SUBMIT_REPORT） | `apps/site-report/gas/src/Api.ts`（想定）、`docs/site-report-architecture-overview.md`「SUBMIT_REPORT（Task 5）」 | Verified |
| 管理者へメール通知が届く | `docs/site-report-architecture-overview.md`「Notification（AdminNotification.ts + Mail.ts）」 | Verified（メールのみ。LINEへの通知ではない点は明記） |
| 送信成功後「受付番号」と「別のレポートを作成」ボタンが表示される | `docs/site-report-architecture-overview.md`「MVP検証&本番向け強化（Task 12）Fix 1」 | Verified |
| サーバー側でLINEユーザーIDのなりすまし対策がある | `apps/site-report/START_HERE.md` §16、`docs/site-report-architecture-overview.md`「Deferred / known limitations」 | **Not available — 明示的に未実装。リスティング・FAQで正直に開示** |
| 二重送信を完全に防止できる | `docs/site-report-architecture-overview.md`「Deferred / known limitations」 | Not available（クライアント側のボタン連打防止のみ。複数タブ・タイムアウト後再送は防げない） |
| 写真の枚数・サイズ制限がある | `docs/site-report-architecture-overview.md`「写真パイプライン（Task 10）」（GAS側は無制限、アプリ側の15MB/枚はUX上のガイドに過ぎない） | Documented（サーバー側の厳密な制限としては存在しない） |
| 管理ダッシュボード・分析機能がある | リポジトリ全体を検索したが該当実装なし | Not available（リスティングに含めない） |
| Googleアカウント・LINE Developersアカウントは顧客所有が前提 | `apps/site-report/START_HERE.md` §17「Customer / Coconala deployment」 | Verified |

---

## Cross-Service Strategy

### Target Customer Difference

```text
Salon:
　Web制作を行うフリーランス・エンジニア（実質のB2B）、または技術支援を
　受けられるサロンオーナー。買い手は「自分（または依頼先）で手を動かす」
　ことを前提にしたコンテンツ商品の購入者。

Site Report:
　現場スタッフを抱える建設・工事系の中小事業者オーナー・管理者。買い手は
　「導入自体を任せたい」非技術者寄りの事業者であることが多い。
```

### Positioning Difference

```text
Salon:
　店舗向け・顧客対応（集客・予約受付）のWeb/予約システム。
　「お客様が使う」画面が主役。

Site Report:
　社内業務向け（現場報告・記録）のLINE/GAS自動化。
　「自社スタッフが使う」画面が主役。
```

両サービスは、対象とする画面の利用者（お客様 vs 自社スタッフ）も、
解決する業務領域（集客・予約 vs 社内オペレーション）もはっきり異なるため、
「同じようなシステム開発を2パターン売っている」という印象にはならない。

### Recommended Coconala Category Direction

- Salon → 「ホームページ制作」「予約システム構築」カテゴリを主軸に、
  副次的に「ネイル・エステ・美容室向け」のようなサロン系タグを付与。
- Site Report → 「業務システム・自動化」「LINE公式アカウント/LIFF開発」
  カテゴリを主軸に、「建設・工事業向け」のような業種タグを付与。

### Which Should Be Listed First

**Salon を先に出品することを推奨。**

- 実際の完成デモ（6プリセット×デスクトップ/モバイルのスクリーンショット）
  が既に `product/coconala-salon-template/08_DEMO/` に存在し、購入前に
  見た目を確認してもらいやすい。
- 「サロンの予約サイト」という商材は、初めてココナラを利用する買い手にも
  直感的に理解されやすい。
- 価格（¥2,500）も既に確定しており、出品の即時性が高い。

Site Report は、LIFF/LINE Developersという買い手にとって馴染みの薄い
概念の説明が必要になるため、Salonよりも詳しい説明・事前のヒアリングが
必要になりやすい。

### Cross-selling Opportunities

- Salonのコンテンツ購入者（Web制作者）が、建設・工事系の別クライアントを
  持っている場合、Site Reportの導入サービスを紹介できる可能性がある
  （ただし両者は技術基盤を共有していないため、"シリーズ商品"としてでは
  なく、あくまで別サービスとして案内するのが正確）。
- Site Report導入後、同じ事業者が別拠点向けに「顧客向け予約サイト」を
  必要とする場合はSalon側の導入サービスを案内できる。

### What Should NOT Be Combined

- 両サービスを「同一システムの2パターン」であるかのようにまとめて
  販売しない。実際に `apps/salon-portfolio` と `apps/site-report` は
  完全に独立したリポジトリ構成（別々の `package.json`/`gas`プロジェクト）
  であり、共有パッケージも存在しない
  （`docs/site-report-architecture-overview.md`「Why there is no shared
  `packages/` yet」参照）。
- セット割引などで「両方導入すればお得」という訴求は避ける。対象顧客・
  課題が異なるため、無理に組み合わせると片方の買い手にとって不要な
  提案に見える。
- タイトル・キャッチコピーに両方のキーワード（「サロン」と「現場報告」）
  を混在させない。検索性・訴求の明確さを損なう。
