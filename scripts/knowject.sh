#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_ENV_FILE="$ROOT_DIR/.env.local"
HOST_ENV_EXAMPLE="$ROOT_DIR/.env.example"
LOCAL_ENV_FILE="$ROOT_DIR/.env.docker.local"
LOCAL_ENV_EXAMPLE="$ROOT_DIR/.env.docker.local.example"
PRODUCTION_ENV_FILE="$ROOT_DIR/.env.docker.production"
PRODUCTION_ENV_EXAMPLE="$ROOT_DIR/.env.docker.production.example"
SECRETS_DIR="$ROOT_DIR/docker/secrets"
JWT_SECRET_FILE="$SECRETS_DIR/jwt_secret.txt"
MONGO_ROOT_PASSWORD_FILE="$SECRETS_DIR/mongo_root_password.txt"
MONGO_APP_PASSWORD_FILE="$SECRETS_DIR/mongo_app_password.txt"
SETTINGS_ENCRYPTION_KEY_FILE="$SECRETS_DIR/settings_encryption_key.txt"
HOST_MONGO_URI_FILE="$SECRETS_DIR/mongodb_uri.local.txt"

cd "$ROOT_DIR"

info() {
  printf '[knowject] %s\n' "$*"
}

fail() {
  printf '[knowject] %s\n' "$*" >&2
  exit 1
}

run() {
  info "执行: $*"
  "$@"
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

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

get_local_web_port() {
  ensure_local_docker_env
  read_env_value_from_file "$LOCAL_ENV_FILE" "WEB_PORT" "8080"
}

get_local_api_published_port() {
  ensure_local_docker_env
  read_env_value_from_file "$LOCAL_ENV_FILE" "API_PUBLISHED_PORT" "3001"
}

get_local_mongo_published_port() {
  ensure_local_docker_env
  read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_PUBLISHED_PORT" "27017"
}

get_local_chroma_published_port() {
  ensure_local_docker_env
  read_env_value_from_file "$LOCAL_ENV_FILE" "CHROMA_PUBLISHED_PORT" "8000"
}

get_local_chroma_heartbeat_path() {
  ensure_local_docker_env
  read_env_value_from_file "$LOCAL_ENV_FILE" "CHROMA_HEARTBEAT_PATH" "/api/v2/heartbeat"
}

get_host_api_port() {
  ensure_host_env
  read_env_value_from_file "$HOST_ENV_FILE" "PORT" "$(get_local_api_published_port)"
}

get_host_indexer_port() {
  ensure_host_env
  read_env_value_from_file "$HOST_ENV_FILE" "KNOWLEDGE_INDEXER_PORT" "8001"
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
  if [[ -s "$JWT_SECRET_FILE" && -s "$MONGO_ROOT_PASSWORD_FILE" && -s "$MONGO_APP_PASSWORD_FILE" && -s "$SETTINGS_ENCRYPTION_KEY_FILE" ]]; then
    return
  fi

  ensure_command openssl
  run bash "$ROOT_DIR/docker/scripts/generate-local-secrets.sh"
}

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || fail "缺少文件：$file_path"
}

require_secret_files() {
  require_file "$JWT_SECRET_FILE"
  require_file "$MONGO_ROOT_PASSWORD_FILE"
  require_file "$MONGO_APP_PASSWORD_FILE"
  require_file "$SETTINGS_ENCRYPTION_KEY_FILE"
}

