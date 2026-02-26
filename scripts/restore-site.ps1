param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$SiteDir = "site",
  [string]$BackupZip = "",
  [switch]$NoBackupCurrent,
  [switch]$Silent
)

$ErrorActionPreference = "Stop"

$sitePath = Join-Path $ProjectRoot $SiteDir
if (!(Test-Path $sitePath)) {
  throw "Cartella site non trovata: $sitePath"
}

$backupsDir = Join-Path $ProjectRoot "backups"
if ([string]::IsNullOrWhiteSpace($BackupZip)) {
  $BackupZip = Join-Path $backupsDir "latest-site.zip"
}

if (!(Test-Path $BackupZip)) {
  throw "Backup zip non trovato: $BackupZip"
}

if (!$NoBackupCurrent) {
  & (Join-Path $PSScriptRoot "backup-site.ps1") -ProjectRoot $ProjectRoot -SiteDir $SiteDir -OutDir "backups" -Silent:$Silent | Out-Null
}

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("ffo-site-restore-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null

try {
  if (!$Silent) {
    Write-Host "Ripristino in corso..." -ForegroundColor Cyan
    Write-Host " - Backup: $BackupZip"
    Write-Host " - Target: $sitePath"
  }

  Expand-Archive -Path $BackupZip -DestinationPath $temp -Force

  # Mirror contenuto estratto -> site (incl. delete)
  $rc = & robocopy $temp $sitePath /MIR /R:1 /W:1 /FFT /NFL /NDL /NP /NJH /NJS
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy ha fallito (exit code $LASTEXITCODE)."
  }

  if (!$Silent) {
    Write-Host "Ripristino completato." -ForegroundColor Green
  }
}
finally {
  Remove-Item -Recurse -Force -Path $temp -ErrorAction SilentlyContinue
}
