#!/usr/bin/env sh
set -eu

BACKUP_DIR=""
RESTORE_ENV=0
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --restore-env)
      RESTORE_ENV=1
      ;;
    --force)
      FORCE=1
      ;;
    -*)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 BACKUP_DIR [--restore-env] [--force]" >&2
      exit 1
      ;;
    *)
      if [ -z "$BACKUP_DIR" ]; then
        BACKUP_DIR="$arg"
      else
        echo "Too many positional arguments." >&2
        echo "Usage: $0 BACKUP_DIR [--restore-env] [--force]" >&2
        exit 1
      fi
      ;;
  esac
done

if [ -z "$BACKUP_DIR" ]; then
  echo "BACKUP_DIR is required." >&2
  echo "Usage: $0 BACKUP_DIR [--restore-env] [--force]" >&2
  exit 1
fi

if [ "$FORCE" -ne 1 ]; then
  echo "Restore rewrites current data. Re-run with --force to continue." >&2
  exit 1
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

case "$BACKUP_DIR" in
  /*) BACKUP_DIR_FULL="$BACKUP_DIR" ;;
  *) BACKUP_DIR_FULL="$REPO_ROOT/$BACKUP_DIR" ;;
esac

DB_DUMP="$BACKUP_DIR_FULL/db.dump"
MINIO_ARCHIVE="$BACKUP_DIR_FULL/minio_data.tar.gz"
ENV_BACKUP="$BACKUP_DIR_FULL/.env"

if [ ! -d "$BACKUP_DIR_FULL" ]; then
  echo "Backup directory not found: $BACKUP_DIR_FULL" >&2
  exit 1
fi

if [ ! -f "$DB_DUMP" ]; then
  echo "Required backup file is missing: $DB_DUMP" >&2
  exit 1
fi

if [ ! -f "$MINIO_ARCHIVE" ]; then
  echo "Required backup file is missing: $MINIO_ARCHIVE" >&2
  exit 1
fi

if [ "$RESTORE_ENV" -eq 1 ] && [ ! -f "$ENV_BACKUP" ]; then
  echo ".env backup file not found: $ENV_BACKUP" >&2
  exit 1
fi

STOPPED=0
restart_services() {
  if [ "$STOPPED" -eq 1 ]; then
    echo "Starting frontend/backend..."
    docker compose start backend frontend >/dev/null
    STOPPED=0
  fi
}
trap restart_services EXIT

echo "Stopping frontend/backend..."
docker compose stop frontend backend >/dev/null
STOPPED=1

echo "Restoring PostgreSQL..."
docker compose cp "$DB_DUMP" "db:/tmp/open-blueprint-vault.dump"
docker compose exec -T db sh -lc "dropdb -U user --if-exists open_blueprint_vault && createdb -U user open_blueprint_vault && pg_restore -U user -d open_blueprint_vault /tmp/open-blueprint-vault.dump"
docker compose exec -T db sh -lc "rm -f /tmp/open-blueprint-vault.dump"

echo "Restoring MinIO data..."
docker compose cp "$MINIO_ARCHIVE" "minio:/tmp/minio_data.tar.gz"
docker compose exec -T minio sh -lc "rm -rf /data/* && tar xzf /tmp/minio_data.tar.gz -C /data"
docker compose exec -T minio sh -lc "rm -f /tmp/minio_data.tar.gz"

if [ "$RESTORE_ENV" -eq 1 ]; then
  echo "Restoring .env..."
  cp "$ENV_BACKUP" "$REPO_ROOT/.env"
fi

restart_services
trap - EXIT

echo ""
echo "Restore completed from:"
echo "  $BACKUP_DIR_FULL"