sync_host_env_with_local_docker() {
  local api_port mongo_port chroma_port mongo_db mongo_auth_source mongo_user mongo_password jwt_secret mongo_uri settings_encryption_key

  ensure_host_env
  ensure_local_docker_env
  ensure_local_secrets

  api_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "API_PUBLISHED_PORT" "3001")"
  mongo_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_PUBLISHED_PORT" "27017")"
  chroma_port="$(read_env_value_from_file "$LOCAL_ENV_FILE" "CHROMA_PUBLISHED_PORT" "8000")"
  mongo_db="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_APP_DATABASE" "knowject")"
  mongo_auth_source="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_AUTH_SOURCE" "$mongo_db")"
  mongo_user="$(read_env_value_from_file "$LOCAL_ENV_FILE" "MONGO_APP_USERNAME" "knowject_app")"
  mongo_password="$(tr -d '\r' <"$MONGO_APP_PASSWORD_FILE" | sed -e 's/[[:space:]]*$//')"
  jwt_secret="$(tr -d '\r' <"$JWT_SECRET_FILE" | sed -e 's/[[:space:]]*$//')"
  settings_encryption_key="$(tr -d '\r' <"$SETTINGS_ENCRYPTION_KEY_FILE" | sed -e 's/[[:space:]]*$//')"
  mongo_uri="mongodb://$(urlencode "$mongo_user"):$(urlencode "$mongo_password")@127.0.0.1:${mongo_port}/${mongo_db}?authSource=$(urlencode "$mongo_auth_source")"

  printf '%s\n' "$mongo_uri" >"$HOST_MONGO_URI_FILE"
  chmod 600 "$HOST_MONGO_URI_FILE"

  remove_env_key "$HOST_ENV_FILE" "MONGODB_URI"
  remove_env_key "$HOST_ENV_FILE" "JWT_SECRET"
  remove_env_key "$HOST_ENV_FILE" "SETTINGS_ENCRYPTION_KEY"
  upsert_env_key "$HOST_ENV_FILE" "PORT" "$api_port"
  upsert_env_key "$HOST_ENV_FILE" "MONGODB_URI_FILE" "$HOST_MONGO_URI_FILE"
  upsert_env_key "$HOST_ENV_FILE" "MONGODB_DB_NAME" "$mongo_db"
  upsert_env_key "$HOST_ENV_FILE" "JWT_SECRET_FILE" "$JWT_SECRET_FILE"
  upsert_env_key "$HOST_ENV_FILE" "SETTINGS_ENCRYPTION_KEY_FILE" "$SETTINGS_ENCRYPTION_KEY_FILE"
  upsert_env_key "$HOST_ENV_FILE" "CHROMA_URL" "http://127.0.0.1:${chroma_port}"

  if [[ -n "$jwt_secret" && -n "$settings_encryption_key" ]]; then
    info "已同步宿主机开发环境到 Docker 本地 secrets"
  fi
}

port_is_listening() {
  local port="$1"
  lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
}

compose_local() {
  ensure_command docker
  ensure_local_docker_env
  ensure_local_secrets

  docker compose \
    --env-file "$LOCAL_ENV_FILE" \
    -f "$ROOT_DIR/compose.yml" \
    -f "$ROOT_DIR/compose.local.yml" \
    "$@"
}

local_service_running() {
  local service_name="$1"

  compose_local ps --services --status running 2>/dev/null | grep -qx "$service_name"
}

ensure_local_dev_prerequisites() {
  ensure_command pnpm
  ensure_command python3
  ensure_command uv
  ensure_host_env
  ensure_local_docker_env
  ensure_local_secrets
}

ensure_host_api_port_available() {
  local api_port
  api_port="$(get_host_api_port)"

  if local_service_running api; then
    fail "检测到 Docker 本地 API 正在运行，请先执行 pnpm docker:local:down，再启动宿主机 API 开发。"
  fi

  if port_is_listening "$api_port"; then
    fail "端口 ${api_port} 已被占用，请先停止占用进程后再执行 pnpm dev:up 或 pnpm host:api。"
  fi
}

ensure_local_stack_port_available() {
  local service_name="$1"
  local port="$2"
  local hint="$3"

  if local_service_running "$service_name"; then
    return
  fi

  if port_is_listening "$port"; then
    fail "端口 ${port} 已被占用，无法启动 Docker 本地 ${service_name}。请先停止占用进程，或改用 ${hint}。"
  fi
}

