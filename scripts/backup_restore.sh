#!/bin/sh

set -eu
umask 077

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
mode=${1:-}
target=${2:-}
recovery_project=${VITALINK_RECOVERY_PROJECT:-vitallink-recovery-issue-65}
backup_compose_file=${VITALINK_BACKUP_COMPOSE_FILE:-$root_dir/compose.yaml}
backup_project=${VITALINK_BACKUP_PROJECT:-}
backup_postgres_service=${VITALINK_BACKUP_POSTGRES_SERVICE:-postgres}
backup_object_service=${VITALINK_BACKUP_OBJECT_SERVICE:-backup-tools}
backup_api_service=${VITALINK_BACKUP_API_SERVICE:-api}
backup_object_mode=${VITALINK_BACKUP_OBJECT_MODE:-run}

usage() {
  echo "usage: scripts/backup_restore.sh backup|verify DIRECTORY" >&2
  exit 64
}

source_compose() {
  if [ -n "$backup_project" ]; then
    COMPOSE_PROJECT_NAME=$backup_project docker compose -f "$backup_compose_file" "$@"
  else
    docker compose -f "$backup_compose_file" "$@"
  fi
}

recovery_compose() {
  COMPOSE_PROJECT_NAME=$recovery_project docker compose -f "$root_dir/compose.recovery.yaml" "$@"
}

database_manifest() {
  compose_function=$1
  service=$2
  tables=$($compose_function exec -T "$service" psql -U vitallink -d vitallink -Atc \
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
  for table in $tables; do
    count=$($compose_function exec -T "$service" psql -U vitallink -d vitallink -Atc \
      "SELECT count(*) FROM \"$table\"")
    echo "table|$table|$count"
  done
  $compose_function exec -T "$service" psql -U vitallink -d vitallink -Atc \
    "SELECT 'documents|' || COALESCE(md5(string_agg(id::text || ':' || storage_key || ':' || sha256 || ':' || status, ',' ORDER BY id)), 'empty') FROM documents"
  $compose_function exec -T "$service" psql -U vitallink -d vitallink -Atc \
    "SELECT 'audits|' || COALESCE(md5(string_agg(id::text || ':' || COALESCE(actor_id, '') || ':' || action || ':' || COALESCE(target_id, '') || ':' || result || ':' || reason || ':' || correlation_id::text || ':' || event_metadata::text || ':' || created_at::text, ',' ORDER BY id)), 'empty') FROM audit_events"
  $compose_function exec -T "$service" psql -U vitallink -d vitallink -Atc \
    "SELECT 'foreign_keys|' || count(*) || '|' || count(*) FILTER (WHERE NOT convalidated) FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace"
}

object_manifest_main() {
  if [ "$backup_object_mode" = "run" ]; then
    source_compose run --rm -T --no-deps --entrypoint sh "$backup_object_service" \
      -c 'find /data -type f -exec sha256sum {} \; | sort'
  else
    source_compose exec -T "$backup_object_service" sh -c 'find /data -type f -exec sha256sum {} \; | sort'
  fi
}

object_manifest_recovery() {
  recovery_compose run --rm -T --no-deps --entrypoint sh object-tools \
    -c 'find /data -type f -exec sha256sum {} \; | sort'
}

cleanup_recovery() {
  recovery_compose down -v --remove-orphans >/dev/null 2>&1 || true
}

[ "$mode" = "backup" ] || [ "$mode" = "verify" ] || usage
[ -n "$target" ] || usage

case "$recovery_project" in
  *[!a-zA-Z0-9_-]* | "")
    echo "invalid VITALINK_RECOVERY_PROJECT" >&2
    exit 64
    ;;
esac
case "$backup_project" in
  *[!a-zA-Z0-9_-]*)
    echo "invalid VITALINK_BACKUP_PROJECT" >&2
    exit 64
    ;;
esac
[ "$backup_object_mode" = "exec" ] || [ "$backup_object_mode" = "run" ] || usage

if [ "$mode" = "backup" ]; then
  mkdir -p -- "$target"
  backup_dir=$(CDPATH= cd -- "$target" && pwd -P)
  if [ -n "$(find "$backup_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    echo "backup directory must be empty" >&2
    exit 73
  fi
  if [ "$backup_api_service" != "none" ]; then
    source_compose pause "$backup_api_service" >/dev/null
    trap 'source_compose unpause "$backup_api_service" >/dev/null 2>&1 || true' EXIT HUP INT TERM
  fi
  source_compose exec -T "$backup_postgres_service" pg_dump -U vitallink -d vitallink \
    --format=custom >"$backup_dir/database.dump"
  if [ "$backup_object_mode" = "run" ]; then
    source_compose run --rm -T --no-deps --entrypoint tar "$backup_object_service" \
      -C /data -cf - . >"$backup_dir/objects.tar"
  else
    source_compose exec -T "$backup_object_service" tar -C /data -cf - . >"$backup_dir/objects.tar"
  fi
  database_manifest source_compose "$backup_postgres_service" >"$backup_dir/database.manifest"
  object_manifest_main >"$backup_dir/objects.sha256"
  (
    cd "$backup_dir"
    sha256sum database.dump objects.tar database.manifest objects.sha256
  ) >"$backup_dir/SHA256SUMS"
  if [ "$backup_api_service" != "none" ]; then
    source_compose unpause "$backup_api_service" >/dev/null
  fi
  trap - EXIT HUP INT TERM
  echo "backup created and checksummed"
  exit 0
fi

backup_dir=$(CDPATH= cd -- "$target" && pwd -P)
for required in database.dump objects.tar database.manifest objects.sha256 SHA256SUMS; do
  [ -f "$backup_dir/$required" ] || {
    echo "missing backup artifact: $required" >&2
    exit 66
  }
done
(
  cd "$backup_dir"
  sha256sum -c SHA256SUMS
)

trap cleanup_recovery EXIT HUP INT TERM
cleanup_recovery
recovery_compose up -d postgres >/dev/null
attempt=0
until recovery_compose exec -T postgres pg_isready -U vitallink -d vitallink >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || {
    echo "recovery PostgreSQL did not become ready" >&2
    exit 69
  }
  sleep 1
done
recovery_compose exec -T postgres pg_restore \
  --exit-on-error --no-owner --no-privileges -U vitallink -d vitallink <"$backup_dir/database.dump"
recovery_compose run --rm -T --no-deps --entrypoint sh object-tools \
  -c 'tar -xf - -C /data' <"$backup_dir/objects.tar"

verification_dir=$(mktemp -d)
trap 'rm -rf "$verification_dir"; cleanup_recovery' EXIT HUP INT TERM
database_manifest recovery_compose postgres >"$verification_dir/database.manifest"
object_manifest_recovery >"$verification_dir/objects.sha256"
cmp "$backup_dir/database.manifest" "$verification_dir/database.manifest"
cmp "$backup_dir/objects.sha256" "$verification_dir/objects.sha256"
echo "clean restore verified: counts, hashes, objects, audit and foreign keys match"
