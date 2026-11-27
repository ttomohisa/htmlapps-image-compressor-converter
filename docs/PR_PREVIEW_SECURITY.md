# PR preview security

The [PR build](../.github/workflows/preview.yml) runs for same-repository pull requests into `main` with a read-only token, no Cloudflare secrets and no persisted checkout credentials. It builds the app and runs the Chromium conversion and mobile Help tests against local HTML. It uploads the generated site and the mobile Help evidence as separate artifacts.

The [deployment workflow](../.github/workflows/preview-deploy.yml) checks the successful source run, repository, open PR, current head SHA and named site artifact. An isolated job validates the archive and deploys its static files with trusted Wrangler configuration when Cloudflare credentials are configured. The deployment code comes from the trusted workflow revision.

After deployment, a separate read-only job checks that the public preview URL returns HTTP 200. A reporting job attaches this result to the PR commit under the name `PR preview browser tests`. Changes to the trusted deployment configuration take effect after merge into the default branch. Closing the PR triggers the [cleanup workflow](../.github/workflows/preview-cleanup.yml), which uses the trusted revision to delete its preview.
