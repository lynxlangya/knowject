#!/usr/bin/env bash
set -euo pipefail

file_env() {
  local var_name="$1"
  local file_var_name="${var_name}_FILE"
  local direct_value="${!var_name:-}"
  local file_value="${!file_var_name:-}"

  if [[ -n "$direct_value" && -n "$file_value" ]]; then
    echo "Both $var_name and $file_var_name are set" >&2
    exit 1
  fi

  if [[ -n "$file_value" ]]; then
    if [[ ! -f "$file_value" ]]; then
      echo "$file_var_name points to a missing file: $file_value" >&2
      exit 1
    fi

    export "$var_name"="$(tr -d '\r' <"$file_value" | sed -e 's/[[:space:]]*$//')"
    unset "$file_var_name"
  fi
}

for required_name in JWT_SECRET SETTINGS_ENCRYPTION_KEY MONGODB_URI MONGODB_DB_NAME; do
  file_env "$required_name"
done

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "[start-api] MONGODB_URI is unset; falling back to legacy MONGO_* contract" >&2
  for legacy_name in MONGO_APP_USERNAME MONGO_APP_PASSWORD MONGO_APP_DATABASE MONGO_HOST MONGO_PORT MONGO_AUTH_SOURCE; do
    file_env "$legacy_name"
  done

  : "${MONGO_APP_USERNAME:?MONGO_APP_USERNAME is required when MONGODB_URI is unset}"
  : "${MONGO_APP_PASSWORD:?MONGO_APP_PASSWORD is required when MONGODB_URI is unset}"
  : "${MONGO_APP_DATABASE:?MONGO_APP_DATABASE is required when MONGODB_URI is unset}"

  export MONGO_HOST="${MONGO_HOST:-mongo}"
  export MONGO_PORT="${MONGO_PORT:-27017}"
  export MONGO_AUTH_SOURCE="${MONGO_AUTH_SOURCE:-$MONGO_APP_DATABASE}"
  export MONGODB_DB_NAME="${MONGODB_DB_NAME:-$MONGO_APP_DATABASE}"

  encoded_username="$(node -p "encodeURIComponent(process.argv[1])" "$MONGO_APP_USERNAME")"
  encoded_password="$(node -p "encodeURIComponent(process.argv[1])" "$MONGO_APP_PASSWORD")"

  export MONGODB_URI="mongodb://${encoded_username}:${encoded_password}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_APP_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"
fi

: "${JWT_SECRET:?JWT_SECRET or JWT_SECRET_FILE is required}"
: "${SETTINGS_ENCRYPTION_KEY:?SETTINGS_ENCRYPTION_KEY or SETTINGS_ENCRYPTION_KEY_FILE is required}"
: "${MONGODB_URI:?MONGODB_URI or MONGODB_URI_FILE is required}"
: "${MONGODB_DB_NAME:?MONGODB_DB_NAME is required}"

exec node /workspace/apps/api/dist/server.js
