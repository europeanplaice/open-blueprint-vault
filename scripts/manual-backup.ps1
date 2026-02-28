param(
  [string]$BackupRoot = "backups"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRootFull = if ([System.IO.Path]::IsPathRooted($BackupRoot)) { $BackupRoot } else { Join-Path $RepoRoot $BackupRoot }
$backupDir = Join-Path $backupRootFull $timestamp
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stoppedAppServices = $false

try {
  Write-Host "Stopping frontend/backend..."
  docker compose stop frontend backend | Out-Host
  $stoppedAppServices = $true

  Write-Host "Backing up PostgreSQL..."
  docker compose exec -T db sh -lc "pg_dump -U user -d open_blueprint_vault -Fc > /tmp/open-blueprint-vault.dump" | Out-Host
  docker compose cp db:/tmp/open-blueprint-vault.dump (Join-Path $backupDir "db.dump") | Out-Host
  docker compose exec -T db sh -lc "rm -f /tmp/open-blueprint-vault.dump" | Out-Host

  Write-Host "Backing up MinIO data..."
  docker compose exec -T minio sh -lc "tar czf /tmp/minio_data.tar.gz -C /data ." | Out-Host
  docker compose cp minio:/tmp/minio_data.tar.gz (Join-Path $backupDir "minio_data.tar.gz") | Out-Host
  docker compose exec -T minio sh -lc "rm -f /tmp/minio_data.tar.gz" | Out-Host

  if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination (Join-Path $backupDir ".env")
  }

  $hashFile = Join-Path $backupDir "SHA256SUMS.txt"
  $targets = @(
    (Join-Path $backupDir "db.dump"),
    (Join-Path $backupDir "minio_data.tar.gz"),
    (Join-Path $backupDir ".env")
  ) | Where-Object { Test-Path $_ }

  $lines = foreach ($file in $targets) {
    $h = Get-FileHash -Path $file -Algorithm SHA256
    "{0} *{1}" -f $h.Hash.ToLowerInvariant(), (Split-Path $file -Leaf)
  }
  Set-Content -Path $hashFile -Value $lines -Encoding utf8

  Write-Host ""
  Write-Host "Backup completed:"
  Write-Host "  $backupDir"
}
finally {
  if ($stoppedAppServices) {
    Write-Host "Starting frontend/backend..."
    docker compose start backend frontend | Out-Host
  }
}
