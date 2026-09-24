# 0009: Local deterministic Rich Menu renderer (SVG + resvg + pinned font)

**Context.** Phase 1 produced `design-spec.json` but no image, so a person had to draw the
Rich Menu image by hand, and nothing checked that the image matched the tappable areas. v1
needs an image LINE accepts, built from the spec, byte-reproducible, with no network or
design-tool account.

**Decision.**
- `src/richMenu/renderer.ts` turns the design spec into an SVG string (pure function) and
  rasterizes it with **`@resvg/resvg-js` 2.6.2**, a Rust SVG renderer with prebuilt binaries.
  It needs no browser and no network, and its output is deterministic.
- Japanese text needs a Japanese font. **`@embedpdf/fonts-jp` 1.0.0** ships the Noto Sans JP
  OTF files (SIL OFL 1.1). resvg loads only these files (`loadSystemFonts: false`), so the
  machine's installed fonts cannot change the output.
- Both are exact-pinned dev dependencies. `image.json` records renderer id/version, rasterizer
  version and font package version with the PNG's sha256.
- QA re-renders on every run and compares bytes. A changed spec, a hand-edited PNG or a
  changed renderer/dependency version is reported instead of silently shipped.
- The renderer sits behind `RichMenuImageRenderer`, so an optional Canva (or other) adapter can
  be added later without touching the pipeline. Canva is not a v1 dependency.

**Alternatives rejected.**
- A headless browser (Puppeteer or Playwright) is large, and its output depends on the browser version.
- Canvas libraries with system fonts give different results on each machine.
- Hand-rolling glyph rasterization means reimplementing font hinting and anti-aliasing.
- Canva as the primary path needs an account and the network, and is not reproducible.

**Consequences.** `npm install` downloads about 30 MB of font files, which are not committed. Bumping
either dependency may change image bytes. That shows up as `LINE_DETERMINISTIC_IMAGE` and
is resolved by regenerating the projects and bumping `RENDERER_VERSION`.
