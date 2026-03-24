ensure_file_from_example() {
  local target_file="$1"
  local example_file="$2"

  if [[ -f "$target_file" ]]; then
    return
  fi

  cp "$example_file" "$target_file"
  info "已创建 $(basename "$target_file")，请按需修改其中配置"
}

ensure_host_env() {
  ensure_file_from_example "$HOST_ENV_FILE" "$HOST_ENV_EXAMPLE"
}

read_env_value_from_file() {
  local file_path="$1"
  local key="$2"
  local default_value="${3:-}"
  local line

  line="$(grep -E "^${key}=" "$file_path" | tail -n 1 || true)"

  if [[ -z "$line" ]]; then
    printf '%s' "$default_value"
    return
  fi

  printf '%s' "${line#*=}"
}

upsert_env_key() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local tmp_file

  tmp_file="$(mktemp)"

  if [[ -f "$file_path" ]]; then
    awk -F= -v key="$key" '$1 != key { print }' "$file_path" >"$tmp_file"
  fi

  printf '%s=%s\n' "$key" "$value" >>"$tmp_file"
  mv "$tmp_file" "$file_path"
}

remove_env_key() {
  local file_path="$1"
  local key="$2"
  local tmp_file

  [[ -f "$file_path" ]] || return

  tmp_file="$(mktemp)"
  awk -F= -v key="$key" '$1 != key { print }' "$file_path" >"$tmp_file"
  mv "$tmp_file" "$file_path"
}

urlencode() {
  node -p "encodeURIComponent(process.argv[1])" "$1"
}

sync_missing_env_keys() {
  local target_file="$1"
  local example_file="$2"

  require_file "$target_file"
  require_file "$example_file"

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    [[ "$line" =~ ^# ]] && continue

    local key="${line%%=*}"
    [[ -n "$key" ]] || continue

    if ! grep -q "^${key}=" "$target_file"; then
      printf '\n%s\n' "$line" >>"$target_file"
      info "已补充 $(basename "$target_file") 缺失配置：$key"
    fi
  done <"$example_file"
}

ensure_local_docker_env() {
  ensure_file_from_example "$LOCAL_ENV_FILE" "$LOCAL_ENV_EXAMPLE"
  sync_missing_env_keys "$LOCAL_ENV_FILE" "$LOCAL_ENV_EXAMPLE"
}

ensure_production_docker_env() {
  ensure_file_from_example "$PRODUCTION_ENV_FILE" "$PRODUCTION_ENV_EXAMPLE"
  sync_missing_env_keys "$PRODUCTION_ENV_FILE" "$PRODUCTION_ENV_EXAMPLE"
}

ensure_local_secrets() {
  if [[ -s "$JWT_SECRET_FILE" && -s "$KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE" && -s "$MONGO_ROOT_PASSWORD_FILE" && -s "$MONGO_APP_PASSWORD_FILE" && -s "$SETTINGS_ENCRYPTION_KEY_FILE" ]]; then
    return
  fi

  ensure_command openssl
  run bash "$ROOT_DIR/docker/scripts/generate-local-secrets.sh"
}

require_secret_files() {
  require_file "$JWT_SECRET_FILE"
  require_file "$KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE"
  require_file "$MONGO_ROOT_PASSWORD_FILE"
  require_file "$MONGO_APP_PASSWORD_FILE"
  require_file "$SETTINGS_ENCRYPTION_KEY_FILE"
}

write_mongodb_uri_file() {
  local env_file="$1"
  local target_file="$2"
  local mongo_host="$3"
  local mongo_port="$4"
  local mongo_db mongo_auth_source mongo_user mongo_password mongo_uri

  require_file "$env_file"
  require_file "$MONGO_APP_PASSWORD_FILE"

  mongo_db="$(read_env_value_from_file "$env_file" "MONGO_APP_DATABASE" "knowject")"
  mongo_auth_source="$(read_env_value_from_file "$env_file" "MONGO_AUTH_SOURCE" "$mongo_db")"
  mongo_user="$(read_env_value_from_file "$env_file" "MONGO_APP_USERNAME" "knowject_app")"
  mongo_password="$(tr -d '\r' <"$MONGO_APP_PASSWORD_FILE" | sed -e 's/[[:space:]]*$//')"
  mongo_uri="mongodb://$(urlencode "$mongo_user"):$(urlencode "$mongo_password")@${mongo_host}:${mongo_port}/${mongo_db}?authSource=$(urlencode "$mongo_auth_source")"

  printf '%s\n' "$mongo_uri" >"$target_file"
  chmod 600 "$target_file"
}

sync_local_docker_api_secrets() {
  ensure_local_docker_env
  ensure_local_secrets
  write_mongodb_uri_file "$LOCAL_ENV_FILE" "$DOCKER_MONGODB_URI_FILE" "mongo" "27017"
}

sync_production_docker_api_secrets() {
  ensure_production_docker_env
  require_secret_files
  write_mongodb_uri_file "$PRODUCTION_ENV_FILE" "$DOCKER_MONGODB_URI_FILE" "mongo" "27017"
}

sync_host_env_with_local_docker() {
  local api_port mongo_port chroma_port mongo_db jwt_secret settings_encryption_key

  ensure_host_env
  ensure_local_docker_env
  ensure_local_secrets
  sync_local_docker_api_secrets

  api_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "API_PUBLISHED_PORT" "3001")"
  mongo_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_PUBLISHED_PORT" "27017")"
  chroma_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "CHROMA_PUBLISHED_PORT" "8000")"
  mongo_db="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_APP_DATABASE" "knowject")"
  jwt_secret="$(tr -d '\r' <"$JWT_SECRET_FILE" | sed -e 's/[[:space:]]*$//')"
  settings_encryption_key="$(tr -d '\r' <"$SETTINGS_ENCRYPTION_KEY_FILE" | sed -e 's/[[:space:]]*$//')"
  write_mongodb_uri_file "$LOCAL_ENV_FILE" "$HOST_MONGO_URI_FILE" "127.0.0.1" "$mongo_port"

  remove_env_key "$HOST_ENV_FILE" "MONGODB_URI"
  remove_env_key "$HOST_ENV_FILE" "JWT_SECRET"
  remove_env_key "$HOST_ENV_FILE" "KNOWLEDGE_INDEXER_INTERNAL_TOKEN"
  remove_env_key "$HOST_ENV_FILE" "SETTINGS_ENCRYPTION_KEY"
  upsert_env_key "$HOST_ENV_FILE" "PORT" "$api_port"
  upsert_env_key "$HOST_ENV_FILE" "MONGODB_URI_FILE" "$HOST_MONGO_URI_FILE"
  upsert_env_key "$HOST_ENV_FILE" "MONGODB_DB_NAME" "$mongo_db"
  upsert_env_key "$HOST_ENV_FILE" "JWT_SECRET_FILE" "$JWT_SECRET_FILE"
  upsert_env_key "$HOST_ENV_FILE" "KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE" "$KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE"
  upsert_env_key "$HOST_ENV_FILE" "SETTINGS_ENCRYPTION_KEY_FILE" "$SETTINGS_ENCRYPTION_KEY_FILE"
  upsert_env_key "$HOST_ENV_FILE" "CHROMA_URL" "http://127.0.0.1:${chroma_port}"

  if [[ -n "$jwt_secret" && -n "$settings_encryption_key" ]]; then
    info "已同步宿主机开发环境到 Docker 本地 secrets"
  fi
}
