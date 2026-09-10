# デザイン カスタマイズガイド

対象フォルダ: `01_WEB_TEMPLATE/salon-website/`

## 1. このガイドについて

本テンプレートは、HTML/CSSを直接書き換える「テーマファイル」ではなく、
Next.js（React）のソースコードで構成された技術者向けテンプレートです。
Node.js / npm、Git、TypeScript / Reactの基礎、Google Apps Script・Google
Sheets・Vercelの基本操作について、一定の知識があることを前提としています。
「コードを一切書かずに使える」製品ではない点をご了承ください。

一方で、見た目（デザイン）に関する設定は「プレゼンテーション設定」という
形でコンポーネントから分離されており、**多くのデザイン変更はReactの
コンポーネント（`components/`配下の`.tsx`ファイル）を直接改造しなくても、
設定ファイルの値を変えるだけで行えます**。

```text
推奨:
  config/design-presets.ts・app/globals.css などの「設定値」を変更する

非推奨:
  components/sections/*.tsx などのコンポーネントを直接改造する
```

予約・カレンダー連携などの業務ロジック（`lib/api/`, GAS側のコード）は、
通常のデザインカスタマイズでは一切触る必要がありません。

このガイドは、`SALON_DESIGN_PRESET`によるプリセット選択から、個別の
レイアウト変更、配色・フォント、セクションの表示/非表示・並び順まで、
現在のバージョン（V1.1）のデザインカスタマイズ機能を実装に沿って説明する
ものです。

## 2. カスタマイズの全体像

「何を変えたいか」から、変更先を早見表で確認できます。

