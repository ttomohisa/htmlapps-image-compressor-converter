param([switch]$SkipSelfExtract,[string]$OutputPath="")
$ErrorActionPreference="Stop";Set-StrictMode -Version Latest
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path;$Template=Join-Path $Root "src\index.template.html";$ConfigPath=Join-Path $Root "app.config.json"
$config=Get-Content -Raw -Encoding UTF8 $ConfigPath|ConvertFrom-Json
if([string]::IsNullOrWhiteSpace($OutputPath)){$OutputPath=Join-Path $Root ([string]$config.build.output)}elseif(-not [IO.Path]::IsPathRooted($OutputPath)){$OutputPath=Join-Path $Root $OutputPath}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath)|Out-Null
$manifest=[ordered]@{schemaVersion=1;builder="htmlapps-template-compatible/1.0";generatedAtUtc=[DateTime]::UtcNow.ToString("o");app=[ordered]@{name=[string]$config.name;slug=[string]$config.slug;version=[string]$config.version};dependencies=@()}
function SafeJson([object]$v,[int]$d=20){return($v|ConvertTo-Json -Compress -Depth $d).Replace("<","\u003c").Replace(">","\u003e").Replace("&","\u0026")}
$html=[IO.File]::ReadAllText($Template,[Text.Encoding]::UTF8)
$repl=[ordered]@{"__APP_CONFIG_JSON__"=SafeJson $config 20;"__BUILD_MANIFEST_JSON__"=SafeJson $manifest 20;"__EMBEDDED_ASSET_BUNDLE_BASE64__"=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"schemaVersion":1,"dependencies":{}}'))}
foreach($e in $repl.GetEnumerator()){$count=([regex]::Matches($html,[regex]::Escape($e.Key))).Count;if($count-ne 1){throw "Template placeholder $($e.Key) must occur exactly once; found $count."};$html=$html.Replace($e.Key,[string]$e.Value)}
[IO.File]::WriteAllText($OutputPath,$html,(New-Object Text.UTF8Encoding($false)));$dir=Split-Path -Parent $OutputPath
[IO.File]::WriteAllText((Join-Path $dir "dependency-manifest.json"),($manifest|ConvertTo-Json -Depth 20),(New-Object Text.UTF8Encoding($false)));[IO.File]::WriteAllText((Join-Path $dir ".nojekyll"),"",(New-Object Text.UTF8Encoding($false)))
& (Join-Path $Root "scripts\verify-standalone.ps1") -Path $OutputPath
if(-not $SkipSelfExtract -and [bool]$config.build.selfExtract.enabled){& (Join-Path $Root "scripts\build-self-extract.ps1") -InputPath $OutputPath -OutputPath (Join-Path $Root ([string]$config.build.selfExtract.output))}
Write-Host "[Image Compressor & Converter] Generated: $OutputPath" -ForegroundColor Green
