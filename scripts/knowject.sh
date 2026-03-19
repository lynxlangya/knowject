#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_DIR="$ROOT_DIR/scripts/lib"
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
DOCKER_MONGODB_URI_FILE="$SECRETS_DIR/mongodb_uri.txt"
HOST_MONGO_URI_FILE="$SECRETS_DIR/mongodb_uri.local.txt"

cd "$ROOT_DIR"

source "$LIB_DIR/knowject-common.sh"
source "$LIB_DIR/knowject-env.sh"
source "$LIB_DIR/knowject-compose.sh"
source "$LIB_DIR/knowject-ports.sh"

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
    sync_local_docker_api_secrets
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
    info "请手动写入 ${JWT_SECRET_FILE}、${MONGO_ROOT_PASSWORD_FILE}、${MONGO_APP_PASSWORD_FILE}、${SETTINGS_ENCRYPTION_KEY_FILE}"
    info "后续 docker:prod:config / up 会按生产 env + mongo_app_password 自动派生 ${DOCKER_MONGODB_URI_FILE}"
    ;;
  docker:prod:up)
    info "启动生产 Docker 环境（默认只拉起已准备好的镜像，不执行本地构建）"
    compose_production up -d --no-build
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
