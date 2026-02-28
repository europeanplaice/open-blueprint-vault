param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,
  [switch]$RestoreEnv,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Force) {
  throw "Restore rewrites current data. Re-run with -Force to continue."
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$backupDirFull = if ([System.IO.Path]::IsPathRooted($BackupDir)) { $BackupDir } else { Join-Path $RepoRoot $BackupDir }
if (-not (Test-Path -Path $backupDirFull -PathType Container)) {
  throw "Backup directory not found: $backupDirFull"
}

$dbDump = Join-Path $backupDirFull "db.dump"
$minioArchive = Join-Path $backupDirFull "minio_data.tar.gz"
$envBackup = Join-Path $backupDirFull ".env"

foreach ($required in @($dbDump, $minioArchive)) {
  if (-not (Test-Path $required)) {
    throw "Required backup file is missing: $required"
  }
}

if ($RestoreEnv -and -not (Test-Path $envBackup)) {
  throw ".env backup file not found: $envBackup"
}

$stoppedAppServices = $false

try {
  Write-Host "Stopping frontend/backend..."
  docker compose stop frontend backend | Out-Host
  $stoppedAppServices = $true

  Write-Host "Restoring PostgreSQL..."
  docker compose cp $dbDump "db:/tmp/open-blueprint-vault.dump" | Out-Host
  docker compose exec -T db sh -lc "dropdb -U user --if-exists open_blueprint_vault && createdb -U user open_blueprint_vault && pg_restore -U user -d open_blueprint_vault /tmp/open-blueprint-vault.dump" | Out-Host
  docker compose exec -T db sh -lc "rm -f /tmp/open-blueprint-vault.dump" | Out-Host

  Write-Host "Restoring MinIO data..."
  docker compose cp $minioArchive "minio:/tmp/minio_data.tar.gz" | Out-Host
  docker compose exec -T minio sh -lc "rm -rf /data/* && tar xzf /tmp/minio_data.tar.gz -C /data" | Out-Host
  docker compose exec -T minio sh -lc "rm -f /tmp/minio_data.tar.gz" | Out-Host

  if ($RestoreEnv) {
    Write-Host "Restoring .env..."
    Copy-Item -Path $envBackup -Destination (Join-Path $RepoRoot ".env") -Force
  }

  Write-Host ""
  Write-Host "Restore completed from:"
  Write-Host "  $backupDirFull"
}
finally {
  if ($stoppedAppServices) {
    Write-Host "Starting frontend/backend..."
    docker compose start backend frontend | Out-Host
  }
}
