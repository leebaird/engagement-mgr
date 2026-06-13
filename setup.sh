#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DB_NAME="engagement_manager"
APT_PACKAGES=(nodejs npm postgresql postgresql-client postgresql-contrib zip unzip)

info() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
success() { printf '✓ %s\n' "$*"; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_sudo() {
  if ! sudo -n true 2>/dev/null; then
    info "Administrator privileges are required to install system packages and configure PostgreSQL."
    sudo -v || die "sudo access is required."
  fi
}

check_os() {
  if [[ ! -f /etc/os-release ]]; then
    die "This script supports Ubuntu only (/etc/os-release not found)."
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" && "${ID_LIKE:-}" != *"ubuntu"* && "${ID_LIKE:-}" != *"debian"* ]]; then
    die "This script is designed for Ubuntu/Debian. Detected: ${PRETTY_NAME:-unknown OS}."
  fi

  success "OS check passed (${PRETTY_NAME:-Ubuntu})"
}

node_version_ok() {
  node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
const ok =
  major >= 24 ||
  (major === 22 && minor >= 12) ||
  (major === 20 && minor >= 19);
process.exit(ok ? 0 : 1);
' >/dev/null 2>&1
}

install_node_from_nodesource() {
  info "Installing Node.js 22.x from NodeSource..."
  require_command curl
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
}

install_system_packages() {
  info "Installing system packages..."
  sudo apt-get update
  sudo apt-get install -y "${APT_PACKAGES[@]}"
  success "System packages installed"
}

ensure_postgresql_running() {
  info "Ensuring PostgreSQL is running..."
  sudo systemctl enable postgresql >/dev/null 2>&1 || true
  sudo systemctl start postgresql
  success "PostgreSQL service is running"
}

validate_cli_tools() {
  info "Validating required CLI tools..."
  local tool
  for tool in node npm npx psql pg_dump zip unzip openssl; do
    require_command "$tool"
    success "$tool available ($(command -v "$tool"))"
  done

  if ! node_version_ok; then
    die "Node.js $(node -v) does not meet package.json engines requirements."
  fi
  success "Node.js version OK ($(node -v))"
}

prompt_setup_mode() {
  local reply
  printf "Setup mode [development/production] (default: development): "
  read -r reply
  reply="${reply:-development}"
  case "$reply" in
    development|dev)
      SETUP_MODE="development"
      ;;
    production|prod)
      SETUP_MODE="production"
      ;;
    *)
      die "Invalid setup mode: $reply"
      ;;
  esac
  success "Setup mode: $SETUP_MODE"
}

prompt_db_credentials() {
  local reply

  while true; do
    printf "Database username (default: em_admin): "
    read -r DB_USER
    DB_USER="${DB_USER:-em_admin}"

    if [[ "$DB_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
      break
    fi
    warn "Username must start with a letter or underscore and contain only letters, numbers, and underscores."
  done

  while true; do
    printf "Database password: "
    read -rs DB_PASSWORD
    printf '\n'
    if [[ -n "$DB_PASSWORD" ]]; then
      break
    fi
    warn "Password cannot be empty."
  done

  if [[ "$SETUP_MODE" == "production" ]]; then
    printf "Confirm database password: "
    read -rs reply
    printf '\n'
    [[ "$reply" == "$DB_PASSWORD" ]] || die "Passwords do not match."
  fi

  success "Database credentials captured for user '$DB_USER'"
}

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

urlencode() {
  python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

postgres_role_exists() {
  local role="$1"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${role}'" | grep -q 1
}

postgres_database_exists() {
  local db="$1"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1
}

create_database_objects() {
  local escaped_password
  escaped_password="$(sql_escape_literal "$DB_PASSWORD")"

  info "Configuring PostgreSQL role and database..."

  if postgres_role_exists "$DB_USER"; then
    warn "PostgreSQL role '$DB_USER' already exists; updating password."
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER \"${DB_USER}\" WITH ENCRYPTED PASSWORD '${escaped_password}';"
  else
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER \"${DB_USER}\" WITH ENCRYPTED PASSWORD '${escaped_password}';"
  fi

  if [[ "$SETUP_MODE" == "development" ]]; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER \"${DB_USER}\" CREATEDB;"
  fi

  if postgres_database_exists "$DB_NAME"; then
    warn "Database '$DB_NAME' already exists; ensuring ownership and privileges."
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER DATABASE \"${DB_NAME}\" OWNER TO \"${DB_USER}\";"
  else
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
  fi

  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE \"${DB_NAME}\" TO \"${DB_USER}\";"

  success "PostgreSQL role and database are ready"
}

write_env_file() {
  local encoded_password jwt_secret database_url

  if [[ -f .env ]]; then
    local overwrite
    printf ".env already exists. Overwrite? [y/N]: "
    read -r overwrite
    case "$overwrite" in
      y|Y|yes|YES) ;;
      *) die "Aborting to avoid overwriting existing .env." ;;
    esac
  fi

  encoded_password="$(urlencode "$DB_PASSWORD")"
  jwt_secret="$(openssl rand -base64 32)"
  database_url="postgresql://${DB_USER}:${encoded_password}@localhost:5432/${DB_NAME}?schema=public"

  cat > .env <<EOF
DATABASE_URL="${database_url}"
JWT_SECRET="${jwt_secret}"
EOF

  success ".env created"
}

verify_database_connection() {
  info "Verifying database connection..."
  local encoded_password verify_url

  encoded_password="$(urlencode "$DB_PASSWORD")"
  verify_url="postgresql://${DB_USER}:${encoded_password}@localhost:5432/${DB_NAME}"

  psql "$verify_url" -v ON_ERROR_STOP=1 -c "SELECT 1;" >/dev/null
  success "Database connection verified"
}

install_node_dependencies() {
  info "Installing Node.js dependencies..."
  npm install
  success "npm dependencies installed"
}

run_database_setup() {
  info "Applying database migrations..."
  npm run db:migrate
  success "Database migrations applied"

  info "Seeding default admin account (if needed)..."
  npm run db:seed
  success "Database seed complete"
}

ensure_runtime_directories() {
  mkdir -p uploads
  success "Runtime directories ready (uploads/)"
}

print_summary() {
  cat <<EOF

Setup complete.

- App directory: $ROOT_DIR
- Database: $DB_NAME
- Database user: $DB_USER
- Setup mode: $SETUP_MODE
- Environment file: $ROOT_DIR/.env

Start the development server:

  npm run dev

Then open http://localhost:3000 and sign in with:

  Username: admin
  Password: admin

Change the default admin password before exposing this app to others.

EOF
}

main() {
  info "Engagement Manager setup"
  check_os
  require_sudo
  install_system_packages
  ensure_postgresql_running

  if ! node_version_ok 2>/dev/null; then
    if command -v node >/dev/null 2>&1; then
      warn "Node.js $(node -v) is below the required version."
    else
      warn "Node.js is not installed."
    fi
    install_node_from_nodesource
  fi

  validate_cli_tools
  prompt_setup_mode
  prompt_db_credentials
  write_env_file
  create_database_objects
  verify_database_connection
  ensure_runtime_directories
  install_node_dependencies
  run_database_setup
  print_summary
}

main "$@"