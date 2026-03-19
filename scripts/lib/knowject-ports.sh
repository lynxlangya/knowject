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

port_is_listening() {
  local port="$1"
  lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
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