up_local_dependencies() {
  local mongo_port chroma_port
  mongo_port="$(get_local_mongo_published_port)"
  chroma_port="$(get_local_chroma_published_port)"

  ensure_local_stack_port_available mongo "$mongo_port" "pnpm dev:deps:up"
  ensure_local_stack_port_available chroma "$chroma_port" "pnpm dev:deps:up"
  info "启动本地依赖：mongo + chroma"
  compose_local up -d mongo chroma
}

compose_production() {
  ensure_command docker
  require_file "$PRODUCTION_ENV_FILE"
  require_secret_files

  docker compose \
    --env-file "$PRODUCTION_ENV_FILE" \
    -f "$ROOT_DIR/compose.yml" \
    -f "$ROOT_DIR/compose.production.yml" \
    "$@"
}

print_help() {
  cat <<'EOF'
Knowject 常用命令包装

推荐工作流：
  ./scripts/knowject.sh dev:init
  ./scripts/knowject.sh dev:up
  ./scripts/knowject.sh dev:deps:up
  ./scripts/knowject.sh dev:deps:ps
  ./scripts/knowject.sh dev:deps:health
  ./scripts/knowject.sh dev:deps:down

宿主机开发：
  ./scripts/knowject.sh host:init
  ./scripts/knowject.sh host:up
  ./scripts/knowject.sh host:web
  ./scripts/knowject.sh host:api
  ./scripts/knowject.sh host:check
  ./scripts/knowject.sh host:build

Docker 本地：
  ./scripts/knowject.sh docker:local:init
  ./scripts/knowject.sh docker:local:up
  ./scripts/knowject.sh docker:local:down
  ./scripts/knowject.sh docker:local:ps
  ./scripts/knowject.sh docker:local:logs [service...]
  ./scripts/knowject.sh docker:local:config
  ./scripts/knowject.sh docker:local:health
  ./scripts/knowject.sh docker:local:reset

Docker 线上：
  ./scripts/knowject.sh docker:prod:init
  ./scripts/knowject.sh docker:prod:up
  ./scripts/knowject.sh docker:prod:down
  ./scripts/knowject.sh docker:prod:ps
  ./scripts/knowject.sh docker:prod:logs [service...]
  ./scripts/knowject.sh docker:prod:config

也可以用 pnpm 别名：
  pnpm knowject:help
  pnpm dev:init
  pnpm dev:up
  pnpm dev:deps:up
  pnpm host:init
  pnpm docker:local:up
EOF
}

command_name="${1:-help}"
shift || true

