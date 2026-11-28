# APP_SPEC.md

## Product identity

- **Name:** 画像圧縮・変換ツール / Image Compressor & Converter
- **Version:** 1.2.0 (canonical value in `app.config.json`)
- **Purpose:** Find a practical image output by comparing format, quality and dimensions entirely in the browser.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`
- **Runtime network:** blocked with CSP `connect-src 'none'`

## Core flow

1. Add PNG, JPEG or WebP images through the picker. Desktop also supports dropping files and pasting an image with `Ctrl+V`. Compression starts automatically for the newly added images.
2. Review the selected result in the preview. Compare the original with the output and inspect file-size savings. Select other images from the list.
3. Save the previewed image, save all results or choose a subset for a ZIP. Additional imports append files and preserve earlier results.

To adjust settings first, turn off **Compress on import** / **追加時に自動で圧縮**. Open compression settings to choose a purpose, size limit or quality ceiling, then select **Compress** / **自動圧縮**. Advanced settings provide manual conversion with **Convert with settings** / **設定どおり変換**.

## Functional requirements

- PNG / JPEG / WebP input with multiple-file and folder selection.
- Browser-supported JPEG / PNG / WebP output.
- Purpose-based presets for common image workflows.
- Automatic compression respects the quality ceiling and compares candidates using a local visual-difference score. In quality-based searches with no passing candidate, return the closest measured match. An unavailable WebP encoder falls back to JPEG for opaque inputs or PNG for transparent inputs.
- Target-size mode searches quality and, when required, progressively reduces dimensions to approach the requested KB limit.
- Automatic comparisons preserve transparency, including a single translucent pixel at the original resolution.
- Resize by long edge, width, height or no resize; preserve aspect ratio and never upscale.
- Optional source retention when the converted file would be as large as the source or larger, provided the source fits any enabled size limit. Retained files keep their bytes and use the extension for the detected source format.
- Batch completion and cancellation report successes and failures for that run. Cancellation takes effect between files. The list keeps failure counts visible alongside the size summary for available outputs.
- Both comparison views place the source on the left and the output on the right of the divider.
- Amplified pixel-difference view for subtle compression changes.
- On-demand format comparison measures the actual selectable output, including target size, dimensions and source retention. Selecting a card reuses its measured bytes, and changes to conversion settings invalidate previous comparisons.
- Large preview dialog with 100–400% zoom, drag-to-pan, pinch zoom and Before / After comparison.
- Editable output filename while the app controls the matching extension.
- Single-image save and batch ZIP; batch ZIP preserves relative folder paths.
- A separate per-image checkbox chooses inclusion in **Save checked ZIP**, independently of preview selection and Remove selected. New stable image IDs default to included; inclusion stays in memory through rerenders, language changes, filename edits and reprocessing, and is removed with that image or clear-all.
- All / None applies only to images with an available output. Waiting/error images without output are omitted; an existing output retained after a failed retry remains eligible under the existing conversion policy.
- Show the checked eligible count. Disable checked ZIP, checkboxes and All / None during batch processing; disable checked ZIP at zero, and All / None when no outputs exist. Restore these states after completion or cancellation.
- Checked export always downloads a ZIP, including one output, with membership, paths and Blob identities captured before asynchronous ZIP reads. Existing save-all and single-image actions remain independent, including direct save for one output.
- ZIP creation assigns deterministic unique paths for exact collisions after existing safe-path normalization. Reserve original names before allocating numbered suffixes, preserve order/folders/extensions/payload bytes, and never modify the edited output names. ZIP path identity remains case-sensitive; broader extractor portability is outside this behavior.
- Export dialog for Base64 Data URL, HTML, CSS, Markdown, `<picture>` and Web-assets ZIP. The Web assets and both copies of the picture snippet use the edited output name and output dimensions.
- Japanese / English UI in the same standalone HTML.
- Persist only settings/language in LocalStorage; never persist image bytes.
- Remove the selected image after in-app confirmation naming its captured source path; keep every other image, edited filename, relative path, output and setting. Select the next image (otherwise the previous one), or return to Start after the last removal.
- Disable removal during batch conversion; ignore delayed metadata, comparison, difference and snippet results for removed images or stale selections.
- Use in-app confirmation for destructive clear.

## Privacy

- Image processing uses browser APIs such as Canvas, Blob and FileReader.
- Runtime CSP contains `connect-src 'none'`.
- No analytics, telemetry, tracking, server storage or account system.
- Selected images are not uploaded by the app.
- Canvas re-encoding normally removes EXIF and similar metadata. Saving an original preserves its metadata, including location when present. Indicate this near the applicable save actions.

## UX

- Light-only UI aligned with Browser Kitty / `htmlapps-template`.
- The Start screen puts the image picker and the enabled-by-default **Compress on import** checkbox first. An optional **Compression settings** / **圧縮設定** button opens the full settings, including purpose presets, before import.
- After loading images, the header, workbench and footer share the same content width and side padding. The drop icon points down into the tray.
- On desktop, show the comparison preview on the left and the file list with batch controls on the right. Keep the selected image’s save action with its preview. **Compression settings** opens settings on demand.
- Desktop drop area states that multiple selection is supported and offers `Ctrl+V` clipboard guidance.
- Mobile file input states that multiple image selection is supported without desktop-only drag/drop or keyboard guidance.
- Purpose icons and app identity icons use SVG, not emoji.
- At widths up to 720px show the preview above the file list and batch controls. Keep **Settings** / **設定** in the safe-area-aware fixed bottom bar after import.
- When an output exists, the mobile bar links directly to its preview. If the selected image failed, the shortcut opens an available result.
- The mobile settings sheet closes when “Convert with settings” is executed.
- Visible focus states and `prefers-reduced-motion` support are required.

## Responsive dialogs

- Native modal dialogs lock background page scrolling while open and restore normal scrolling on dismissal.
- Help starts with three short steps using the actions visible on the current screen. Separate expandable topics cover multiple images, formats and size limits, and privacy.
- Help keeps its heading and Close fixed while only its body scrolls within the available viewport and safe areas. Preserve the existing Export and Viewer shell allocations. Confirmation uses its own fixed header and internally scrolling body so short/narrow action buttons remain reachable.
- The narrow Viewer toolbar reserves its existing button widths while its zoom range can shrink; the comparison range stays inside the toolbar. Export grid/code content has zero-minimum containment instead of forcing horizontal overflow.
- At widths up to 420px, the title/version wrap without shrinking language or Help actions. Preserve the brand artwork.
- Hide the local-processing badge and header subtitle at widths up to 720px and on touch devices with a viewport height up to 600px, including landscape phones. Privacy details remain available in Help.
- Acceptance requires actual short/narrow JA/EN bounds, tail reachability, wheel, Tab and dismissal/focus checks. Source contracts do not establish native geometry. Full image conversion, other dialogs/settings and actual saves remain separate audit gates.

## Acceptance criteria

- The header, Help and build manifest report the version from `app.config.json`.
- No unresolved build placeholders or prohibited external runtime assets exist in generated artifacts.
- `dist/index.html` works when opened directly with `file://` in a current browser.
- Automatic compression, manual conversion, target-size mode, comparison, Base64 and ZIP functions work without runtime network access.
- With default settings, adding a file opens the workspace and produces a result without an extra button press. A later import processes the new files and preserves earlier outputs, filenames and ZIP selections. Clearing all files returns to Start.
- With **Compress on import** off, added files wait for an explicit compression or conversion action. The picker, preview and save actions are usable with settings closed.
- Desktop supports multi-file selection, folder selection, drag/drop and clipboard image paste.
- Mobile avoids desktop-only drag/drop / `Ctrl+V` instructions and supports multiple selection through the file picker.
- Automatic compression can keep the source when the generated result would be larger.
- Target-size mode can reduce both quality and dimensions for JPEG / WebP; PNG can only reduce dimensions.
- Batch summary shows source size, output size and total savings for available outputs. A mixed batch reports both successes and failures.
- Before / After divider remains visible while comparison is active, and the difference view can be toggled without changing the output.
- Mobile settings close after manual conversion is triggered.
- Save filename edits are reflected in single downloads and batch ZIP paths. Same-stem PNG/JPEG conversions and manual duplicate names retain every output in ZIPs, including when a natural numbered-suffix name exists.
- Checked export controls remain reachable in the image panel on mobile without replacing the fixed primary action bar. Checkbox keyboard activation is separate from the preview row. Japanese and English help explain checked export.
- Export dialog provides the documented web/developer outputs.
- `assets/favicon.svg`, the embedded favicon and the header app icon use the same visual design.

## Release distribution

- A push to `main` that increases the app version relative to the tip before the push publishes a GitHub Release after repository checks pass.
- Release tag `vX.Y.Z` identifies the pushed commit. The downloadable assets are named `index.html` and `index.self-extract.html`. The self-extracting file contains the same app and requires gzip `DecompressionStream` support.
- The Pages workflow builds and deploys the `dist/` directory independently of release version changes.

## Mobile footer and Help build information

- Hide the informational page footer at the existing 720px smartphone breakpoint. Preserve functional bottom controls.
- Keep the existing build information as the final item of Help’s independently scrollable body, with its unique IDs and localization unchanged. Build information remains available at every width.
- Use “Fully local processing” for the exact 完全ローカル処理 label; preserve detailed privacy explanations.
- Focused PR Chromium checks cover the official generated variants in JA/EN at desktop, breakpoint, narrow and short sizes, the Start description, desktop-only badge, final Help reachability, dismissal, errors and runtime network. Keep four screenshots plus failure evidence. These layout checks are not a new full main-flow audit.
