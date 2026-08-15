param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference="Stop";$html=[IO.File]::ReadAllText((Resolve-Path $Path),[Text.Encoding]::UTF8)
foreach($p in @('__APP_CONFIG_JSON__','__BUILD_MANIFEST_JSON__','__EMBEDDED_ASSET_BUNDLE_BASE64__')){if($html.Contains($p)){throw "Unresolved placeholder: $p"}}
if($html-notmatch "connect-src\s+'none'"){throw "CSP must contain connect-src 'none'."}
foreach($p in @('<script[^>]+src\s*=\s*["'']https?://','<link[^>]+href\s*=\s*["'']https?://','<img[^>]+src\s*=\s*["'']https?://','<iframe[^>]+src\s*=\s*["'']https?://')){if($html-match $p){throw "External runtime asset detected: $p"}}
Write-Host "[Image Compressor & Converter] Standalone verification passed." -ForegroundColor Green
