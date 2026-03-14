#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf '[indexer-py] %s\n' "$*" >&2
  exit 1
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1。请先按 README 安装 Python 3.12+ 和 uv，或改用 Docker 开发流。"
}

main() {
  local mode="${1:-}"
  shift || true

  ensure_command python3
  ensure_command uv

  cd "$ROOT_DIR"

  case "$mode" in
    dev)
      exec uv run uvicorn app.main:app --host "${KNOWLEDGE_INDEXER_HOST:-127.0.0.1}" --port "${KNOWLEDGE_INDEXER_PORT:-8001}" --reload "$@"
      ;;
    start)
      exec uv run uvicorn app.main:app --host "${KNOWLEDGE_INDEXER_HOST:-127.0.0.1}" --port "${KNOWLEDGE_INDEXER_PORT:-8001}" "$@"
      ;;
    test)
      exec uv run pytest "$@"
      ;;
    *)
      fail "未知模式：${mode:-<empty>}。允许值：dev | start | test"
      ;;
  esac
}

main "$@"
