#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DB_NAME="engagement_manager"
NODE_INSTALL_MAJOR="${NODE_INSTALL_MAJOR:-22}"
APT_PACKAGES=(postgresql postgresql-client postgresql-contrib zip unzip)

NONINTERACTIVE=false
OVERWRITE_ENV=false
SETUP_MODE=""
DB_USER=""
DB_PASSWORD=""
GENERATED_DB_PASSWORD=false

info() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
success() { printf '✓ %s\n' "$*"; }

usage() {
  cat <<EOF
Usage: ./setup.sh [options]

Options:
  -y, --yes, --non-interactive   Run without prompts
  --mode=development|production  Setup mode (default: development)
  --db-user=NAME                 Database username (default: em_admin)
  --db-pass=PASSWORD             Database password
  --overwrite-env                Overwrite an existing .env without prompting
  -h, --help                     Show this help

Non-interactive examples:
  ./setup.sh -y --db-user=em_admin --db-pass='secret'
  ./setup.sh -y --mode=production --overwrite-env
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --non-interactive|--yes|-y)
        NONINTERACTIVE=true
        OVERWRITE_ENV=true
        ;;
      --mode=*)
        SETUP_MODE="${1#*=}"
        ;;
      --db-user=*)
        DB_USER="${1#*=}"
        ;;
      --db-pass=*)
        DB_PASSWORD="${1#*=}"
        ;;
      --overwrite-env)
        OVERWRITE_ENV=true
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1 (use --help)"
        ;;
    esac
    shift
  done
}

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
  (major === 22 && minor >= 12);
process.exit(ok ? 0 : 1);
' >/dev/null 2>&1
}

install_node_from_nodesource() {
  info "Installing Node.js ${NODE_INSTALL_MAJOR}.x from NodeSource..."
  require_command curl
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_INSTALL_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
}

install_system_packages() {
  info "Installing system packages..."
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates gnupg "${APT_PACKAGES[@]}"

  if ! node_version_ok 2>/dev/null; then
    if command -v node >/dev/null 2>&1; then
      warn "Node.js $(node -v) is below the required version."
    else
      warn "Node.js is not installed."
    fi
    install_node_from_nodesource
  fi

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
  for tool in node npm npx psql pg_dump zip unzip openssl python3; do
    require_command "$tool"
    success "$tool available ($(command -v "$tool"))"
  done

  if ! node_version_ok; then
    die "Node.js $(node -v) does not meet package.json engines requirements."
  fi
  success "Node.js version OK ($(node -v))"
}

validate_db_username() {
  local username="$1"
  [[ "$username" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]
}

resolve_setup_mode() {
  if [[ -n "$SETUP_MODE" ]]; then
    case "$SETUP_MODE" in
      development|dev) SETUP_MODE="development" ;;
      production|prod) SETUP_MODE="production" ;;
      *) die "Invalid setup mode: $SETUP_MODE" ;;
    esac
    success "Setup mode: $SETUP_MODE"
    return
  fi

  if $NONINTERACTIVE; then
    SETUP_MODE="development"
    success "Setup mode: $SETUP_MODE (default)"
    return
  fi

  local reply
  printf "Setup mode [development/production] (default: development): "
  read -r reply
  reply="${reply:-development}"
  case "$reply" in
    development|dev) SETUP_MODE="development" ;;
    production|prod) SETUP_MODE="production" ;;
    *) die "Invalid setup mode: $reply" ;;
  esac
  success "Setup mode: $SETUP_MODE"
}

resolve_db_credentials() {
  if $NONINTERACTIVE; then
    DB_USER="${DB_USER:-em_admin}"
    validate_db_username "$DB_USER" || die "Invalid database username: $DB_USER"

    if [[ -z "$DB_PASSWORD" ]]; then
      if [[ "$SETUP_MODE" == "production" ]]; then
        DB_PASSWORD="$(openssl rand -base64 24)"
        GENERATED_DB_PASSWORD=true
        warn "Generated a database password for non-interactive production setup."
      else
        die "Non-interactive mode requires --db-pass=... in development mode."
      fi
    fi

    success "Database credentials configured for user '$DB_USER'"
    return
  fi

  local reply

  while true; do
    printf "Database username (default: em_admin): "
    read -r DB_USER
    DB_USER="${DB_USER:-em_admin}"

    if validate_db_username "$DB_USER"; then
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
  local escaped_role
  escaped_role="$(sql_escape_literal "$role")"

  sudo -u postgres psql -v ON_ERROR_STOP=1 -tA \
    -c "SELECT 1 FROM pg_roles WHERE rolname = '${escaped_role}'" | grep -q 1
}

postgres_database_exists() {
  local db="$1"
  local escaped_db
  escaped_db="$(sql_escape_literal "$db")"

  sudo -u postgres psql -v ON_ERROR_STOP=1 -tA \
    -c "SELECT 1 FROM pg_database WHERE datname = '${escaped_db}'" | grep -q 1
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
    if $OVERWRITE_ENV; then
      warn "Overwriting existing .env"
    else
      local overwrite
      printf ".env already exists. Overwrite? [y/N]: "
      read -r overwrite
      case "$overwrite" in
        y|Y|yes|YES) ;;
        *) die "Aborting to avoid overwriting existing .env." ;;
      esac
    fi
  fi

  encoded_password="$(urlencode "$DB_PASSWORD")"
  jwt_secret="$(openssl rand -base64 32)"
  database_url="postgresql://${DB_USER}:${encoded_password}@localhost:5432/${DB_NAME}?schema=public"

  cat > .env <<EOF
DATABASE_URL="${database_url}"
JWT_SECRET="${jwt_secret}"
EOF

  chmod 600 .env
  success ".env created and secured (600)"
  warn "Review .env and store a backup in a safe location before production use."
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
  Password: use the temporary password printed by the database seed step

Important:
- Change the temporary admin password before exposing this app to others.
- Back up $ROOT_DIR/.env securely; it contains database credentials and JWT_SECRET.
EOF

  if $GENERATED_DB_PASSWORD; then
    cat <<EOF
- Generated database password for '$DB_USER': $DB_PASSWORD
EOF
  fi
}

main() {
  parse_args "$@"

  info "Engagement Manager setup"
  check_os
  require_sudo
  install_system_packages
  ensure_postgresql_running
  validate_cli_tools
  resolve_setup_mode
  resolve_db_credentials
  write_env_file
  create_database_objects
  verify_database_connection
  ensure_runtime_directories
  install_node_dependencies
  run_database_setup
  print_summary
}

main "$@"
