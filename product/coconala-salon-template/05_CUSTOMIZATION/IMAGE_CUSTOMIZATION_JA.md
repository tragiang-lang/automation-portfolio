# 画像カスタマイズガイド

## 同梱されている画像について

本テンプレートに含まれる写真（`.jpg`ファイル）は、すべて
[Unsplashライセンス](https://unsplash.com/license)のもとで配布されている
ストックフォトです。Unsplashライセンスは商用利用が許可されており、
クレジット表記も不要なため、そのままの状態で合法的に配布・利用できます
（`01_WEB_TEMPLATE/salon-website/public/images/SOURCES.md`に、写真ごとの
出典・撮影者クレジットを記載しています）。

スタッフのアイコン画像（`staff/*.svg`）は、実在の人物の写真ではなく、
本テンプレート用に作成されたオリジナルのイラストです。架空のスタッフ
名・プロフィールに実在の人物の顔写真を結びつけることを避けるための
意図的な設計です。こちらも安心してそのままお使いいただけます。

**ただし、これらはすべて「デモ用」の写真・イラストであり、実在するどの
サロンの写真でもありません。** 本番公開前には、必ずご自身のサロンの
実際の写真に差し替えることを強くおすすめします。

## 画像ディレクトリ一覧

`01_WEB_TEMPLATE/salon-website/public/` 配下:

| ディレクトリ / ファイル | 内容 |
|---|---|
| `images/hero/` | トップページのメインビジュアル（1枚） |
| `images/salon/` | 店内写真（2枚） |
| `images/gallery/` | ギャラリーセクションの施術写真（8枚） |
| `images/staff/` | スタッフのイメージアイコン（SVG、4枚） |
| `icons/pin.svg` | アクセス地図のピンアイコン |

## 推奨サイズ・比率

- **hero画像**: 横長を推奨（目安: 幅1600px以上、アスペクト比16:9前後）。
- **gallery画像**: `config/demo-content.ts`の`GALLERY_IMAGES`で、各画像の
  実際の`width`/`height`（ピクセル単位）を保持しています（例:
  `gallery-manicure-application.jpg`は1200×800、
  `gallery-lash-extensions.jpg`は1200×870）。差し替える際は、元の画像と
  近いアスペクト比を保つと、ページ読み込み時のレイアウト崩れ
  （表示中に画像の枠がガクッと動く現象）を防げます。
- **staff画像**: 現在はSVGアイコンですが、実際のスタッフ写真に差し替える
  場合は正方形（例: 400×400px）を推奨します。

## ファイル名規則

最も簡単な差し替え方法は、**既存のファイル名のまま画像だけを上書きする**
ことです。この場合、コード側の参照パス（`config/demo-content.ts`内の
`src`指定）を変更する必要がありません。

別のファイル名を使いたい場合は、`config/demo-content.ts`内の該当する
`src`パスも合わせて変更してください。

## 差し替え手順

### hero画像

1. `public/images/hero/hero-nail-treatment.jpg` を、同じファイル名で
   ご自身の画像に置き換えます。
2. 必要であれば、`config/demo-content.ts`内の該当箇所の`alt`テキスト
   （画像の説明文）も、実際の画像内容に合わせて更新してください。

### gallery画像

1. `public/images/gallery/` 配下の各ファイルを、同じファイル名で
   ご自身の施術写真に置き換えます。
2. `config/demo-content.ts`の`GALLERY_IMAGES`内、該当する項目の`alt`
   テキストと`width`/`height`を、新しい画像の内容・実寸に合わせて
   更新してください。

### staff画像

1. `public/images/staff/staff-avatar-0X.svg` を、実際のスタッフの写真
   （`.jpg`等）に置き換えます（拡張子を変える場合は、
   `config/demo-content.ts`内の`photoSrc`パスも変更してください）。
2. `config/demo-content.ts`の`STAFF`内、該当スタッフの`photoAlt`
   テキストを実際の写真に合わせて更新してください。

`STAFF`スプレッドシートで運用している場合（本番公開時の通常の方法）は、
`config/demo-content.ts`を編集する代わりに、`STAFF`シートの`ImagePath`
列（任意項目）に画像パスを指定してください。手順は同じです — 画像
ファイルを`public/images/staff/`配下に置き、そのパス（例:
`/images/staff/staff-05.jpg`）を`ImagePath`列に入力します。外部サイトの
URLは指定できません（`STAFF_CUSTOMIZATION_JA.md`参照）。

## どの画像がデモ専用か

本パッケージに含まれる画像はすべて（写真11枚＋SVGアイコン4枚）、
本番公開前に差し替えを検討すべきデモ専用コンテンツです。ライセンス上は
そのまま使い続けても問題ありませんが、実在しないサロンの写真を掲載した
まま集客用に公開することは避けてください。
