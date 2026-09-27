#!/usr/bin/env bash
# RBAC Amendment v3 / Chunk 1 task 5. Drops and recreates the local TicketPortal demo database,
# then reseeds it on next API start.
#
# Two hard safety checks before anything is dropped:
#   1. Refuses to run if ASPNETCORE_ENVIRONMENT is explicitly set to anything other than
#      "Development" — this script is a demo/dev convenience, never a migration tool for a
#      real environment.
#   2. Refuses to run unless the configured connection string is a LocalDB connection
#      (contains "(localdb)") — this can never be pointed at a shared or production database,
#      even by an environment-variable override, without editing this script.
#
# Requires: dotnet-ef, jq.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_project="$repo_root/apps/api/TicketPortal.Api.csproj"
appsettings_path="$repo_root/apps/api/appsettings.json"

if [[ -n "${ASPNETCORE_ENVIRONMENT:-}" && "${ASPNETCORE_ENVIRONMENT}" != "Development" ]]; then
  echo "ASPNETCORE_ENVIRONMENT is '${ASPNETCORE_ENVIRONMENT}' — this script only runs against Development. Aborting." >&2
  exit 1
fi

if [[ ! -f "$appsettings_path" ]]; then
  echo "Could not find $appsettings_path — run this script from the repo (scripts/reset-demo-db.sh)." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (used to read the connection string out of appsettings.json without eval'ing untrusted JSON)." >&2
  exit 1
fi

connection_string="$(jq -r '.ConnectionStrings.DefaultConnection // empty' "$appsettings_path")"

if [[ -z "$connection_string" ]] || ! grep -qi '(localdb)' <<<"$connection_string"; then
  echo "DefaultConnection does not look like a LocalDB connection string. Refusing to drop a database that might not be your local demo copy." >&2
  exit 1
fi

echo "Dropping database using connection: $connection_string"
echo "(Press Ctrl+C now to cancel — this permanently deletes all local demo data.)"
sleep 3

dotnet ef database drop --force --project "$api_project" --startup-project "$api_project"

echo
echo "Database dropped. Start the API ('npx nx run api:serve') — it will recreate the"
echo "database, apply migrations, and reseed every demo account listed in DEMO_ACCOUNTS.md."
