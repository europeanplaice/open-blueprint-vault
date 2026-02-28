#!/usr/bin/env sh
set -eu

BACKUP_ROOT="backups"

POSITIONAL_SET=0
for arg in "$@"; do
  if [ "${arg#-}" != "$arg" ]; then
    echo "Unknown option: $arg" >&2
    exit 1
  elif [ "$POSITIONAL_SET" -eq 0 ]; then
    BACKUP_ROOT="$arg"
    POSITIONAL_SET=1
  else
    echo "Too many positional arguments. Usage: $0 [BACKUP_ROOT]" >&2
    exit 1
  fi
done

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

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

echo "Backing up PostgreSQL..."
docker compose exec -T db sh -lc "pg_dump -U user -d open_blueprint_vault -Fc > /tmp/open-blueprint-vault.dump"
docker compose cp db:/tmp/open-blueprint-vault.dump "$BACKUP_DIR/db.dump"
docker compose exec -T db sh -lc "rm -f /tmp/open-blueprint-vault.dump"

echo "Backing up MinIO data..."
docker compose exec -T minio sh -lc "tar czf /tmp/minio_data.tar.gz -C /data ."
docker compose cp minio:/tmp/minio_data.tar.gz "$BACKUP_DIR/minio_data.tar.gz"
docker compose exec -T minio sh -lc "rm -f /tmp/minio_data.tar.gz"

if [ -f ".env" ]; then
  cp .env "$BACKUP_DIR/.env"
fi

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1"
  else
    echo "sha256 command not found (sha256sum/shasum)." >&2
    return 1
  fi
}

(
  cd "$BACKUP_DIR"
  : > SHA256SUMS.txt
  for name in db.dump minio_data.tar.gz .env; do
    if [ -f "$name" ]; then
      hash_file "$name" >> SHA256SUMS.txt
    fi
  done
)

restart_services
trap - EXIT

echo ""
echo "Backup completed:"
echo "  $BACKUP_DIR"
