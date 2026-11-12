#!/usr/bin/env bash
# Upload worker.js as the repo-rossmel Worker, bound to the D1 database that keeps the counts.
# Reads the API token from ~/.config/cloudflare/workers.env and the account and database ids from
# ~/.config/cloudflare/ross-stats.env, so nothing about the account lives in this repo.
set -euo pipefail
cd "$(dirname "$0")"
get() { grep "^$1=" "$2" | cut -d= -f2- | tr -d '"'"'"' \r\n'; }
token=$(get CLOUDFLARE_API_TOKEN ~/.config/cloudflare/workers.env)
account=$(get CLOUDFLARE_ACCOUNT_ID ~/.config/cloudflare/ross-stats.env)
db=$(get D1_DATABASE_ID ~/.config/cloudflare/ross-stats.env)
meta=$(mktemp)
trap 'rm -f "$meta"' EXIT
printf '{"main_module":"worker.js","compatibility_date":"2026-10-01","bindings":[{"type":"d1","name":"DB","id":"%s"}]}' "$db" > "$meta"
printf 'header = "Authorization: Bearer %s"\n' "$token" | curl -K - -sS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$account/workers/scripts/repo-rossmel" \
  -F "metadata=@$meta;type=application/json" \
  -F "worker.js=@worker.js;filename=worker.js;type=application/javascript+module" |
  python3 -c "import json,sys; d=json.load(sys.stdin); print('deployed' if d['success'] else d['errors'])"
