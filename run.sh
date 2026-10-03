#!/usr/bin/env bash
# Start Engagement Manager for everyday use.
# 1. Install package updates (including Dependabot).
# 2. Start PostgreSQL if it is not already running.
# 3. Start the app.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

SYSTEMCTL=/usr/bin/systemctl
SUDOERS_FILE=/etc/sudoers.d/engagement-mgr-postgresql

info() { printf '[*] %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

db_ready() {
    pg_isready -h 127.0.0.1 -p 5432 -q
}

sudo_password_required() {
    [[ "$1" == *"password is required"* || "$1" == *"interactive authentication is required"* ]]
}

install_postgresql_sudo_rule() {
    local sudo_user sudoers_tmp

    info "Allowing this user to start PostgreSQL without a password. You may be asked for your password once."
    printf '\n'

    sudo_user="$(id -un)"
    [[ "$sudo_user" =~ ^[a-z_][a-z0-9_-]*$ ]] || die "Cannot install a sudo rule for user '$sudo_user'."
    command -v visudo >/dev/null 2>&1 || die "visudo is not installed, so the sudo rule cannot be checked."

    sudoers_tmp="$(mktemp)"
    cat > "$sudoers_tmp" <<EOF
# Allow Engagement Manager to start local PostgreSQL without a password.
${sudo_user} ALL=(root) NOPASSWD: ${SYSTEMCTL} start postgresql, ${SYSTEMCTL} start postgresql.service
EOF

    if ! visudo -c -f "$sudoers_tmp" >/dev/null; then
        rm -f "$sudoers_tmp"
        die "Refusing to install an invalid PostgreSQL sudo rule."
    fi

    if ! sudo install -m 0440 -o root -g root "$sudoers_tmp" "$SUDOERS_FILE"; then
        rm -f "$sudoers_tmp"
        die "Could not install the PostgreSQL sudo rule."
    fi

    rm -f "$sudoers_tmp"

    if ! sudo visudo -c >/dev/null; then
        sudo rm -f "$SUDOERS_FILE"
        die "The PostgreSQL sudo rule was rejected and has been removed."
    fi
}

start_postgresql() {
    local start_err

    [[ -x "$SYSTEMCTL" ]] || die "PostgreSQL is not running, and systemctl is not available."

    if start_err="$(sudo -n "$SYSTEMCTL" start postgresql 2>&1)"; then
        return
    fi

    if ! sudo_password_required "$start_err"; then
        die "Could not start PostgreSQL: $start_err"
    fi

    install_postgresql_sudo_rule
    sudo -n "$SYSTEMCTL" start postgresql
}

wait_for_database() {
    local _

    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        if db_ready; then
            return
        fi

        sleep 1
    done

    die "PostgreSQL did not start. Check it with: systemctl status postgresql"
}

ensure_database() {
    info "Checking the database."

    if db_ready; then
        info "Database is already running."
        return
    fi

    info "Database is stopped. Starting it."
    start_postgresql
    wait_for_database
    info "Database is running."
}

command -v npm >/dev/null 2>&1 || die "npm is not installed. Run ./setup.sh first."
command -v pg_isready >/dev/null 2>&1 || die "PostgreSQL client tools are not installed. Run ./setup.sh first."

printf '\n'
info "Installing package updates."
npm install

ensure_database

info "Starting Engagement Manager. Leave this window open."
info "Open the Local or Network address printed below."
exec npm run dev