| 変更したい内容 | 主な変更先 | 詳細 |
|---|---|---|
| サイト全体の雰囲気を丸ごと変える | `SALON_DESIGN_PRESET`（環境変数） | [§3](#3-デザインプリセット) |
| 特定のプリセットだけ、Hero/メニュー/スタッフ/ギャラリーの型を個別に変える | `config/design-presets.ts` | [§4](#4-個別レイアウト設定) |
| セクションの表示/非表示 | `config/design-presets.ts`（`sectionVisibility`） | [§7](#7-セクション表示) |
| セクションの並び順 | `config/design-presets.ts`（`sectionOrder`） | [§8](#8-セクション順序) |
| アクセントカラー・背景色などの配色 | `app/globals.css` | [§5](#5-配色) |
| 見出し・本文のフォント | `config/typography-tokens.ts` / `app/globals.css` | [§6](#6-タイポグラフィ) |
| 店舗名・キャッチコピー・営業時間・連絡先 | Google Sheets `CONFIG`シート | [`../04_SETUP_GUIDE/CONFIG_SETUP_JA.md`](../04_SETUP_GUIDE/CONFIG_SETUP_JA.md) |
| メニュー（施術内容・価格・所要時間） | Google Sheets `SERVICES`シート | [`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md) |
| スタッフ（名前・役職・紹介文） | Google Sheets `STAFF`シート | [`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md) |
| 画像（Hero・ギャラリー・スタッフ写真） | `public/images/` フォルダ | [`IMAGE_CUSTOMIZATION_JA.md`](IMAGE_CUSTOMIZATION_JA.md) |

**業務データ（店舗名・価格・スタッフ名など）を、デザイン設定ファイルに
直接書き込まないでください。** 表示が二重管理になり、Google Sheets側を
更新しても反映されなくなります。逆に、配色やレイアウトの型を変えたい
だけのときに`SERVICES`/`STAFF`シートを触っても、見た目は変わりません。
デザインと業務データの違いは[§9](#9-デザインと業務データの違い)で
詳しく説明します。

## 3. デザインプリセット

サイト全体の見た目は、`SALON_DESIGN_PRESET`（サーバー側専用の環境変数）
で以下の6種類から選択できます。それぞれ、配色・フォントだけでなく、
Hero・メニュー・スタッフ・ギャラリーのレイアウトとセクションの並び順
までを含む、あらかじめ組み合わせ済みの「完成したデザインの方向性」です
（`config/design-presets.ts`の`DESIGN_PRESETS`）。

| プリセット | 方向性 |
|---|---|
| `kinari`（凛） | 和・自然・落ち着いた雰囲気（初期設定） |
| `femme`（フェム） | やわらかく女性らしい美容サロン向け |
| `noir`（ノワール） | 高級感・モード・ダーク系 |
| `editorial`（エディトリアル） | 雑誌・ファッション・デザイン性重視 |
| `natural`（ナチュラル） | 自然・オーガニック・癒し系 |
| `modern`（モダン） | シンプル・現代的・都会的 |

### 3.1 設定方法

`.env.local`（ローカル開発）または Vercel の Environment Variables（本番）
に、`GAS_WEBAPP_URL`と同様の要領で1行追加します
（[`../04_SETUP_GUIDE/WEB_SETUP_JA.md`](../04_SETUP_GUIDE/WEB_SETUP_JA.md)、
[`../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`](../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md)
参照）。

```text
SALON_DESIGN_PRESET=noir
```

未設定の場合、または上記6種類にない値を指定した場合は、自動的に
`kinari`（初期設定の見た目）にフォールバックします（不正な値でサイトが
壊れたり真っ白になったりすることはありません）。

**この設定はビルド時に確定します。** ページはサーバーコンポーネントとして
`SALON_DESIGN_PRESET`を読み込むため、値を変更したら以下の対応が必要です。

- ローカル開発（`npm run dev`）: 開発サーバーを一度停止し、再起動する。
- 本番（Vercel）: Environment Variablesを保存後、Vercel上で再デプロイ
  する（値の保存だけでは既存のビルドには反映されません）。

「設定画面でプリセットを切り替えたら即座に本番サイトの見た目が変わる」
ような、ライブのダッシュボード機能ではない点にご注意ください。

プリセットはあくまで「見た目」の設定です。店舗名・メニュー・価格・
スタッフ・予約の動作は一切変更されません — それらは
[§9](#9-デザインと業務データの違い)の通り、Google Sheetsの各シート
（`CONFIG`/`SERVICES`/`STAFF`など）で管理してください。

### 3.2 プリセット構成表

各プリセットが実際にどのレイアウトの型を組み合わせているかの一覧です
（`config/design-presets.ts`より）。各項目の意味は[§4](#4-個別レイアウト設定)
以降で説明します。

| プリセット | 配色テーマ | 見出しフォント（和文/欧文） | Hero | メニュー | スタッフ | ギャラリー | セクション順序 |
|---|---|---|---|---|---|---|---|
| `kinari` | kinari | 白洲弘筆記体系 / Cormorant Garamond | fullscreen | editorial-list | portrait-grid | grid | 既定順 |
| `femme` | femme | 同上（kinariと共通） | split | card-grid | portrait-grid | masonry | Gallery を Menu の前に |
| `noir` | noir | 白洲弘筆記体系 / Playfair Display | fullscreen | minimal-price-list | horizontal-profile | feature-editorial | Gallery を Menu の前に |
| `editorial` | editorial | Zen角ゴシックNew / Playfair Display | editorial | editorial-list | horizontal-profile | feature-editorial | Gallery を Concept より前に |
| `natural` | natural | 同上（kinariと共通） | split | minimal-price-list | portrait-grid | masonry | 既定順 |
| `modern` | modern | Zen角ゴシックNew / Inter | split | card-grid | horizontal-profile | grid | Gallery を Staff の前に |

（フォント名の正式表記は「白洲弘筆記体系」ではなく実際には
`Shippori Mincho`です。表内は分かりやすさのための和名併記であり、実際の
設定値は[§6](#6-タイポグラフィ)のコード内表記に従ってください。）

各プリセットの正確なセクション順序（11個すべて）は[§8](#8-セクション順序)
で確認できます。

## 4. 個別レイアウト設定

### 4.1 プリセットと個別カスタマイズの関係

```text
プリセットを選ぶ
      ↓
サイト全体のベースデザインが決まる
      ↓
そのプリセットの中の、特定のレイアウトだけ個別に変更する（任意）
```

例えば「Noirの雰囲気は気に入っているが、Heroだけ横並び（split）にしたい」
という場合、Noirプリセット自体を`config/design-presets.ts`内で直接編集
します。これは環境変数ではなく、**プロジェクトの設定ファイルをコードで
編集する**という意味での「個別カスタマイズ」です。

`config/design-presets.ts`の`PRESET_COMPOSITIONS`オブジェクトに、
`kinari`以外の各プリセットのHero/メニュー/スタッフ/ギャラリーの型と、
セクション順序・表示設定がまとまっています（`kinari`自体は同じファイル内
の`DEFAULT_DESIGN_CONFIG`）。例えば`noir`のHeroを`fullscreen`から
`split`に変えたい場合:

```ts
// config/design-presets.ts
noir: {
  heroVariant: "split", // 変更前は "fullscreen"
  menuVariant: "minimal-price-list",
  staffVariant: "horizontal-profile",
  galleryVariant: "feature-editorial",
  sectionOrder: [ /* ... */ ],
  sectionVisibility: defaultVisibility(),
},
```

編集後は`npm run build`で本番用にビルドし直してください。この変更は
`noir`プリセットを選んでいる**すべてのデプロイ**に反映されます
（1つのデプロイだけ個別に変えたい場合は、通常はGitのブランチ/フォークを
分けて管理します）。

**重要な制限:** 上記の方法で個別変更できるのは、Hero/メニュー/スタッフ/
ギャラリーの「型」と、セクションの表示/順序です。配色（テーマ）と
フォント（タイポグラフィ）は、現在のバージョンでは各プリセットのID
（`preset`）と1対1で固定されており（`buildPreset()`関数の仕様）、
`PRESET_COMPOSITIONS`の表からは変更できません。「Noirの配色のまま、
Kinariのフォントを使う」のような組み合わせは、`config/design-presets.ts`
の`buildPreset`関数自体を編集する必要があり、本ガイドが推奨する
「設定値の変更」の範囲を超える、より踏み込んだコード変更になります。

また、`resolveDesignConfig()`（`lib/config/resolveDesignConfig.ts`）は
内部的に`{ preset, heroVariant, ... }`のような個別上書きの形も受け付ける
実装になっていますが、**現時点では`SALON_DESIGN_PRESET`のような
環境変数から個別項目を上書きできる、購入者向けの設定窓口は用意されて
いません**。この内部機能を使うにはコード（`lib/config/designConfig.ts`
の呼び出し部分）を書き換える必要があり、将来のバージョンでの拡張候補
です。今すぐ確実に個別変更したい場合は、上記の`config/design-presets.ts`
の直接編集をご利用ください。

### 4.2 Heroレイアウト（`heroVariant`）

| 値 | 見た目 |
|---|---|
| `fullscreen`（既定） | 写真を画面いっぱいに敷き、左下に見出し・CTAを重ねる構成。既存バージョンと同じ、最も定番のレイアウト。 |
| `split` | テキストと写真を左右2カラムに分ける構成。写真の上に文字を重ねないため、どのテーマでも文字が読みやすい。 |
| `editorial` | 中央寄せの名前・キャッチコピーから始まり、写真を左右どちらかにオフセット配置する、雑誌の扉ページのような非対称レイアウト。 |

### 4.3 メニューレイアウト（`menuVariant`）

| 値 | 見た目 |
|---|---|
| `editorial-list`（既定） | カテゴリごとに見出しを立て、罫線区切りのリストで表示する定番スタイル。 |
| `card-grid` | メニュー1件ごとに枠線付きのカードとして、グリッド状に並べるスタイル。 |
| `minimal-price-list` | 罫線もカードも使わず、名前と価格だけを詰めて並べる、ミニマルな価格表スタイル。 |

いずれのレイアウトでも、表示されるメニュー名・価格・所要時間・説明文・
カテゴリは同じ`SERVICES`シートのデータです。レイアウトを変えても
価格やメニュー内容を別々に管理する必要はありません
（詳細は[`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md)）。

### 4.4 スタッフレイアウト（`staffVariant`）

| 値 | 見た目 |
|---|---|
| `portrait-grid`（既定） | 縦長（4:5）のポートレート写真をグリッド状に並べる、定番のスタッフ紹介スタイル。 |
| `horizontal-profile` | 正方形の写真と、名前→役職→紹介文の情報を横並びにした、1人1行のプロフィール形式。 |

いずれのレイアウトでも、表示されるスタッフ名・役職・紹介文・写真は同じ
`STAFF`シートのデータです（詳細は
[`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md)）。

### 4.5 ギャラリーレイアウト（`galleryVariant`）

| 値 | 見た目 |
|---|---|
| `grid`（既定） | 各画像が元のアスペクト比を保ったまま、CSSの段組みで敷き詰められる定番レイアウト。 |
| `masonry` | あらかじめ決められたパターンでタイルの大きさを変化させる、雑誌風のレンガ状レイアウト。 |
| `feature-editorial` | 1枚だけ大きく見せる「主役写真」と、その周りを囲む小さめの写真という、メリハリのあるレイアウト。 |

ギャラリーの画像そのもの（何枚使うか・どの写真か）は`galleryVariant`
とは別に管理されています。写真を差し替えたいだけの場合は、レイアウトを
変える必要はありません（詳細は
[`IMAGE_CUSTOMIZATION_JA.md`](IMAGE_CUSTOMIZATION_JA.md)）。

## 5. 配色

配色は`app/globals.css`内のCSSカスタムプロパティ（`--color-*`）で
プリセットごとに管理されています。

- `kinari`（既定）の色は、ファイル冒頭の`:root`ブロックにあります。
- `femme`/`noir`/`editorial`/`natural`/`modern`の色は、それぞれ
  `html[data-design-preset="femme"] { ... }`のような、プリセットIDごとの
  ブロックにまとまっています。

コンポーネント側は`bg-accent`・`text-muted`のようなTailwindユーティリティ
クラス経由でこれらの値を参照しているため、色を変える場合は該当する
ブロック内の値を変更してください（コンポーネントファイルを1つずつ探して
直接色コードを書き換える必要はありません）。例えば`noir`のアクセント色
だけ変えたい場合:

```css
/* app/globals.css */
html[data-design-preset="noir"] {
  --color-accent: #c17b5e; /* ここを変更する */
  --color-accent-hover: #a8664c; /* ホバー時の色も一緒に見直すと自然です */
  /* ... 他の値はそのまま ... */
}
```

`config/theme-tokens.ts`の`THEMES`にも、同じ配色値が一覧としてまとまって
います。こちらは実際の画面表示には使われませんが（表示に使われるのは
`app/globals.css`側です）、プロジェクト内のテスト
（`config/theme-tokens.test.ts`など）が両ファイルの値が一致しているかを
検証しています。配色を変更する際は、`app/globals.css`と
`config/theme-tokens.ts`の両方を同じ値に合わせておくと、`npm test`が
変更後も通り続けます（必須ではありませんが、保守性のため推奨します）。

## 6. タイポグラフィ

見出し・本文で使われるフォントは、`config/typography-tokens.ts`の
`TYPOGRAPHY`にプリセットごとにまとまっています。役割は4つです。

| トークン | 役割 |
|---|---|
| `headingJa` | 見出しの和文フォント |
| `headingEn` | 見出しの欧文フォント |
| `bodyJa` | 本文の和文フォント |
| `bodyEn` | 本文の欧文フォント |

本文フォント（`bodyJa`/`bodyEn`）はNoto Sans JP + Interで全プリセット
共通です。見出しフォントは以下の3系統に分かれます。

| プリセット | 見出し（和文） | 見出し（欧文） |
|---|---|---|
| `kinari` / `femme` / `natural` | Shippori Mincho | Cormorant Garamond |
| `noir` | Shippori Mincho | Playfair Display |
| `editorial` | Zen Kaku Gothic New | Playfair Display |
| `modern` | Zen Kaku Gothic New | Inter |

これらのフォントは`app/layout.tsx`で`next/font/google`によりあらかじめ
読み込まれており、`config/typography-tokens.ts`の値と`app/globals.css`
の`--font-heading-*`はこの読み込み済みフォント変数を参照する形になって
います。

**このガイドの範囲では、6プリセットに用意済みの組み合わせの中から
選ぶことが基本です。** 一覧にない新しいGoogleフォントをまるごと追加
したい場合は、`app/layout.tsx`のフォント読み込み定義の追加と
`config/typography-tokens.ts`側の対応づけが必要になり、単なる設定値の
変更を超えるコード変更になります（本ガイドの対象外です）。

## 7. セクション表示

トップページの各セクションは、`config/design-presets.ts`内の
`sectionVisibility`で表示/非表示を切り替えられます（プリセットごとに
設定）。

```text
表示/非表示（sectionVisibility） — このセクションをそもそも出すかどうか
並び順（sectionOrder）           — 出すセクションを何番目に置くか
```

この2つは別の設定です。非表示にしたセクションは順序にも現れません。

**`hero`と`menu`は必須セクションで、非表示にはできません**
（型定義`RequiredHomeSection`により、`sectionVisibility`の対象からも
除外されています）。非表示にできる任意セクションは以下の9つです。

```text
concept / staff / gallery / reservation / salon-features /
customer-flow / faq / access / contact
```

現在の6プリセットはすべて、任意セクションを既定で表示のままにしています
（デザインの違いはレイアウトの型と並び順で表現しており、セクションを
隠すことでは差別化していません）。特定のセクションを隠したい場合は、
該当プリセットの`sectionVisibility`を編集してください。

```ts
// config/design-presets.ts
noir: {
  // ...
  sectionVisibility: {
    ...defaultVisibility(),
    "customer-flow": false, // 例: ご来店の流れセクションを非表示にする
  },
},
```

なお、`staff`・`reservation`・`contact`の3セクションは、Google Sheetsの
`CONFIG`シート側の機能ON/OFF設定（`features.staffSelection`など）とも
連動しています。デザイン側の`sectionVisibility`は、業務側の機能フラグが
すでに許可している範囲をさらに狭めることしかできません
（業務側がOFFのセクションを、デザイン側の設定だけで表示させることは
できません）。

## 8. セクション順序

`sectionOrder`は、表示する11個のセクションを並べる順序です
（`config/design-presets.ts`、プリセットごとに設定）。

```text
既定の順序（kinari / natural）:
hero → concept → menu → staff → gallery → reservation →
salon-features → customer-flow → faq → access → contact
```

他のプリセット（例: `femme`/`noir`）は、Gallery（写真の訴求力）を
Menuより前に出すなど、独自の順序を使っています。正確な順序は
`config/design-presets.ts`の各プリセットの`sectionOrder`配列を直接
ご確認ください。

並び順を変更する場合の制約:

- 変更できるのは、あらかじめ登録された11個のセクションID
  （`hero`/`concept`/`menu`/`staff`/`gallery`/`reservation`/
  `salon-features`/`customer-flow`/`faq`/`access`/`contact`）の並び替えの
  みです。存在しないIDや、Reactコンポーネント名を直接指定することは
  できません。
- 11個すべてを、重複なく1回ずつ含める必要があります。1つでも欠けていたり
  重複していたりすると、その設定は無効なものとして扱われ、既定の順序に
  自動的にフォールバックします（ページが壊れることはありません）。

**ページ末尾の固定CTA（「最後まで読んでくださり、ありがとうございます」
という予約導線バンド）は、`sectionOrder`の対象外です。** ヘッダー・
フッターと同様に、常にページの一番最後に固定表示される構造要素として
扱われており、`sectionOrder`に追加したり、途中に移動したりすることは
できません。

## 9. デザインと業務データの違い

このテンプレートを理解する上で最も重要な区別です。

```text
デザイン（本ガイドの対象・ソースコードで編集）
  プリセット / 配色テーマ / タイポグラフィ / Hero・メニュー・スタッフ・
  ギャラリーのレイアウト型 / セクションの表示・順序

業務データ（Google Sheetsで編集）
  店舗名・キャッチコピー・住所・営業時間・SNSリンク /
  メニュー内容・価格・所要時間 / スタッフの名前・役職・紹介文・写真
```

デザインを変更するために、サービス価格やスタッフ情報をReactコンポーネント
やデザイン設定ファイルへ直接書き込まないでください。データの入り口を
2つに増やしてしまうと、Google Sheets側を更新しても画面に反映されなく
なります。メニュー・スタッフの内容変更は
[`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md)・
[`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md)、画像の差し替えは
[`IMAGE_CUSTOMIZATION_JA.md`](IMAGE_CUSTOMIZATION_JA.md)を参照してください。
より広い業務データ/デザインの全体像は
[`CONTENT_CUSTOMIZATION_JA.md`](CONTENT_CUSTOMIZATION_JA.md)にもまとめて
あります。

## 10. カスタマイズ例

### 例A: サイト全体のデザインを丸ごと変える

```text
SALON_DESIGN_PRESET=kinari
```

を

```text
SALON_DESIGN_PRESET=noir
```

に変更し、`.env.local`（ローカル）またはVercelの環境変数（本番）を
更新したうえで、再ビルド・再デプロイします（[§3.1](#31-設定方法)）。

### 例B: Noirをベースに、Heroだけ変える

Noirの雰囲気（配色・フォント・他のレイアウト）はそのまま、Heroだけ
`split`にしたい場合は、`config/design-presets.ts`の`noir`エントリの
`heroVariant`を書き換えます（[§4.1](#41-プリセットと個別カスタマイズの関係)）。
現時点では、環境変数だけでこの個別上書きを行う仕組みはありません。

### 例C: ギャラリーを前の方に表示する

`editorial`プリセットの`sectionOrder`は、すでにGalleryをConceptより前に
配置しています。他のプリセットでも同様に、`sectionOrder`配列内で
`"gallery"`の位置を前に動かすだけで反映されます（[§8](#8-セクション順序)）。

```ts
sectionOrder: [
  "hero",
  "gallery", // menuより前に移動
  "concept",
  "menu",
  "staff",
  // ...
],
```

### 例D: メニュー内容（価格・施術時間）を変える

これはデザイン変更ではなく、業務データの変更です。`config/`配下の
ファイルではなく、Google Sheetsの`SERVICES`シートを編集してください。
詳細は[`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md)を参照して
ください。

## 11. ビルドと確認

```bash
cd 01_WEB_TEMPLATE/salon-website

npm run dev        # ローカルで確認
npm test           # Jest + React Testing Library
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run build      # 本番ビルド（デザイン設定はここで確定する）
npm start          # ビルド結果をローカルで確認
```

デプロイ手順の詳細は
[`../04_SETUP_GUIDE/WEB_SETUP_JA.md`](../04_SETUP_GUIDE/WEB_SETUP_JA.md)・
[`../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md`](../04_SETUP_GUIDE/VERCEL_DEPLOY_JA.md)
を参照してください。

## 12. よくある問題

**プリセットを変更したのに、サイトの見た目が変わらない**
再ビルド・再デプロイを行っていない可能性があります。デザイン設定は
ビルド時に確定するため、環境変数を保存しただけでは反映されません
（[§3.1](#31-設定方法)）。ローカルの場合は開発サーバーの再起動も
お試しください。

**メニュー価格を変えたくて、Reactコンポーネントを直接編集してしまった**
価格・所要時間などの予約に関わる値は、`SERVICES`シートが唯一の情報源
です。コンポーネントを直接編集すると、Google Sheets側との表示が食い違う
原因になります。編集を元に戻し、`SERVICES`シートを更新してください
（[`MENU_CUSTOMIZATION_JA.md`](MENU_CUSTOMIZATION_JA.md)）。

**`sectionOrder`に存在しないIDを追加してしまった**
登録済みの11個のセクションID以外を指定すると、その設定全体が無効と
判定され、既定の順序に自動的にフォールバックします（ページが壊れる
ことはありません）。タイプミスがないか確認してください
（[§8](#8-セクション順序)）。

**HeroやMenuを非表示にしようとしてもできない**
`hero`と`menu`は必須セクションで、仕様上非表示にできません
（[§7](#7-セクション表示)）。

**STAFFシートの`CalendarID`を、デザイン変更のついでに書き換えてしまった**
`CalendarID`はGoogleカレンダー連携に使われる予約系の設定です。
Googleカレンダーの設定内容を理解しないまま変更すると、そのスタッフの
予約が正しいカレンダーに登録されなくなるおそれがあります。デザイン
カスタマイズの一環として触る項目ではありません
（[`STAFF_CUSTOMIZATION_JA.md`](STAFF_CUSTOMIZATION_JA.md)、
[`../04_SETUP_GUIDE/CALENDAR_SETUP_JA.md`](../04_SETUP_GUIDE/CALENDAR_SETUP_JA.md)）。

## 13. カスタマイズ時の注意事項

- デザイン変更は`config/design-presets.ts`・`app/globals.css`・
  `config/typography-tokens.ts`などの**設定ファイル**の範囲で行うことを
  基本にしてください。`components/sections/`・`components/ui/`配下の
  コンポーネントを直接改造すると、他のプリセットや将来のアップデートとの
  整合性が崩れやすくなります。
- 予約・カレンダー連携のロジック（`lib/api/`、GAS側のコード）は、通常の
  デザインカスタマイズでは変更しないでください。
- 変更後は、[§11](#11-ビルドと確認)のコマンドで型チェック・テスト・
  ビルドが通ることを必ず確認してから公開してください。
- 業務データ（店舗名・価格・スタッフ情報など）は、デザイン設定ファイル
  ではなく必ずGoogle Sheetsで編集してください（[§9](#9-デザインと業務データの違い)）。

## 14. 参考: 余白・ブレークポイント・アニメーション

`config/theme.ts`に、JavaScript側から参照する数値トークンがまとまって
います。

| トークン | 内容 | 値 |
|---|---|---|
| `SPACING_PX` | 余白の基準スケール（4px単位） | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 |
| `BREAKPOINTS_PX` | レスポンシブのブレークポイント | tablet: 640 / desktop: 1024 / largeDesktop: 1440 |
| `MOTION_MS` | アニメーションの長さ（ミリ秒） | heroEnter: 400 / reveal: 300 / press: 150 / accordion: 200 |
| `CONTENT_MAX_WIDTH_PX` | 本文コンテンツの最大幅 | 1120 |

余白は基本的にTailwindの数値クラス（`p-4`、`gap-6`など）が上記の
スケールとそのまま対応しているため、コンポーネントのクラス名を直接
編集して調整してください。`theme.ts`は、`IntersectionObserver`の
margin指定など、生の数値がどうしても必要な一部の箇所からのみ参照
されています。

### レスポンシブ対応

`BREAKPOINTS_PX`のJS側の値と、`app/globals.css`で設定されている
Tailwindの`sm:`/`lg:`/`xl:`プレフィックスに対応するブレークポイントは
一致しています。レイアウトを調整する場合は、これらのプレフィックス
付きクラスを使ってください。

### セクション・ボタンなどのコンポーネント（上級者向け）

各セクション（ヒーロー・コンセプト・メニュー・スタッフ・ギャラリー
など）は`components/sections/`配下、フォーム・ボタンなどの共通部品は
`components/ui/`配下にあります。[§1](#1-このガイドについて)の通り、本ガイドの
範囲を超える見た目の微調整（マージンの数px単位の調整など）を行う場合は、
これらのコンポーネント内のTailwindクラスを編集してください。業務データ
（メニュー名や価格など）をこれらのファイルに直接書き込まないよう
注意してください（必ずGoogle Sheetsを編集してください）。
