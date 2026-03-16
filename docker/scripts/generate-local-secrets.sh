#!/usr/bin/env bash
set -euo pipefail

target_dir="${1:-docker/secrets}"

mkdir -p "$target_dir"

create_secret() {
  local path="$1"
  local mode="$2"
  local command="$3"

  if [[ -s "$path" ]]; then
    chmod "$mode" "$path"
    echo "skip $path"
    return
  fi

  eval "$command" >"$path"
  chmod "$mode" "$path"
  echo "create $path"
}

create_secret "$target_dir/jwt_secret.txt" 600 "openssl rand -base64 48"
create_secret "$target_dir/mongo_root_password.txt" 600 "openssl rand -hex 24"
create_secret "$target_dir/mongo_app_password.txt" 600 "openssl rand -hex 24"
create_secret "$target_dir/settings_encryption_key.txt" 600 "openssl rand -hex 32"
