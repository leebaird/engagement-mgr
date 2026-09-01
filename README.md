# Engagement Manager

Engagement Manager is a web application for tracking offensive security engagements. It features a modern UI, built with Next.js, Prisma, and PostgreSQL. The dashboard includes an engagement schedule calendar; other sections cover engagements, clients, contacts, findings, and operators.

## Prerequisites

This application is designed to run on Ubuntu, and requires the following:

```bash
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-client postgresql-contrib zip
```

`postgresql-client` provides `pg_dump`, `pg_restore`, and `psql`; `zip` creates backup archives. Restore extraction is handled by the application with strict entry and size validation.

The app requires Node.js `^22.12.0` or `>=24.0.0` (see `engines` in `package.json`). If the OS package is older, install a supported release from a trusted package source whose signatures you verify before running `setup.sh`.

## Environment Configuration

Create a `.env` file in the project root before running Prisma or the app:

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://em_admin:em_pass@localhost:5432/engagement_manager?schema=public"
JWT_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
EOF
chmod 600 .env
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Prisma uses the `schema=public` query parameter. Backup and restore use an owner-only temporary pgpass file so the password is not placed in subprocess arguments. |
| `JWT_SECRET` | Yes in production | Must be at least **32 characters**. The app refuses to start in production without it. Rotating this invalidates all existing sessions. |
| `TRUST_PROXY` | No | Set to `1` (or `true`) only when the app is behind a reverse proxy that **overwrites** `X-Forwarded-For` / `X-Real-IP`. When unset, those headers are ignored for rate limiting and audit IPs so clients cannot spoof them. |

Generate a strong secret:

```bash
openssl rand -base64 32
```

## Database Setup

### Development

Run the following commands to create the PostgreSQL database and user:

```bash
sudo -u postgres createuser --pwprompt em_admin
sudo -u postgres psql -c "ALTER USER em_admin CREATEDB;"
sudo -u postgres createdb --owner=em_admin engagement_manager
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE engagement_manager TO em_admin;"
```

### Production

Use a dedicated database user with **least privilege** — do not grant `CREATEDB` or superuser rights:

```bash
sudo -u postgres createuser --pwprompt em_app
sudo -u postgres createdb --owner=em_app engagement_manager
```

Set `DATABASE_URL` to use `em_app` (or your chosen username). Migrations run as this user via `npm run db:migrate`.

> **Note:** The database files are stored in the PostgreSQL data directory (typically `/var/lib/postgresql/<version>/main/`).

## Installation

### Automated setup (Ubuntu)

From the repository root, run:

```bash
chmod +x setup.sh
./setup.sh
```

The script installs prerequisites, prompts for a database username and password, writes a `chmod 600` `.env`, creates the PostgreSQL role and database, applies migrations, and seeds the default admin account. It does not install Node.js from a remote shell script; install a supported Node.js release first.

For headless or CI use:

```bash
sudo install -d -m 700 -o "$USER" /secure
openssl rand -base64 24 > /secure/db-password
chmod 600 /secure/db-password
./setup.sh -y --db-user=em_admin --db-pass-file=/secure/db-password
```

Run `./setup.sh --help` for all options.

#### Upgrade notes for hardened setup and backups

- `--db-pass=...` was removed because command-line secrets are visible to other processes. Put the password in an owner-only file and replace the old argument with `--db-pass-file=/secure/db-password`; the automated setup example above is copy-paste ready.
- `setup.sh` no longer installs Node.js. Install a supported Node.js release (`^22.12.0` or `>=24.0.0`) from a trusted package source before running it.
- Dependency installation now uses `npm ci`, so `package-lock.json` must be present and in sync with `package.json`.
- Legacy `.sql` backups cannot be restored. Before retiring an old server, upgrade it to a version that can create the structured application backup and re-export the data as a `.zip`.

### Manual setup

1. Install Node.js dependencies:

   ```bash
   npm ci
   ```

2. Run database migrations to build the tables:

   ```bash
   npx prisma migrate dev
   ```

3. Seed the database to create the default Admin account:

   ```bash
   npx prisma db seed
   ```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

To expose the dev server on your LAN (for example, testing from another device on the same network), bind to all interfaces:

```bash
npx next dev -H 0.0.0.0
```

Then open `http://<this-machine-ip>:3000` from the other device. Use this only on trusted networks — dev mode is not hardened for production.

## Production Deployment

### Requirements

