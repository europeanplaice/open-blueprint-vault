# Manual Backup Runbook

This project stores persistent data in two Docker volumes:

- `postgres_data` (PostgreSQL metadata)
- `minio_data` (PDF files in MinIO)

Backups must be stored outside Docker volumes (for example `./backups/...` and an external location).

## Scope

Required:
- PostgreSQL dump (`db.dump`)
- MinIO object data archive (`minio_data.tar.gz`)
- `.env` copy (if present)

## Scripts

- Windows (PowerShell): `scripts/manual-backup.ps1`
- macOS/Linux (POSIX shell): `scripts/manual-backup.sh`
- Windows (PowerShell): `scripts/manual-restore.ps1`
- macOS/Linux (POSIX shell): `scripts/manual-restore.sh`

Both scripts perform the same flow:

1. Stop `frontend` and `backend`
2. Backup DB and MinIO
3. Copy `.env` (if present)
4. Generate `SHA256SUMS.txt`
5. Start `backend` and `frontend`

## Usage

### Windows

```powershell
./scripts/manual-backup.ps1
```

Set backup root directory:

```powershell
./scripts/manual-backup.ps1 -BackupRoot "D:\obv-backups"
```

### macOS/Linux

```bash
chmod +x ./scripts/manual-backup.sh
./scripts/manual-backup.sh
```

Set backup root directory:

```bash
./scripts/manual-backup.sh /mnt/backups/open-blueprint-vault
```

## Restore Usage

Restore is destructive, so an explicit force flag is required.

### Windows

```powershell
./scripts/manual-restore.ps1 -BackupDir "backups/20260228-083000" -Force
```

Restore `.env` too:

```powershell
./scripts/manual-restore.ps1 -BackupDir "backups/20260228-083000" -RestoreEnv -Force
```

### macOS/Linux

```bash
chmod +x ./scripts/manual-restore.sh
./scripts/manual-restore.sh backups/20260228-083000 --force
```

Restore `.env` too:

```bash
./scripts/manual-restore.sh backups/20260228-083000 --restore-env --force
```

## Output layout

Each run creates a timestamped directory:

```text
backups/
  20260228-083000/
    db.dump
    minio_data.tar.gz
    .env
    SHA256SUMS.txt
```

## Minimum operation policy

1. Run at least weekly and before major changes.
2. Keep at least 4 recent backup sets.
3. Run a restore drill monthly in a separate environment.

## Restore outline

1. Stop `frontend` and `backend`.
2. Restore PostgreSQL from `db.dump` (`pg_restore` or `psql` depending on dump format).
3. Restore MinIO data archive to `/data`.
4. Start services and validate upload/search/metadata update.

## Script Tests

PowerShell backup/restore scripts are covered by Jest tests with a mocked `docker` command:

```bash
cd backend
npm test -- manual-scripts.spec.ts
```

Optional integration-style execution tests are disabled by default and can be enabled with:

```bash
cd backend
RUN_MANUAL_SCRIPT_INTEGRATION=1 npm test -- manual-scripts.spec.ts --runInBand
```
