$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Tests = @((Join-Path $Root "tests/remove-selected.test.mjs"), (Join-Path $Root "tests/checked-export.test.mjs"))
$PreviousSource = $env:IMAGE_SOURCE
try {
    Remove-Item Env:IMAGE_SOURCE -ErrorAction SilentlyContinue
    & node --test @Tests
    if ($LASTEXITCODE -ne 0) { throw "Image source regression tests failed." }
    & (Join-Path $Root "build-standalone.ps1")
    Copy-Item -LiteralPath (Join-Path $Root "dist/index.html") -Destination (Join-Path $Root "image-compressor-converter.html")
    & node --test (Join-Path $Root "tests/artifacts.test.mjs")
    if ($LASTEXITCODE -ne 0) { throw "Image release artifact parity failed." }
    foreach ($Artifact in @("image-compressor-converter.html", "dist/index.html", "dist/index.self-extract.html")) {
        $env:IMAGE_SOURCE = (Join-Path $Root $Artifact)
        & node --test @Tests
        if ($LASTEXITCODE -ne 0) { throw "Image regression tests failed for $Artifact." }
    }
} finally {
    if ($null -eq $PreviousSource) { Remove-Item Env:IMAGE_SOURCE -ErrorAction SilentlyContinue }
    else { $env:IMAGE_SOURCE = $PreviousSource }
}
Write-Host "[Image Compressor & Converter] Repository check passed." -ForegroundColor Green
