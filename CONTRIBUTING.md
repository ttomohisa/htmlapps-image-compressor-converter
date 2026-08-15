# Contributing

Please keep the project single-file at release time and local-first.

Before opening a pull request:

1. Update `APP_SPEC.md` when behavior changes.
2. Keep runtime network access disabled.
3. Do not add a third-party dependency unless it can be pinned and embedded at build time.
4. Test desktop and smartphone widths, including 360 px.
5. Run `scripts/check-repository.ps1` on Windows PowerShell.
6. Update both Japanese and English UI copy when user-facing behavior changes.
