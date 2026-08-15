# Image Compressor & Converter

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-image-toolkit/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-image-toolkit/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-image-toolkit/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML image compressor and converter for PNG, JPEG and WebP. Compress, resize, convert, compare and export images without uploading the selected files to a server.

## 🚀 Live demo

### [Open Image Compressor & Converter on GitHub Pages](https://ttomohisa.github.io/htmlapps-image-toolkit/)

GitHub Pages delivers the initial HTML. After it loads, image decoding, resizing, compression, format conversion, comparison, Base64 generation and export are processed locally on your device. Images you select are not uploaded by the app.

[![Image Compressor & Converter screenshot](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-image-toolkit/)

The mobile layout is designed to feel closer to a native app, with primary actions fixed near the bottom of the screen and conversion settings shown as a safe-area-aware bottom sheet.

![Mobile UI](assets/screenshot-mobile.png)

## Features

- Read and export PNG, JPEG and WebP
- Auto format recommendation based on the source image
- Resize by maximum width / height while preserving aspect ratio
- JPEG / WebP quality control
- Target-file-size mode that searches for a suitable JPEG / WebP quality
- Batch conversion for multiple images
- Folder-aware ZIP export that preserves relative paths
- Before / After slider for source and converted images
- Amplified pixel-difference view for subtle compression changes
- JPEG / PNG / WebP format and file-size comparison
- Large preview with 100–400% zoom and pan / pinch gestures
- Editable output filenames with automatic extension handling
- Base64, HTML, CSS, Markdown and `<picture>` snippet generation
- Web-assets ZIP with WebP plus JPEG / PNG fallback and `snippet.html`
- Metadata removal through Canvas re-encoding
- Japanese and English UI in the same HTML
- Desktop **Settings → Convert → Save** workflow
- Native-app-like mobile bottom action bar and settings sheet
- No runtime network access

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-image-toolkit/). No installation or account is required.

### Use the standalone HTML

1. Download [`dist/index.html`](https://github.com/ttomohisa/htmlapps-image-toolkit/blob/main/dist/index.html) from this repository.
2. Open it in a current Chromium-based browser, Firefox, or Safari.
3. Add one or more images and process them entirely in the browser.

### Use it fully offline (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows.
3. Copy the generated `dist/index.html` wherever you need it.
4. Open that single file later without an internet connection.

The repository also generates `dist/index.self-extract.html`, a smaller self-extracting HTML variant.

Python, Node.js and a local web server are not required for the normal build. The builder uses Windows PowerShell and the built-in `tar.exe` infrastructure from `htmlapps-template`.

## Usage

1. Add one or more PNG, JPEG or WebP images.
2. Choose **Auto** or select an output format manually.
3. Adjust dimensions, quality or target file size when needed.
4. Select **Convert**.
5. Review the output size and Before / After preview.
6. Use **Highlight differences** when compression changes are too subtle to see normally.
7. Edit the output filename if needed.
8. Select **Save** for the current image, or export converted images together as a ZIP.

### Before / After comparison

The normal comparison places the original and converted image at the same coordinates and reveals them with a draggable divider. With high-quality compression, visible differences can be extremely small even when the file-size reduction is substantial.

Use **Highlight differences** to generate an amplified pixel-difference view when you want to verify where the converted image differs from the source.

### Developer exports

For web-development workflows, the app can generate:

- Base64 data URI
- `<img>` HTML
- CSS `background-image`
- Markdown image syntax
- `<picture>` markup with a fallback image
- A ready-to-download web-assets ZIP

## Publish with GitHub Pages

The repository includes a workflow that builds the standalone HTML, verifies its offline/runtime-network constraints and deploys `dist/` to GitHub Pages.

1. Push the repository to GitHub as `htmlapps-image-toolkit`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run the Pages deployment workflow from the Actions tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/htmlapps-image-toolkit/`.

If GitHub Pages has not been enabled yet, the workflow keeps the successful build result and skips deployment with setup guidance instead of failing at `configure-pages`.

## Development and build layout

```text
.
├─ src/index.template.html       # Application source template
├─ app.config.json               # App name, version and build settings
├─ dependencies.json             # Embedded dependency definition
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # Standalone HTML builder
├─ scripts/
│  ├─ check-repository.ps1       # Repository/build verification
│  ├─ verify-standalone.ps1      # Standalone/runtime-network checks
│  └─ build-self-extract.ps1     # Self-extracting HTML builder
├─ dist/
│  ├─ index.html                 # Main release artifact
│  └─ index.self-extract.html    # Self-extracting variant
└─ .github/workflows/
   ├─ build-standalone.yml        # Build validation
   └─ deploy-pages.yml            # GitHub Pages deployment
```

Build locally with:

```bat
build-standalone.bat
```

The build process generates the standalone HTML and verifies that no unresolved build placeholders or prohibited runtime-network references remain.

## Privacy and runtime network protection

The generated HTML is designed for local-first processing:

- Image bytes remain in browser memory while you work.
- Selected images are not uploaded by the app.
- The runtime Content Security Policy includes `connect-src 'none'`.
- The app has no analytics, telemetry, login or cloud storage.
- Image data is not written to LocalStorage; only language and conversion settings are persisted.
- Downloads occur only after a user action.

The GitHub Pages version requires the initial HTML request. After loading, image processing runs locally. To use the app with the network completely disconnected, open the generated `dist/index.html` directly.

## Limitations

- PNG output is lossless, so the JPEG / WebP quality slider and target-file-size search do not apply to PNG.
- WebP encoding support depends on the browser's Canvas implementation.
- Exact compressed size can differ between browsers because encoding is browser-provided.
- Very large images or large batches can consume substantial device memory.
- Metadata is intentionally removed when an image is re-encoded through Canvas.
- Animated images are not preserved as animation by the current image-processing flow.

## Dependencies

The current image-processing runtime uses browser APIs such as Canvas, Blob and FileReader and does not require a third-party image-processing library at runtime.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and licensing notes.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
