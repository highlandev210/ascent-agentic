#!/usr/bin/env bash
#
# build.sh — recreate the full Morphic stack with Docker Compose.
#
# Usage:
#   ./build.sh              Build images and start the stack (default)
#   ./build.sh --fresh      Wipe volumes (DB/redis/searxng) first, then build + start
#   ./build.sh --no-cache   Force a full rebuild, ignoring cached layers
#   ./build.sh --logs       Follow logs after the stack is up
#   ./build.sh --help       Show this help
#
# Flags can be combined, e.g. ./build.sh --fresh --logs

set -euo pipefail

cd "$(dirname "$0")"

# ---- pretty output ---------------------------------------------------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=''; GREEN=''; YELLOW=''; RED=''; DIM=''; RESET=''
fi

step() { printf '%s==>%s %s%s%s\n' "$GREEN" "$RESET" "$BOLD" "$1" "$RESET"; }
info() { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '%s!!%s  %s\n' "$YELLOW" "$RESET" "$1"; }
die()  { printf '%serror:%s %s\n' "$RED" "$RESET" "$1" >&2; exit 1; }

usage() {
  sed -n '3,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

# ---- parse flags -----------------------------------------------------------
FRESH=false
NO_CACHE=false
FOLLOW_LOGS=false

for arg in "$@"; do
  case "$arg" in
    --fresh)    FRESH=true ;;
    --no-cache) NO_CACHE=true ;;
    --logs)     FOLLOW_LOGS=true ;;
    -h|--help)  usage ;;
    *) die "unknown flag: $arg (try --help)" ;;
  esac
done

# ---- preflight -------------------------------------------------------------
step "Checking prerequisites"

command -v docker >/dev/null 2>&1 || die "docker is not installed or not on PATH. See https://docs.docker.com/get-docker/"

if ! docker info >/dev/null 2>&1; then
  die "docker daemon is not running. Start Docker Desktop (or the docker service) and try again."
fi

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose v2 is not available. Update Docker, or install the Compose plugin."
fi
info "docker and docker compose are ready"

if [ ! -f .env.local ]; then
  if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
    warn ".env.local was missing — created it from .env.local.example."
    warn "Fill in your API keys (OPENAI_API_KEY, TAVILY_API_KEY, etc.) then re-run ./build.sh"
    exit 1
  else
    die ".env.local is missing and no .env.local.example to copy from."
  fi
fi
info ".env.local is present"

# ---- fresh start (optional) ------------------------------------------------
if [ "$FRESH" = true ]; then
  step "Tearing down existing stack and wiping volumes (--fresh)"
  warn "This deletes the Postgres database, Redis data, and SearXNG data."
  docker compose down -v --remove-orphans
fi

# ---- build -----------------------------------------------------------------
step "Building images"
if [ "$NO_CACHE" = true ]; then
  info "building with --no-cache (full rebuild)"
  docker compose build --no-cache
else
  docker compose build
fi

# ---- up --------------------------------------------------------------------
step "Starting the stack"
docker compose up -d

# ---- wait for Postgres to be healthy ---------------------------------------
step "Waiting for Postgres to be ready"
for i in $(seq 1 30); do
  health=$(docker compose ps postgres --format '{{.Health}}' 2>/dev/null || echo '')
  if [ "$health" = "healthy" ]; then
    info "postgres is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "postgres did not report healthy within ~60s; the app may still be migrating."
    warn "Check: docker compose logs -f postgres"
    break
  fi
  sleep 2
done

# ---- status ----------------------------------------------------------------
step "Stack status"
docker compose ps

printf '\n%s%sMorphic is starting at %shttp://localhost:3000%s\n' "$GREEN" "$BOLD" "$RESET$BOLD" "$RESET"
info "First start runs database migrations — give it a few seconds."
info "Tail logs:   docker compose logs -f morphic"
info "Stop:        docker compose down"
info "Reset all:   ./build.sh --fresh"

# ---- logs (optional) -------------------------------------------------------
if [ "$FOLLOW_LOGS" = true ]; then
  printf '\n'
  step "Following logs (Ctrl-C to stop; the stack keeps running)"
  docker compose logs -f morphic
fi
