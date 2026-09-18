# Demo photography sources

Every raster photo (`.jpg`) under `public/images/{hero,gallery,salon}/` is a
real stock photograph, not the salon's own photography — placeholder/demo
content until a real customer supplies their own images. Sourced from
Unsplash under the [Unsplash License](https://unsplash.com/license) (free
to use, commercial use permitted, no attribution required) and downloaded
once at build time into this repo — there is no runtime dependency on an
external image host. Credited below anyway, as a courtesy to the
photographers and so a future swap knows what each file's origin was.

Staff avatars (`public/images/staff/*.svg`) are illustrated, not
photographic — see `config/demo-content.ts`'s comment on `STAFF` for why.

| File | Unsplash photo | Photographer |
|---|---|---|
| `hero/hero-hair-cutting.jpg` | [Z4ZS4Ry6E-U](https://unsplash.com/photos/a-man-getting-his-hair-cut-with-a-comb-and-scissors-Z4ZS4Ry6E-U) | David Cano Soriano |
| `gallery/gallery-hair-cutting-closeup.jpg` | [el9O2EEmp0k](https://unsplash.com/photos/a-woman-cutting-another-womans-hair-in-a-salon-el9O2EEmp0k) | Gabriela |
| `gallery/gallery-hair-color-application.jpg` | [lps3FolQ6Ro](https://unsplash.com/photos/a-man-cutting-a-womans-hair-with-a-pair-of-scissors-lps3FolQ6Ro) | Ionela Mat |
| `gallery/gallery-hair-texture-natural.jpg` | [ih03D0F6M6M](https://unsplash.com/photos/a-close-up-of-a-person-with-curly-hair-ih03D0F6M6M) | Cemrecan Yurtman |
| `gallery/gallery-salon-interior-chair.jpg` | [PtOfbGkU3uI](https://unsplash.com/photos/salon-chairs-at-white-vanity-PtOfbGkU3uI) | Guilherme Petri |
| `gallery/gallery-salon-interior-lounge.jpg` | [_C-S7LqxHPw](https://unsplash.com/photos/a-room-filled-with-furniture-and-a-large-window-_C-S7LqxHPw) | Benyamin Bohlouli |
| `gallery/gallery-hair-styling-tools.jpg` | [eAlcaMVJYNg](https://unsplash.com/photos/silver-scissors-beside-brown-glass-bottle-on-brown-wooden-table-eAlcaMVJYNg) | Lera Kogan |
| `salon/salon-reception-light.jpg` | [_Fy7Kq0w6OI](https://unsplash.com/photos/a-modern-hair-salon-interior-with-stylish-chairs-and-mirrors-_Fy7Kq0w6OI) | Barney Goodman |
| `salon/salon-treatment-room.jpg` | [Ui6DZ9A1eXU](https://unsplash.com/photos/a-room-with-a-chair-sink-and-a-plant-in-it-Ui6DZ9A1eXU) | Daniel |

Notes on subject matching (honesty over convenience — see individual pages
for full context):

- `hero-hair-cutting.jpg` and `gallery-hair-cutting-closeup.jpg` are two
  different real cutting close-ups (comb + scissors, and scissors mid-cut
  through wet hair) — deliberately different photos so the hero and gallery
  don't repeat the same image.
- `gallery-hair-color-application.jpg`'s own Unsplash page title says
  "a man cutting a woman's hair with a pair of scissors," but the actual
  photograph (verified by viewing it directly, not just the auto-generated
  title) shows a colorist painting foils with a tint brush — Unsplash's
  auto-generated slug titles are not always literal descriptions of the
  photo content, so this was confirmed visually before use.
- `salon/salon-reception-light.jpg` is a black-and-white architectural shot
  (the photographer's own description calls it "bright," referring to
  exposure/lighting, not color processing) — used deliberately as an
  editorial monochrome accent rather than discarded, since no equivalent
  color photo of an unbranded salon reception area could be found and
  verified.
