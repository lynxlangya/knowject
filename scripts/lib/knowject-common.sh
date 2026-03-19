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

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || fail "缺少文件：$file_path"
}
