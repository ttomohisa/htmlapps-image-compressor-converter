# Contributing

Please keep the project single-file at release time and local-first.

Before opening a pull request:

1. Update `APP_SPEC.md` when behavior changes.
2. Keep runtime network access disabled.
3. Do not add a third-party dependency unless it can be pinned and embedded at build time.
4. Test desktop and smartphone widths, including 360 px.
5. With Node.js 20+ available, run `scripts/check-repository.ps1` on Windows PowerShell. It runs the removal and checked-export regressions, builds both standalone variants, refreshes the tracked root HTML, verifies artifact parity, and runs the behavior tests against all three release artifacts. The dependency-free adapters use tiny synthetic Blobs; native browser layout, focus, file picking, downloads and real image codecs require separate manual verification.
6. Update both Japanese and English UI copy when user-facing behavior changes.
