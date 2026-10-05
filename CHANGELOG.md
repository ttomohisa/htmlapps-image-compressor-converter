# Changelog

## Unreleased

- Added per-image ZIP inclusion checkboxes, All / None, checked-output counts and a dedicated Save checked ZIP action, independent of preview and removal selection.
- Fixed duplicate ZIP paths from same-stem conversions or filename edits; deterministic numbered suffixes preserve every output and reserve intentionally named suffixes.
- Added source/root/readable/self-extract regression coverage for checked exports, output snapshots and exact ZIP entry bytes.

- Added confirmed removal of the selected image while preserving the rest of the batch and its outputs.
- Prevented delayed preview, comparison and export snippets from restoring removed or previously selected images.
- Added dependency-free regression tests for removal, resource cleanup, selection, filenames and ZIP content.

## 1.1.0 - 2026-08-25

- Redesigned the app into a purpose-first Start screen and three-column Workbench.
- Added Smart Optimize with local visual-difference scoring.
- Target-size mode now searches both quality and resolution.
- Added purpose-based presets, desktop clipboard paste, batch savings, and source retention when conversion would make the file larger.
- Added a clearer Before / After divider, amplified pixel-difference view, and 100–400% large preview with pan/pinch gestures.
- Added editable output filenames and a clearer Settings → Optimize → Save workflow.
- Moved Web / Developer tools into a dedicated Export dialog.
- Reworked the app icon, replaced purpose emoji with SVG icons, and fixed the help icon dot.
- Improved mobile behavior: settings close after conversion, and the fixed action bar uses “Smart変換”.
- Updated privacy wording to “Fully local processing” / “完全ローカル処理”.
- Refined the Start screen copy and device-specific image input guidance.
- Improved Windows PowerShell build compatibility by removing the `Get-FileHash` dependency from self-extract generation.

## 1.0 - 2026-08-15

- Initial release with conversion, resizing, quality/target-size controls, batch ZIP, format comparison, Base64/snippets and mobile app-like UI.
