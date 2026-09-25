#!/usr/bin/env bash
# Start Engagement Manager for everyday use.
# 1. Install package updates (including Dependabot).
# 2. Start PostgreSQL if it is not already running.
# 3. Start the app.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

info() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v npm >/dev/null 2>&1 || die "npm is not installed. Run ./setup.sh first."
command -v pg_isready >/dev/null 2>&1 || die "PostgreSQL client tools are not installed. Run ./setup.sh first."

info "Installing package updates."
npm install

db_ready() {
  pg_isready -h 127.0.0.1 -p 5432 -q
}

info "Checking the database."

if db_ready; then
  info "Database is already running."
else
  command -v systemctl >/dev/null 2>&1 || die "PostgreSQL is not running, and systemctl is not available."
  info "Database is stopped. Starting it. You may be asked for your password."
  sudo systemctl start postgresql
  ready=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if db_ready; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "$ready" -ne 1 ]]; then
    die "PostgreSQL did not start. Check it with: systemctl status postgresql"
  fi
  info "Database is running."
fi

info "Starting Engagement Manager. Leave this window open."
info "Open the Local or Network address printed below."
exec npm run dev
