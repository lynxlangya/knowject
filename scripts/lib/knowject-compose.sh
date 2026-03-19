compose_local() {
  ensure_command docker
  ensure_local_docker_env
  ensure_local_secrets
  sync_local_docker_api_secrets

  docker compose \
    --env-file "$LOCAL_ENV_FILE" \
    -f "$ROOT_DIR/compose.yml" \
    -f "$ROOT_DIR/compose.local.yml" \
    "$@"
}

compose_production() {
  ensure_command docker
  sync_production_docker_api_secrets

  docker compose \
    --env-file "$PRODUCTION_ENV_FILE" \
    -f "$ROOT_DIR/compose.yml" \
    -f "$ROOT_DIR/compose.production.yml" \
    "$@"
}

local_service_running() {
  local service_name="$1"

  compose_local ps --services --status running 2>/dev/null | grep -qx "$service_name"
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
