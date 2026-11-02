#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# Aether: one-shot provisioning for Ubuntu (22.04 / 24.04 / 26.04) on VirtualBox
#
# Installs Node.js 24 LTS, pnpm, PostgreSQL, Git and VS Code (+ extensions),
# creates the database with a random password, writes .env (asking for your
# Amazon S3 details), migrates, builds and optionally installs a service.
#
# Usage (from the repository root, as your normal user, NOT root):
#   bash scripts/setup-ubuntu.sh
# Safe to re-run: every step checks before it changes anything.
# ────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
info() { printf '  • %s\n' "$*"; }
# ask PROMPT VAR [-s]: reads from the terminal even if stdin was consumed; empty on EOF.
ask() {
  local __v="" src=/dev/stdin
  { : </dev/tty; } 2>/dev/null && src=/dev/tty
  if [[ "${3:-}" == "-s" ]]; then IFS= read -rsp "$1" __v <"$src" || true; echo; else IFS= read -rp "$1" __v <"$src" || true; fi
  printf -v "$2" "%s" "$__v"
}
die() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
trap 'die "Setup stopped at line $LINENO. Fix the error above and re-run; finished steps are skipped."' ERR

[[ $EUID -ne 0 ]] || die "Run this as your normal user (it uses sudo when needed), not as root."
command -v apt-get >/dev/null || die "This script supports Ubuntu/Debian (apt) only."
[[ -f package.json && -f prisma/schema.prisma ]] || die "Run from inside the Aether repository."

bold "Aether setup on $(. /etc/os-release && echo "$PRETTY_NAME")"
sudo -v # ask for the sudo password once, up front

# ─── 1. Base packages ───────────────────────────────────────────────────────
bold "1/7  System packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates curl gnupg git openssl build-essential postgresql postgresql-contrib >/dev/null
ok "git, curl, build tools, PostgreSQL"

# ─── 2. Node.js 24 LTS + pnpm ───────────────────────────────────────────────
bold "2/7  Node.js 24 LTS + pnpm"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - >/dev/null
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
fi
ok "node $(node -v)"
# A current corepack knows the signing keys of recent pnpm releases.
sudo npm install -g corepack@latest >/dev/null 2>&1
sudo corepack enable
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack install >/dev/null # pnpm version pinned in package.json
ok "pnpm $(pnpm -v)"

# ─── 3. VS Code + recommended extensions ────────────────────────────────────
bold "3/7  Visual Studio Code"
if ! command -v code >/dev/null; then
  tmp="$(mktemp)"
  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor >"$tmp"
  sudo install -D -o root -g root -m 644 "$tmp" /etc/apt/keyrings/packages.microsoft.gpg
  rm -f "$tmp"
  echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" |
    sudo tee /etc/apt/sources.list.d/vscode.list >/dev/null
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq code >/dev/null
fi
ok "VS Code $(code --version </dev/null 2>/dev/null | head -1 || true)"
for ext in dbaeumer.vscode-eslint esbenp.prettier-vscode bradlc.vscode-tailwindcss prisma.prisma ms-playwright.playwright; do
  code --install-extension "$ext" --force </dev/null >/dev/null 2>&1 && info "extension $ext" || info "could not install $ext (install it later from VS Code)"
done

# ─── 4. PostgreSQL database ────────────────────────────────────────────────
bold "4/7  PostgreSQL"
sudo systemctl enable --now postgresql >/dev/null 2>&1 || true
DB_PASSWORD=""
if [[ -f .env ]] && grep -q '^DATABASE_URL=postgresql://aether:' .env && ! grep -q 'localhost:54329' .env; then
  ok "database already configured in .env"
else
  DB_PASSWORD="$(openssl rand -hex 24)"
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='aether'" | grep -q 1; then
    sudo -u postgres psql -q -c "ALTER ROLE aether WITH LOGIN PASSWORD '${DB_PASSWORD}'"
  else
    sudo -u postgres psql -q -c "CREATE ROLE aether WITH LOGIN PASSWORD '${DB_PASSWORD}'"
  fi
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='aether'" | grep -q 1 ||
    sudo -u postgres createdb -O aether aether
  ok "role + database 'aether' ready (random password)"
fi

# ─── 5. Environment file ───────────────────────────────────────────────────
bold "5/7  Configuration (.env)"
set_env() { # set_env KEY VALUE — replace or append, value written literally
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    KEY="$key" VALUE="$value" perl -0pi -e 's/^\Q$ENV{KEY}\E=.*$/$ENV{KEY}=$ENV{VALUE}/m' .env
  else
    printf '%s=%s\n' "$key" "$value" >>.env
  fi
}
[[ -f .env ]] || cp .env.example .env
chmod 600 .env
if grep -q '^BETTER_AUTH_SECRET=replace-me' .env; then
  set_env BETTER_AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  ok "generated a fresh auth secret"
fi
[[ -n "$DB_PASSWORD" ]] && set_env DATABASE_URL "postgresql://aether:${DB_PASSWORD}@localhost:5432/aether"
set_env APP_URL "${APP_URL:-http://localhost:3000}"

if grep -q '^S3_ENDPOINT=http' .env || grep -q '^S3_ACCESS_KEY_ID=aether_local' .env; then
  echo
  info "Now connect Amazon S3 (see docs/AWS_SETUP.md). Leave blank to skip and edit .env later."
  ask "    AWS region (e.g. ap-south-1): " S3_REGION
  if [[ -n "$S3_REGION" ]]; then
    ask "    Bucket name: " S3_BUCKET
    ask "    Access key ID: " S3_KEY
    ask "    Secret access key (hidden): " S3_SECRET -s
    set_env S3_REGION "$S3_REGION"
    set_env S3_BUCKET "$S3_BUCKET"
    set_env S3_ACCESS_KEY_ID "$S3_KEY"
    set_env S3_SECRET_ACCESS_KEY "$S3_SECRET"
    set_env S3_ENDPOINT ""
    set_env S3_FORCE_PATH_STYLE "false"
    ok "Amazon S3 credentials saved to .env (permissions 600, git-ignored)"
  else
    info "skipped: set the S3_* values in .env, then run: pnpm storage:init && pnpm build"
  fi
else
  ok "S3 already configured"
fi

# ─── 6. Install, migrate, build ────────────────────────────────────────────
bold "6/7  Install, migrate, build"
pnpm install --frozen-lockfile
pnpm db:migrate
if grep -q '^S3_ENDPOINT=$' .env; then
  pnpm storage:init || info "storage check failed: verify the S3 values in .env (docs/AWS_SETUP.md)"
fi
pnpm build
ok "production build ready"

# ─── 7. Optional: run as a service ─────────────────────────────────────────
bold "7/7  Run"
svc=""
ask "  Start Aether automatically on boot (systemd service)? [y/N] " svc
if [[ "${svc,,}" == "y" ]]; then
  sudo tee /etc/systemd/system/aether.service >/dev/null <<UNIT
[Unit]
Description=Aether file sharing
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production PORT=3000
ExecStart=$(command -v pnpm) start
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable --now aether >/dev/null
  ok "service running: sudo systemctl status aether"
else
  info "start it any time with:  pnpm start"
fi

bold "Done. Open http://localhost:3000"
info "From Windows (with the VirtualBox port forward) the same address works."
info "Develop:  code .   then   pnpm dev"
trap - ERR
