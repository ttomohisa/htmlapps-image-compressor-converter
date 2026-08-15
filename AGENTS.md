# AGENTS.md

## Product rules

- Follow `APP_SPEC.md` as the product contract.
- Keep the release artifact fully standalone.
- Preserve `connect-src 'none'` and do not add runtime network requests.
- Keep the UI light-only and bilingual (Japanese / English).
- Treat smartphone UX as a first-class surface. Primary actions must remain reachable near the bottom of the screen.
- Do not persist image bytes. Only non-sensitive settings may use LocalStorage.
- Use the in-app confirmation dialog instead of `window.confirm()` for destructive actions.
- Update help text together with behavior changes.

## Build

Run `scripts/check-repository.ps1` on Windows. It builds and verifies `dist/index.html` and the self-extracting variant.
