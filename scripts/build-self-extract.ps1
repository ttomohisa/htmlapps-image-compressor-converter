param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference="Stop";$bytes=[IO.File]::ReadAllBytes((Resolve-Path $InputPath));$mem=New-Object IO.MemoryStream;$gz=New-Object IO.Compression.GZipStream($mem,[IO.Compression.CompressionMode]::Compress,$true);$gz.Write($bytes,0,$bytes.Length);$gz.Dispose();$payload=[Convert]::ToBase64String($mem.ToArray());$mem.Dispose()
$html=@"
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image Compressor & Converter</title></head><body><noscript>JavaScript is required.</noscript><script>(async()=>{const b=atob('$payload'),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);if(!('DecompressionStream'in window)){document.body.textContent='This self-extracting file requires DecompressionStream support. Use dist/index.html instead.';return}const s=new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip')),h=await new Response(s).text();document.open();document.write(h);document.close()})().catch(e=>document.body.textContent='Failed to open Image Compressor & Converter: '+e.message);</script></body></html>
"@
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath)|Out-Null;[IO.File]::WriteAllText($OutputPath,$html,(New-Object Text.UTF8Encoding($false)))
function Get-Sha256Hex([string]$Path){
  $resolved=(Resolve-Path -LiteralPath $Path).Path
  $stream=[IO.File]::OpenRead($resolved)
  try{
    $sha=[Security.Cryptography.SHA256]::Create()
    try{$hash=$sha.ComputeHash($stream)}finally{if($sha){$sha.Dispose()}}
  }finally{if($stream){$stream.Dispose()}}
  return ([BitConverter]::ToString($hash)).Replace('-','').ToLowerInvariant()
}
$man=[ordered]@{schemaVersion=1;source=[IO.Path]::GetFileName($InputPath);output=[IO.Path]::GetFileName($OutputPath);compression='gzip';sourceBytes=$bytes.Length;outputBytes=(Get-Item $OutputPath).Length;sourceSha256=(Get-Sha256Hex $InputPath);outputSha256=(Get-Sha256Hex $OutputPath)}
[IO.File]::WriteAllText((Join-Path (Split-Path -Parent $OutputPath) 'self-extract-manifest.json'),($man|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false)))
