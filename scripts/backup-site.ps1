param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$SiteDir = "site",
  [string]$OutDir = "backups",
  [int]$Keep = 20,
  [switch]$KeepStaging,
  [switch]$Silent
)

$ErrorActionPreference = "Stop"

$sitePath = Join-Path $ProjectRoot $SiteDir
if (!(Test-Path $sitePath)) {
  throw "Cartella site non trovata: $sitePath"
}

$outPath = Join-Path $ProjectRoot $OutDir
New-Item -ItemType Directory -Force -Path $outPath | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "site-$stamp.zip"
$zipPath = Join-Path $outPath $zipName

$staging = Join-Path $outPath ("_staging-site-" + $stamp)
New-Item -ItemType Directory -Force -Path $staging | Out-Null

if (!$Silent) {
  Write-Host "Backup in corso..." -ForegroundColor Cyan
  Write-Host " - Sorgente: $sitePath"
  Write-Host " - Destinazione: $zipPath"
}

try {
  # Copia in staging (riduce i problemi con file momentaneamente in uso)
  $null = & robocopy $sitePath $staging /MIR /R:5 /W:1 /FFT /COPY:DAT /DCOPY:DAT /NFL /NDL /NP /NJH /NJS
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy ha fallito (exit code $LASTEXITCODE)."
  }

  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
}
finally {
  if (!$KeepStaging) {
    Remove-Item -Recurse -Force -Path $staging -ErrorAction SilentlyContinue
  }
}

$latestZip = Join-Path $outPath "latest-site.zip"
Copy-Item -Path $zipPath -Destination $latestZip -Force

$meta = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  source    = $sitePath
  zip       = $zipPath
}
$metaPath = Join-Path $outPath "latest-site.json"
$meta | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -Path $metaPath

# Keep only last N backups
$items = Get-ChildItem -Path $outPath -Filter "site-*.zip" | Sort-Object LastWriteTime -Descending
if ($Keep -gt 0 -and $items.Count -gt $Keep) {
  $toDelete = $items | Select-Object -Skip $Keep
  foreach ($f in $toDelete) {
    Remove-Item -Force -Path $f.FullName
  }
}

if (!$Silent) {
  Write-Host "Backup completato." -ForegroundColor Green
}
