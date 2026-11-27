#!/usr/bin/env bash
# Deploy VibeVoice (+ LiveKit) to the Docker host. Safe to re-run for every update.
#
#   deploy/deploy.sh                 # test, build amd64 image, ship it, restart, verify
#   deploy/deploy.sh --skip-tests    # same without lint/typecheck/unit tests
#
# What it does, in order:
#   1. (optional) lint + typecheck + unit tests locally
#   2. builds the linux/amd64 image locally with buildx (the server's Docker has no buildx)
#   3. first run only: creates $DEPLOY_DIR and generates .env secrets ON THE SERVER
#      (an existing .env is never touched, and secrets are never printed)
#   4. copies docker-compose.yml + livekit.yaml to the server (restarts LiveKit if its config changed)
#   5. streams the image over SSH (`docker save | ssh docker load`; the server has no SFTP/registry)
#   6. `docker compose up -d --no-build`, waits for the app to be healthy, checks it runs the new image
#   7. removes the previous vibevoice image, only if nothing uses it
#
# It does NOT touch Nginx Proxy Manager. The hosts vc.agiledeck.org (-> vibevoice:3000) and
# lk.agiledeck.org (-> 192.168.0.200:7880, websockets on) are configured once in the NPM UI.
#
# Overrides (environment variables):
#   DEPLOY_HOST    SSH target                (default 192.168.0.200)
#   DEPLOY_DIR     directory on the server   (default /opt/vibevoice)
#   DOCKER_CONFIG  local docker config dir   (only if ~/.docker is unusable)

set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-192.168.0.200}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/vibevoice}"
IMAGE="vibevoice:latest"
SERVICE="vibevoice"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10)

SKIP_TESTS=0
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

step() { printf '\n==> %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
remote() { ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"; }

step "Preflight"
command -v docker >/dev/null || die "docker is not installed locally"
docker buildx version >/dev/null 2>&1 || die "docker buildx is not available locally"
remote 'docker compose version >/dev/null' \
  || die "cannot reach $DEPLOY_HOST over SSH, or docker compose is missing there"
[ -f deploy/docker-compose.yml ] || die "deploy/docker-compose.yml is missing"
[ -f deploy/livekit.yaml ] || die "deploy/livekit.yaml is missing (it is git-ignored because it holds your public IP): cp deploy/livekit.yaml.example deploy/livekit.yaml and edit it"
echo "target: $DEPLOY_HOST:$DEPLOY_DIR"

if [ "$SKIP_TESTS" -eq 0 ]; then
  step "Lint, typecheck, unit tests"
  npm run lint
  npx tsc --noEmit
  rm -f tsconfig.tsbuildinfo
  npm test
else
  step "Skipping tests (--skip-tests)"
fi

step "Building $IMAGE for linux/amd64"
docker buildx build --platform linux/amd64 --load -t "$IMAGE" .
NEW_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}')"
echo "new image: $NEW_ID"

step "Preparing $DEPLOY_DIR on the server"
remote "DEPLOY_DIR='$DEPLOY_DIR' bash -s" <<'REMOTE'
set -euo pipefail
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"
if [ ! -f .env ]; then
  umask 077
  printf 'APP_SECRET=%s\nLK_API_KEY=%s\nLK_API_SECRET=%s\n' \
    "$(openssl rand -hex 32)" "API$(openssl rand -hex 6)" "$(openssl rand -hex 32)" > .env
  echo ".env created (new secrets generated on the server)"
else
  echo ".env already exists, left untouched"
fi
chmod 600 .env
sha256sum livekit.yaml 2>/dev/null | cut -d' ' -f1 > .livekit.yaml.sha || true
REMOTE

step "Copying compose + LiveKit config"
tar czf - -C deploy docker-compose.yml livekit.yaml | remote "tar xzf - -C '$DEPLOY_DIR'"

OLD_ID="$(remote "docker image inspect '$IMAGE' --format '{{.Id}}' 2>/dev/null || true")"

step "Shipping image to the server (docker save | ssh docker load)"
docker save "$IMAGE" | remote 'docker load'

step "Starting containers"
remote "DEPLOY_DIR='$DEPLOY_DIR' bash -s" <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_DIR"
docker compose config -q
docker compose up -d --no-build
# Compose does not notice edits to the bind-mounted livekit.yaml, so restart LiveKit when it changed.
NEW_SUM="$(sha256sum livekit.yaml | cut -d' ' -f1)"
OLD_SUM="$(cat .livekit.yaml.sha 2>/dev/null || true)"
if [ -n "$OLD_SUM" ] && [ "$OLD_SUM" != "$NEW_SUM" ]; then
  echo "livekit.yaml changed -> restarting livekit"
  docker compose restart livekit
fi
rm -f .livekit.yaml.sha
REMOTE

step "Waiting for $SERVICE to become healthy"
for i in $(seq 1 30); do
  STATE="$(remote "docker inspect -f '{{.State.Health.Status}}' $SERVICE 2>/dev/null || echo missing")"
  [ "$STATE" = "healthy" ] && break
  sleep 2
done
[ "$STATE" = "healthy" ] || { remote "docker logs --tail 30 $SERVICE" || true; die "$SERVICE is '$STATE', not healthy"; }

RUNNING_ID="$(remote "docker inspect -f '{{.Image}}' $SERVICE")"
[ "$RUNNING_ID" = "$NEW_ID" ] || die "$SERVICE is not running the new image ($RUNNING_ID vs $NEW_ID)"

LK_STATE="$(remote "docker inspect -f '{{.State.Status}}' livekit 2>/dev/null || echo missing")"
[ "$LK_STATE" = "running" ] || die "livekit container is '$LK_STATE'"
remote 'curl -fsS -m 5 http://127.0.0.1:7880/ >/dev/null' || die "LiveKit signalling (7880) not answering"

if [ -n "$OLD_ID" ] && [ "$OLD_ID" != "$NEW_ID" ]; then
  step "Removing the previous $IMAGE image"
  remote "docker rmi '$OLD_ID' >/dev/null 2>&1 && echo removed || echo 'kept (still in use)'"
fi

step "Done"
remote "cd '$DEPLOY_DIR' && docker compose ps --format 'table {{.Name}}\t{{.Status}}'"
echo
echo "App: https://vc.agiledeck.org   (needs the two NPM proxy hosts; see header of this script)"
