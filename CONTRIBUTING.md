# Contributing

Edit the app in `src/index.template.html`. Keep release files self-contained and preserve the runtime CSP (`connect-src 'none'`). Any new runtime dependency must be pinned and embedded at build time.

## Before opening a pull request

1. Update [the product specification](APP_SPEC.md) when behavior changes. Keep the UI, Help and affected README instructions in sync in Japanese and English.
2. From the repository root on Windows, run `.\scripts\check-repository.ps1` in PowerShell with Node.js 20+ on your path. It builds both standalone files, refreshes `image-compressor-converter.html`, compares the readable and unpacked bytes, and runs source and artifact regressions, Help-copy checks and a local release simulation.
3. Include the refreshed tracked artifacts with source or version changes. For changes to layout, input or export, exercise the relevant flow with a real image at desktop and smartphone widths, including 360 px. [Offline verification](VERIFY_OFFLINE.md)

On same-repository PRs to `main`, the preview build also runs Chromium checks for conversion, downloads and mobile Help against local generated HTML. A separate workflow deploys the static preview and checks its public URL. [Preview workflow details](docs/PR_PREVIEW_SECURITY.md)

## Publish a version

1. Increase `version` in `app.config.json` to a stable `X.Y.Z`. Add a `## X.Y.Z - YYYY-MM-DD` entry to [the changelog](CHANGELOG.md). Its body becomes the release notes. Update the version in [the product specification](APP_SPEC.md) and regenerate the tracked HTML with the repository check.
2. Merge the change into `main`. The release workflow compares the version at the tip before the push with the version at the newly pushed commit. An increase triggers verification and publication of a GitHub Release tagged `vX.Y.Z` at that commit.
3. Verify the release tag and both downloadable assets, `index.html` and `index.self-extract.html`. The bilingual README links use these stable asset names. [Release history](https://github.com/ttomohisa/htmlapps-image-compressor-converter/releases)

Version-bump PRs build and stage both files for review. On `main`, publication waits until both uploaded files pass SHA-256 verification. If an upload is interrupted, rerun the failed workflow to finish the draft. Pages deployment runs separately on pushes to `main` and on manual dispatch.
