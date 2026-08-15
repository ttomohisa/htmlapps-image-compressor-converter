# Security

Image Compressor & Converter is designed to run locally without runtime network access.

Please report security issues privately through GitHub's security reporting features when available. Do not include sensitive image data in a public issue.

The release HTML uses a CSP with `connect-src 'none'`. Any change that introduces network access, telemetry, external scripts or external styles is considered a security-sensitive change.
