# APP_SPEC.md

## Product identity

- **Name:** 画像圧縮・変換ツール / Image Compressor & Converter
- **Version:** 1.1.0
- **Purpose:** Find a practical image output by comparing format, quality and dimensions entirely in the browser.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Runtime network:** blocked with CSP `connect-src 'none'`

## Core flow

1. Start screen: add one or more PNG, JPEG or WebP images, or begin from a purpose preset. Desktop also supports clipboard image paste with `Ctrl+V`.
2. Workbench: select a purpose such as Website, Photo, Screenshot, Size limit, README, Transparency or Convert only.
3. Optimize: run Smart Optimize, or use the manual “Convert with settings” path.
4. Review: inspect Before / After, amplified difference, file-size savings, format candidates and large preview.
5. Save / Export: save the selected image, batch ZIP, or use Export for Base64 and web/developer snippets.

## Functional requirements

- PNG / JPEG / WebP input with multiple-file and folder selection.
- Browser-supported JPEG / PNG / WebP output.
- Purpose-based presets for common image workflows.
- Smart Optimize compares candidate formats and quality levels using a local visual-difference score.
- Target-size mode searches quality and, when required, progressively reduces dimensions to approach the requested KB limit.
- Auto format selection with transparency-aware fallback.
- Resize by long edge, width, height or no resize; preserve aspect ratio and never upscale.
- Optional source retention when conversion would make the result larger.
- Batch processing with cancellation between files and total source/output/savings summary.
- Before / After slider with a visible divider and handle.
- Amplified pixel-difference view for subtle compression changes.
- Separate on-demand JPEG / PNG / WebP format comparison.
- Large preview dialog with 100–400% zoom, drag-to-pan, pinch zoom and Before / After comparison.
- Editable output filename while the app controls the matching extension.
- Single-image save and batch ZIP; batch ZIP preserves relative folder paths.
- Export dialog for Base64 Data URL, HTML, CSS, Markdown, `<picture>` and Web-assets ZIP.
- Japanese / English UI in the same standalone HTML.
- Persist only settings/language in LocalStorage; never persist image bytes.
- Use in-app confirmation for destructive clear.

## Privacy

- Image processing uses browser APIs such as Canvas, Blob and FileReader.
- Runtime CSP contains `connect-src 'none'`.
- No analytics, telemetry, tracking, server storage or account system.
- Selected images are not uploaded by the app.
- Canvas re-encoding normally removes EXIF and similar metadata.

## UX

- Light-only UI aligned with Browser Kitty / `htmlapps-template`.
- Start state keeps the UI intentionally simple: purpose-first copy, image input and four quick purpose choices.
- Desktop Workbench uses three areas: image list, comparison preview and optimization settings.
- Desktop drop area states that multiple selection is supported and offers `Ctrl+V` clipboard guidance.
- Mobile file input states that multiple image selection is supported without desktop-only drag/drop or keyboard guidance.
- Purpose icons and app identity icons use SVG, not emoji.
- Mobile (<=720px) uses a safe-area-aware fixed action bar and settings bottom sheet.
- The mobile settings sheet closes when “Convert with settings” is executed.
- Visible focus states and `prefers-reduced-motion` support are required.

## Acceptance criteria

- `app.config.json` and visible UI report version `1.1.0`.
- No unresolved build placeholders or prohibited external runtime assets exist in generated artifacts.
- `dist/index.html` works when opened directly with `file://` in a current browser.
- Core conversion, Smart Optimize, target-size mode, comparison, Base64 and ZIP functions work without runtime network access.
- Start screen changes to Workbench after images are added and returns to Start after all images are cleared.
- Desktop supports multi-file selection, folder selection, drag/drop and clipboard image paste.
- Mobile avoids desktop-only drag/drop / `Ctrl+V` instructions and supports multiple selection through the file picker.
- Smart Optimize can keep the source when the generated result would be larger.
- Target-size mode can reduce both quality and dimensions for JPEG / WebP; PNG can only reduce dimensions.
- Batch summary shows source size, output size and total savings after conversion.
- Before / After divider remains visible while comparison is active, and the difference view can be toggled without changing the output.
- Mobile settings close after manual conversion is triggered.
- Save filename edits are reflected in single downloads and batch ZIP paths.
- Export dialog provides the documented web/developer outputs.
- `assets/favicon.svg`, the embedded favicon and the header app icon use the same visual design.
