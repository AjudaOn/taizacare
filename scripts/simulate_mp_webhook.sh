#!/bin/sh
set -eu

payment_id="${1:-}"
base_url="${2:-http://localhost:3000}"

if [ -z "$payment_id" ]; then
  echo "Usage: $0 <payment_id> [base_url]" >&2
  echo "Example: $0 1234567890 http://localhost:3000" >&2
  exit 2
fi

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
env_file="$script_dir/../layout/.env"

if [ ! -f "$env_file" ]; then
  echo "Missing env file: $env_file" >&2
  exit 2
fi

get_env() {
  key="$1"
  # NOTE: This expects KEY=value lines (no export, no quotes).
  # shellcheck disable=SC2002
  cat "$env_file" | awk -F= -v k="$key" '$1==k {sub($1"=",""); print; exit}'
}

mp_webhook_secret="$(get_env MP_WEBHOOK_SECRET || true)"

ts="$(date +%s)"
request_id="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || true)"
if [ -z "$request_id" ]; then
  request_id="$(date +%s)-$$"
fi

url="${base_url%/}/api/mp/webhook?data.id=$payment_id"
body="{\"data\":{\"id\":\"$payment_id\"},\"type\":\"payment\",\"action\":\"payment.updated\"}"

headers="-H Content-Type:application/json"

if [ -n "$mp_webhook_secret" ]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "MP_WEBHOOK_SECRET is set, but 'openssl' was not found (needed to compute x-signature)." >&2
    exit 2
  fi

  template="id:${payment_id};request-id:${request_id};ts:${ts};"
  sig_hex="$(printf "%s" "$template" | openssl dgst -sha256 -hmac "$mp_webhook_secret" -hex | awk '{print $2}')"

  headers="$headers -H x-request-id:$request_id -H x-signature:ts=$ts,v1=$sig_hex"
fi

echo "POST $url" >&2
echo "request-id: $request_id" >&2

# shellcheck disable=SC2086
curl -i --max-time 20 -X POST "$url" $headers -d "$body"

