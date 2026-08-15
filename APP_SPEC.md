# APP_SPEC.md

## Product identity
- **Name:** 画像圧縮・変換ツール / Image Compressor & Converter
- **Purpose:** Compress, convert, resize and prepare images for the web entirely in the browser.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## Core flow
1. Add PNG, JPEG or WebP images (multiple files and folder selection supported).
2. Choose a preset or adjust output format, resize rule, quality and optional target size.
3. Convert sequentially in the browser.
4. Compare source/output visually with a clearly separated Before / After slider, open the large preview when needed, and compare formats separately.
5. Optionally edit the output filename, then save the selected image or batch outputs as ZIP; Base64/snippets and a Web assets ZIP are also available.

## Functional requirements
- PNG/JPEG/WebP input and browser-supported JPEG/PNG/WebP output.
- Auto format selection with transparency-aware fallback.
- Resize by long edge, width, height or no resize; preserve aspect ratio and never upscale.
- JPEG/WebP quality control and target-size binary search.
- Batch conversion with cancellation between files.
- Before/after slider with a visible divider, clear drag guidance, and an optional amplified pixel-difference view for cases where high-quality compression looks nearly identical.
- Separate on-demand JPEG/PNG/WebP format comparison.
- Large preview dialog with 100–400% zoom, drag-to-pan, pinch zoom and Before/After comparison.
- Editable output filename per converted image while keeping the format extension controlled by the app.
- Prominent save action; on mobile the primary CTA moves from Convert to Save after output exists.
- Base64 Data URL, HTML, CSS, Markdown and `<picture>` snippets.
- Web assets ZIP with WebP + JPEG/PNG fallback + `snippet.html`.
- Batch ZIP preserves relative folder paths.
- Japanese/English UI.
- Persist only settings/language in LocalStorage; never persist image bytes.
- Use in-app confirmation for destructive clear.

## Privacy
- Processing uses Canvas, Blob and FileReader.
- Runtime CSP contains `connect-src 'none'`.
- No analytics, telemetry, tracking, server storage or account system.
- Canvas re-encoding normally removes EXIF and similar metadata.

## UX
- Light-only UI aligned with `htmlapps-template`.
- Desktop: content plus sticky settings panel with an explicit Settings → Convert → Save workflow indicator.
- After conversion, the desktop sidebar promotes Save to the primary action and keeps reconversion available as the secondary path.
- Mobile (<=720px): safe-area-aware bottom action bar and settings bottom sheet.
- Main mobile actions: add, settings, convert, save; the primary CTA changes with workflow state.
- Visible focus and `prefers-reduced-motion` support.

## Acceptance criteria
- No unresolved build placeholders or external runtime assets.
- Direct `file://` opening of `dist/index.html` works in normal browsers.
- Core conversion, format comparison, Base64 and ZIP functions work offline.
- Mobile layout exposes bottom actions and settings sheet.
- Save filename edits are reflected in single downloads and batch ZIP paths.
- Before/After divider remains visible while the comparison control is active, and the amplified difference view can be toggled without changing the output.
- Desktop conversion completion visibly advances the workflow to Save and exposes a prominent save CTA in the sticky sidebar.
