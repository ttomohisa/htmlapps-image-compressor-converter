$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
& node --test (Join-Path $Root "tests/remove-selected.test.mjs")
if ($LASTEXITCODE -ne 0) { throw "Image-removal regression tests failed." }
& (Join-Path $Root "build-standalone.ps1")
Write-Host "[Image Compressor & Converter] Repository check passed." -ForegroundColor Green