case "$command_name" in
  help|-h|--help)
    print_help
    ;;
  dev:init)
    ensure_local_dev_prerequisites
    sync_host_env_with_local_docker
    run pnpm install
    info "推荐开发流已准备：宿主机跑前后端，Docker 托管 mongo + chroma"
    ;;
  dev:up)
    ensure_local_dev_prerequisites
    sync_host_env_with_local_docker
    ensure_host_api_port_available
    host_indexer_port="$(get_host_indexer_port)"
    if port_is_listening "$host_indexer_port"; then
      fail "端口 ${host_indexer_port} 已被占用，请先停止占用进程后再执行 pnpm dev:up。"
    fi
    up_local_dependencies
    host_api_port="$(get_host_api_port)"
    info "启动宿主机开发服务：前端 http://127.0.0.1:5173 ，后端 http://127.0.0.1:${host_api_port} ，索引器 http://127.0.0.1:${host_indexer_port}"
    run pnpm dev
    ;;
  dev:deps:up)
    ensure_local_dev_prerequisites
    up_local_dependencies
    ;;
  dev:deps:down)
    info "停止本地依赖：mongo + chroma"
    compose_local stop mongo chroma
    ;;
  dev:deps:ps)
    compose_local ps mongo chroma
    ;;
  dev:deps:logs)
    if [[ "$#" -eq 0 ]]; then
      compose_local logs -f mongo chroma
    else
      compose_local logs -f "$@"
    fi
    ;;
  dev:deps:health)
    ensure_command curl
    chroma_port="$(get_local_chroma_published_port)"
    chroma_heartbeat_path="$(get_local_chroma_heartbeat_path)"
    info "Mongo 健康检查"
    compose_local exec -T mongo bash -lc 'mongosh --quiet --host 127.0.0.1 --authenticationDatabase admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$(cat /run/secrets/mongo_root_password)" --eval "db.adminCommand({ ping: 1 }).ok"'
    printf '\n'
    info "Chroma 心跳检查"
    curl --fail --silent --show-error "http://127.0.0.1:${chroma_port}${chroma_heartbeat_path}"
    printf '\n'
    ;;
  dev:check)
    ensure_command pnpm
    run pnpm check-types
    ;;
  dev:build)
    ensure_command pnpm
    run pnpm build
    ;;
  host:init)
    ensure_local_dev_prerequisites
    sync_host_env_with_local_docker
    run pnpm install
    ;;
  host:up)
    ensure_command pnpm
    ensure_command python3
    ensure_command uv
    sync_host_env_with_local_docker
    run pnpm dev
    ;;
  host:web)
    ensure_command pnpm
    run pnpm dev:web
    ;;
  host:api)
    ensure_command pnpm
    sync_host_env_with_local_docker
    run pnpm dev:api
    ;;
  host:check)
    ensure_command pnpm
    run pnpm check-types
    ;;
  host:build)
    ensure_command pnpm
    run pnpm build
    ;;
  docker:local:init)
    ensure_local_docker_env
    ensure_local_secrets
    info "本地 Docker 环境已就绪：$LOCAL_ENV_FILE"
    ;;
  docker:local:up)
    web_port="$(get_local_web_port)"
    api_port="$(get_local_api_published_port)"
    mongo_port="$(get_local_mongo_published_port)"
    chroma_port="$(get_local_chroma_published_port)"
    ensure_local_stack_port_available platform "$web_port" "pnpm dev:up"
    ensure_local_stack_port_available api "$api_port" "pnpm dev:up"
    ensure_local_stack_port_available mongo "$mongo_port" "pnpm dev:deps:up"
    ensure_local_stack_port_available chroma "$chroma_port" "pnpm dev:deps:up"
    info "启动本地 Docker 环境"
    compose_local up -d --build
    ;;
  docker:local:down)
    info "停止本地 Docker 环境"
    compose_local down
    ;;
  docker:local:ps)
    compose_local ps
    ;;
  docker:local:logs)
    compose_local logs -f "$@"
    ;;
  docker:local:config)
    compose_local config
    ;;
  docker:local:health)
    ensure_command curl
    api_port="$(get_local_api_published_port)"
    chroma_port="$(get_local_chroma_published_port)"
    chroma_heartbeat_path="$(get_local_chroma_heartbeat_path)"
    info "API 健康检查"
    curl --fail --silent --show-error "http://127.0.0.1:${api_port}/api/health"
    printf '\n'
    info "Chroma 心跳检查"
    curl --fail --silent --show-error "http://127.0.0.1:${chroma_port}${chroma_heartbeat_path}"
    printf '\n'
    ;;
  docker:local:reset)
    info "停止并清空本地 Docker 数据卷"
    compose_local down -v
    ;;
  docker:prod:init)
    ensure_production_docker_env
    mkdir -p "$SECRETS_DIR"
    info "已准备生产环境模板：$PRODUCTION_ENV_FILE"
    info "请手动写入 ${JWT_SECRET_FILE}、${MONGO_ROOT_PASSWORD_FILE}、${MONGO_APP_PASSWORD_FILE}"
    ;;
  docker:prod:up)
    info "启动生产 Docker 环境"
    compose_production up -d --build
    ;;
  docker:prod:down)
    info "停止生产 Docker 环境"
    compose_production down
    ;;
  docker:prod:ps)
    compose_production ps
    ;;
  docker:prod:logs)
    compose_production logs -f "$@"
    ;;
  docker:prod:config)
    compose_production config
    ;;
  *)
    fail "未知命令：$command_name。可执行 ./scripts/knowject.sh help 查看帮助"
    ;;
esac