- **Node.js** `^22.12.0` or `>=24.0.0` (see `engines` in `package.json`)
- **PostgreSQL** with a least-privilege app user (see [Database Setup](#database-setup))
- **HTTPS** in front of the app (reverse proxy such as nginx or Caddy). Session cookies are marked `Secure` in production.
- **Persistent storage** for the `uploads/` directory (finding screenshots)

### Deploy steps

1. Clone the repository and install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env` with production values (`DATABASE_URL`, `JWT_SECRET` ≥ 32 characters).

3. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

4. Run pre-deploy checks:

   ```bash
   npm run audit
   npm run typecheck
   npm run build
   ```

5. Start the application with `NODE_ENV=production`:

   ```bash
   NODE_ENV=production npm run start
   ```

   For a real server, run this under a process manager (systemd, PM2, etc.) and place a reverse proxy in front for TLS termination.

6. Create the first admin account through the database seed (development only) or by restoring from a backup. **Change the temporary seed password immediately** before exposing the app to users.

### Production checklist

- [ ] `JWT_SECRET` is at least 32 characters and not committed to git
- [ ] `NODE_ENV=production` is set for the running process
- [ ] HTTPS is configured; HTTP redirects to HTTPS
- [ ] Database user has no `CREATEDB` or superuser privileges
- [ ] `uploads/` is on persistent disk and included in backups
- [ ] `~/engagement-mgr-backups/` is on persistent disk if admins use Backup
- [ ] `pg_dump`, `pg_restore`, and `zip` are available if admins will use Backup/Restore

## Default Credentials

After seeding the database, you can log in using the generated temporary admin account:

- **Username**: `admin`
- **Password**: written once to owner-only `initial-admin-credentials.txt` by `npx prisma db seed` / `npm run db:seed`

> **Note:** You will be required to change this temporary password on first login. Delete `initial-admin-credentials.txt` immediately afterward. All passwords must be at least 16 characters and include an uppercase letter, lowercase letter, number, and a symbol.

## Server migration (Backup / Restore / Reset)

- Admin can back up and restore the full application data from the **Admin** page (`/dashboard/users`).
- Use this when moving from an old server to a new one: clone the app on the new host, then restore a backup from the old host.

On **Admin**, the **Database** panel shows **Backup**, **Restore**, and **Reset** buttons. The **Users** panel lists accounts and provides a **New User** button for adding users.

**Backup** requires your admin password, then saves a `.zip` named `em-backup-YYYY-MM-DD-HH-MM-SS-RANDOM.zip` to `~/engagement-mgr-backups/` on the server (the home directory of the user running the app). After a successful export, use **Download copy** on the Admin page. A short-lived signed grant is held in an `HttpOnly` cookie and only works for the admin who created the backup.

- The timestamp uses the **local time** of the server running the app and the random suffix prevents collisions between rapid exports. Example: `em-backup-2026-06-02-14-30-45-a1b2c3d4e5f6.zip`.

| Path | Contents |
|------|----------|
| `engagement-manager-backup/database.dump` | Full PostgreSQL custom-format dump (schema, tables, data, enums, relations) from `pg_dump` |
| `engagement-manager-backup/uploads/` | Finding screenshot files referenced in the database |

- **Restore** accepts only a `.zip` created by **Backup** and replaces the current database and `uploads/` folder. The database restore runs in one transaction; archive entry counts, paths, compression ratios, and expanded sizes are validated before files are installed. Backup, restore, reset, and screenshot file changes share an exclusive maintenance lock so database commits and filesystem swaps cannot overlap. Requires your admin password to confirm.
- **Reset** wipes all application data and recreates `admin`. Requires typing `RESET` and re-entering the confirming administrator's current password. That password becomes the recreated account's temporary password and must be changed on first login.

**Old server**

1. Log in as an **Admin** user.
2. Open **Admin** and click **Backup** (under **Database**).
3. Save the `.zip` and copy it to the new server (for example with `scp` or `rsync`):

   ```bash
   scp em-backup-2026-06-02-14-30-45-a1b2c3d4e5f6.zip user@new-server:/path/to/
   ```

**New server**

1. Install [Prerequisites](#prerequisites) and clone the repository.
2. Create `.env` with `DATABASE_URL` and `JWT_SECRET` (see [Environment Configuration](#environment-configuration)).
3. Create an empty PostgreSQL database and user (see [Database Setup](#database-setup)).
4. Install dependencies: `npm ci`.
5. Run migrations and seed once so an Admin can sign in. Restore replaces this bootstrap data with the backup.
6. Build and start the app in production mode (see [Production Deployment](#production-deployment)):

   ```bash
   npm run build
   NODE_ENV=production npm run start
   ```

7. Log in as `admin` using the owner-only `initial-admin-credentials.txt`, change the temporary password, and delete the credentials file.
8. Open **Admin** (`/dashboard/users`), click **Restore** (under **Database**), select the `.zip` from the old server, enter your admin password, and confirm.
9. Restart the app if it was already running so it picks up the restored data.

**Notes**

- **Sensitive actions:** Backup, Restore, and Reset all require admin password re-confirmation. Restore and Reset also replace existing database rows and overwrite the `uploads/` directory.
- **JWT_SECRET:** May differ on the new server; existing browser sessions from the old server are not migrated. Users sign in again with accounts from the imported database.
- **Application code:** Use `git clone` (or deploy the same revision) on the new server so the app matches the schema expected by the backup. If the old server ran a newer schema than the cloned code, align versions before importing.
- **Tools:** Backup and restore require the CLI tools installed in [Prerequisites](#prerequisites).

## Implementation Plan & Architecture

This section documents the architecture, database schema, security measures, and completed development phases for the Engagement Manager application.

### Technology Stack

- **Full-Stack Framework**: Next.js 16+ (React) using the App Router.
- **Database**: PostgreSQL.
- **ORM**: Prisma.
- **Authentication**: Custom implementation using strict session cookies (cleared on browser close) and Argon2id for password hashing. Passwords enforce a minimum 16 characters, with mandatory symbols, numbers, and mixed case.
- **Styling**: Vanilla CSS with a glassmorphism dark-mode aesthetic on page panels; modals are fully opaque via `Modal.tsx` and `.modal-panel` in `globals.css`.

### Database Schema

- **User**: `id`, `username`, `passwordHash`, `role` (Admin, User), `lastPasswordChange`, `lastLogin`, `createdAt`, `updatedAt`.
- **LoginRateLimit**: `key`, `count`, `resetAt` — atomic source and password-confirmation attempt reservations. Password verification also has a bounded concurrency limit.
- **Engagement**: `id`, `codeName`, `clientId`, `chargeCode`, `status` (Prep, Recon, Testing, Reporting, Complete), `focus`, `type` (AI, Code_Review, Firewall, Multi, Pentest, Phishing, Physical, Purple_Team, Red_Team, USB_Drop, Vishing, Web_App, Wireless), `location` (Internal, External), `startPrep`, `endPrep`, `startRecon`, `endRecon`, `startTesting`, `endTesting`, `startReporting`, `endReporting`, `outbrief`, `objectives`, `targets`, `exclusions`, `notes`, `operators` (M:N), `contacts`/`trustedAgents` (M:N with Contact), `findings`, `findingContexts`, `createdAt`, `updatedAt`.
- **Client**: `id`, `company` (DB column: `companyName`), `address`, `city`, `state`, `zip`, `phone` (DB column: `phoneNumber`), `website`, `notes`, `contacts`, `engagements`, `createdAt`, `updatedAt`.
- **Contact**: `id`, `clientId`, `name`, `title`, `email`, `phone` (DB column: `phoneNumber`), `notes`, `assignedEngagements`, `trustedEngagements`, `createdAt`, `updatedAt`.
- **Finding**: `id`, `engagementId` (optional), `title`, `category`, `severity`, `background`, `remediation`, `supportingData` (DB column: `supportingLinks`), `screenshots`, `engagementContext`, `createdAt`, `updatedAt`.
- **EngagementFindingContext**: `id`, `engagementId`, `findingId`, `observation`, `affectedHosts`, `createdAt`, `updatedAt`.
- **Screenshot**: `id`, `findingId`, `filePath`, `description`, `createdAt`.
- **Operator**: `id`, `name`, `title`, `email`, `phoneNumber`, `discord`, `github`, `notes`, `engagements` (M:N), `createdAt`, `updatedAt`.

### Adding New Fields

To add a new field to an existing model (e.g., `focus` on `Engagement`):

1. Open `prisma/schema.prisma` and add the field to the desired model:

   ```prisma
   model Engagement {
     id              String @id @default(uuid())
     codeName        String
     focus           String?   // new field
     ...
   }
   ```

2. Every change to `prisma/schema.prisma` must be followed with:

   ```bash
   npx prisma migrate dev --name describe_your_change
   ```

   This creates a migration, updates the database, and regenerates the Prisma Client types.

3. Update any affected UI components, forms, validation logic, or server actions as needed.

### Security Architecture

1. **Authentication & Accounts**: Default `admin` account is generated via Prisma seed. `Admin` roles have full create/edit/delete access to all records. `User` roles can create, edit, and delete findings and screenshots; all other entities (engagements, clients, contacts, operators) are read-only for users. Every dashboard page refreshes the session against the database before reading confidential data. Only admins can access the Admin page (`/dashboard/users`), manage accounts, and back up, restore, or reset the database. Backup, restore, and reset require password re-confirmation. Creating a backup is a Server Action; browser download uses `GET /api/db/backup?file=…` with the Admin session and a five-minute signed grant in an `HttpOnly` cookie.
2. **Session Management**: Sessions are managed via `jose` JWTs stored in `HttpOnly`, `SameSite=Lax` cookies. Cookie expiration is intentionally omitted to keep browser-session behavior, and JWT payloads currently use a 1-day expiration.
3. **Application Security**:
   - Next.js Edge Proxy (`src/proxy.ts`) enforces session checks and 90-day password rotation across all protected routes.
   - Next.js Server Actions reduce CSRF risk with built-in same-origin protections.
   - Prisma automatically mitigates SQL injection by parameterizing all queries.
   - React mitigates XSS by automatically escaping HTML elements on render.
   - Screenshots are stored with owner-only permissions and bounded aggregate/per-finding quotas. The authenticated `/api/uploads` route prevents IDOR and returns `no-store` responses.
