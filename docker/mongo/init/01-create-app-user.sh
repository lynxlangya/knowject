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

for required_name in MONGO_INITDB_ROOT_USERNAME MONGO_INITDB_ROOT_PASSWORD MONGO_APP_DATABASE MONGO_APP_USERNAME MONGO_APP_PASSWORD; do
  file_env "$required_name"
done

export MONGO_APP_DATABASE MONGO_APP_USERNAME MONGO_APP_PASSWORD

mongosh \
  --quiet \
  --authenticationDatabase admin \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" <<'EOF'
const databaseName = process.env.MONGO_APP_DATABASE;
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;

const database = db.getSiblingDB(databaseName);
const existingUser = database.getUser(username);

if (!existingUser) {
  database.createUser({
    user: username,
    pwd: password,
    roles: [{ role: 'readWrite', db: databaseName }],
  });
}
EOF
