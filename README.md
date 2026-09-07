# Engagement Manager

Engagement Manager is a web application for tracking offensive security engagements. It features a modern UI, built with Next.js, Prisma, and PostgreSQL. The app includes a calendar, engagements, clients, contacts, findings, and operators.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/leebaird/engagement-mgr/blob/main/LICENSE.txt)

* [![Twitter Follow](https://img.shields.io/twitter/follow/discoverscripts.svg?style=social&label=Follow)](https://twitter.com/discoverscripts) Lee Baird @discoverscripts
* [![Twitter Follow](https://img.shields.io/twitter/follow/jay_townsend1.svg?style=social&label=Follow)](https://twitter.com/jay_townsend1) Jay "L1ghtn1ng" Townsend @jay_townsend1

## Table of contents

- [Writing findings and producing PDF reports](#writing-findings-and-producing-pdf-reports)
  - [Reporting security and deployment](#reporting-security-and-deployment)
  - [Verification](#verification)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
  - [Development](#development)
  - [Production](#production)
- [Installation](#installation)
  - [Automated setup (Ubuntu)](#automated-setup-ubuntu)
    - [Upgrade notes for hardened setup and backups](#upgrade-notes-for-hardened-setup-and-backups)
  - [Manual setup](#manual-setup)
- [Running the Application](#running-the-application)
- [Production Deployment](#production-deployment)
  - [Requirements](#requirements)
  - [Deploy steps](#deploy-steps)
  - [Production checklist](#production-checklist)
- [Default Credentials](#default-credentials)
- [Server migration (Backup / Restore / Reset)](#server-migration-backup--restore--reset)
- [Implementation Plan & Architecture](#implementation-plan--architecture)
  - [Technology Stack](#technology-stack)
  - [Database Schema](#database-schema)
  - [Adding New Fields](#adding-new-fields)
  - [Security Architecture](#security-architecture)

## Writing findings and producing PDF reports

- **Writing workspace:** open a finding's **Write & review** link for Markdown editing and a safe preview. Private drafts save after 15 seconds of inactivity or on demand; they are stored on the server, not in browser local storage. Recover a draft explicitly after reopening. Conflicting saves preserve the editor's text and require comparison with the current revision. Text revisions can be inspected and restored; restoring does not restore deleted evidence.
- **Reusable templates:** search approved wording by title, category or severity. Users can propose templates; administrators curate and approve them. Applying a template creates an independent engagement finding with empty observations, affected hosts and evidence, preventing accidental reuse of another engagement's proof.
- **Evidence:** upload or paste up to four PNG/JPEG images together, add captions, and edit caption/order in the writing workspace. Images are decoded, stripped of metadata, resized to at most 2000 × 2000 pixels, and saved as PNG. Keep original forensic evidence separately if original bytes or metadata are required.
- **Review:** send complete findings from Draft/Changes Requested to Ready. An assigned reviewer or administrator, other than the current author, can approve or request changes. Administrators assign reviewers. Text, evidence and restored-revision changes clear approval. The review queue, comments, readiness checklist and revision history support hand-off.
- **PDF reports:** choose an engagement in Reports, write its executive summary, select/order findings and save settings. Draft PDFs are visibly marked. Only administrators can issue a final PDF, and every selected finding must be approved and pass readiness checks. Each issued version stores its PDF, explicit content snapshot and SHA-256 digest; later edits do not regenerate it. Deleting the parent engagement still deletes its reports through the existing lifecycle.
- **Scanner imports:** preview an export, select findings, then confirm. Imports never execute scans or contact targets. Server-side fingerprinting skips matching findings in the same engagement; all new records start as Draft and must be checked by an operator.

| Scanner/export family | Accepted export |
| --- | --- |
| Burp Suite | Issues XML, including the inert internal schema DTD |
| Nessus / Tenable | Nessus v2 XML (`.nessus`) |
| Nmap | XML; open ports and their script output become informational observations, not inferred vulnerabilities |
| OpenVAS / Greenbone | Native XML report or GMP `get_reports_response` |
| OWASP ZAP | Traditional JSON report with sites and alerts |
| Nuclei | JSON Lines (`-jsonl`) |
| Qualys | Scan-result XML (`SCAN/IP` structure), not the separate host-detection API format |
| Semgrep / CodeQL and other SARIF producers | SARIF JSON runs, rules and results |

Exports are limited to 2 MB and 500 findings per import, with per-user preview and confirmation rate limits. The application accepts at most 10,000 findings in total and 500 for one engagement across manual creation, templates and scanner imports. The global Findings list loads 100 rows per page, and engagement/report finding queries are capped by the same per-engagement limit. Unknown layouts fail visibly rather than silently being treated as a successful import. Scanner severities are suggestions: review their context before approval. Referenced URLs, HTML and embedded remote images are not fetched or executed.

Reports allow 1–100 findings, up to 100 evidence images (5 MB each, 20 MB total input), 500 pages and 25 MB output. Issuance is limited to 50 versions per engagement and 1 GB of issued PDFs across the application. Preview and issuance have per-user rate limits, and only one PDF render is admitted per application process at a time. Findings retain at most 1000 revisions and 500 comments; reaching a limit fails without overwriting history. DejaVu fonts and their redistribution license are included in `assets/fonts`; deployments must retain these assets (Next output tracing includes them).

Next.js Server Actions share a single `25mb` body size limit (set in `next.config.ts`) for evidence uploads. Login uses a dedicated same-origin URL-encoded route with a 4 KB streaming limit before authentication or database work.

### Reporting security and deployment

This preserves the existing **shared authenticated workspace**, not a new per-client tenancy model. All new pages, actions and PDF downloads check a current database-backed session. Drafts are scoped to their owner; review, template approval and issuance permissions are enforced server-side. Confidential PDF responses are private/no-store. Final PDFs contain only an explicit report field allowlist, never private drafts, review comments or unrelated engagements.

The implementation uses the [OWASP Top 10:2025](https://owasp.org/Top10/2025/) checklist: access checks (A01), private responses and existing CSP/CSRF controls (A02), pinned dependencies and CI (A03), existing session/secret protections plus report integrity checks (A04/A08), inert Markdown/XML and parameterized database access (A05), bounded processing and independent review (A06), live session checks (A07), content-free audit events (A09), and transactional changes with cleanup on failure (A10). A digest detects accidental corruption; it is not a digital signature or protection from a database administrator. This is not a compliance certification. Production still requires HTTPS, protected database/backup storage and operational monitoring of audit output.

Before deploying this upgrade, take a normal application backup and apply the additive `20260904221808_reporting_workflow` and `20260906194500_add_revocable_sessions` migrations with `npm run db:migrate`, then regenerate Prisma Client and rebuild. Existing findings begin as Draft at version 1, and existing browser cookies must sign in again so they receive a server-backed session ID. Do not reset an existing database. Backups include the new tables and issued PDFs through the existing full-database export.

### Verification

```bash
npm test
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm run build
npm audit
```

`npm test` uses Node's non-isolated test mode with `tsx` so the individual TypeScript test cases execute, rather than merely reporting file subprocess success. Keep the explicit assertion totals visible in CI.

Database and browser regressions require a **dedicated local database named `reporting_tests`**, with migrations applied. They create and delete their own fixture rows; never point these tests at an application database. Set `REPORTING_TEST_DATABASE_URL` to that test database, then run:

```bash
DATABASE_URL="$REPORTING_TEST_DATABASE_URL" npx prisma migrate deploy
npm run test:reporting
npx playwright install chromium
npm run test:browser
```

The browser suite starts its own loopback development server on port 3317 with a test-only session secret; it refuses to reuse an existing server. Set `REPORTING_TEST_BROWSER` to an installed Chromium executable if desired. It tests draft privacy, conflicting edits, evidence upload, independent review, PDF permissions/immutability, template creation without JavaScript, and selective deduplicated imports. Integration tests exercise actual transactional conflicts and rollback. The suites do not replace remote-LAN, Safari or production-deployment verification.

## Prerequisites

This application is designed to run on Ubuntu, and requires the following:

```bash
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-client postgresql-contrib zip
```

`postgresql-client` provides `pg_dump`, `pg_restore`, and `psql`; `zip` creates backup archives. Restore extraction is handled by the application with strict entry and size validation.

Installing the packages does not always leave PostgreSQL running. Start and enable the service before creating roles or starting the app:

```bash
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
```

If the app later fails with `Can't reach database server at 127.0.0.1:5432`, run `sudo systemctl start postgresql` and confirm with `pg_isready -h 127.0.0.1 -p 5432`.

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
| `TRUST_PROXY` | No | Set to `1` (or `true`) only when the app is behind a reverse proxy that **overwrites** `X-Forwarded-For` / `X-Real-IP` and `X-Forwarded-Host`. Login origin checks use `X-Forwarded-Host` when present in this mode; it must contain one public host, including a non-default port when used. Otherwise the proxy must preserve the public `Host` header. This is the required production topology for accurate per-source login limits. When unset, headers are ignored to prevent spoofing and login uses a higher one-minute shared fallback budget so one client cannot impose a 15-minute global lockout. |
| `ALLOWED_DEV_ORIGINS` | No | **Development only.** Extra hostnames allowed to load `/_next` assets (comma-separated). The server’s current LAN IPv4 addresses are allowed automatically. Use this for a stable DNS name. Production builds ignore this. |

Generate a strong secret:

```bash
openssl rand -base64 32
```

## Database Setup

Make sure PostgreSQL is running first (see [Prerequisites](#prerequisites)). Automated `./setup.sh` starts the service for you; the manual steps below assume it is already up.

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

The script installs prerequisites, starts and enables the PostgreSQL service, prompts for a database username and password, writes a `chmod 600` `.env`, creates the PostgreSQL role and database, applies migrations, and seeds the default admin account. Production mode also completes `npm run build` and prints only the production start command. It does not install Node.js from a remote shell script; install a supported Node.js release first.

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

PostgreSQL must be running before you start the app (`sudo systemctl start postgresql` if needed). Then start the development server:

```bash
npm run dev
```

Startup prints both a loopback URL and this machine’s LAN address:

```
- Local:         http://localhost:3000
- Network:       http://192.168.1.20:3000
```

`npm run dev` and `npm start` bind `0.0.0.0` so the Network URL works on the LAN. Treat LAN access as lab-only on a trusted network. Dev mode is not hardened for the public internet.

If you open the app by **hostname** (not IP) and the remote browser is a blank white page, add that name to `.env` and restart:

```bash
ALLOWED_DEV_ORIGINS=dev.office.example
```

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

- The sidebar stores each browser's date format and time zone preference locally. Time zone can follow the viewer's operating system or display timestamps in UTC; engagement schedule dates remain unchanged calendar dates.
- Admin can back up and restore the full application data from the **Admin** page (`/dashboard/users`).
- Use this when moving from an old server to a new one: clone the app on the new host, then restore a backup from the old host.

On **Admin**, the **Database** panel shows **Backup**, **Restore**, and **Reset** buttons. The **Users** panel lists accounts and provides a **New User** button for adding users. The **Appearance** panel lets an admin choose the application-wide highlight colour.

**Backup** requires your admin password, then saves a `.zip` named `em-backup-YYYY-MM-DD-HH-MM-SS-RANDOM.zip` to `~/engagement-mgr-backups/` on the server (the home directory of the user running the app). After a successful export, use **Download copy** on the Admin page. A short-lived signed grant is held in an `HttpOnly` cookie and only works for the admin who created the backup.

- The timestamp uses the **local time** of the server running the app and the random suffix prevents collisions between rapid exports. Example: `em-backup-2026-06-02-14-30-45-a1b2c3d4e5f6.zip`.

| Path | Contents |
|------|----------|
| `engagement-manager-backup/database.dump` | Full PostgreSQL custom-format dump (schema, tables, data, enums, relations) from `pg_dump` |
| `engagement-manager-backup/uploads/` | Finding screenshot files referenced in the database |

- **Restore** accepts only a `.zip` created by **Backup** and replaces the current database and `uploads/` folder. Browser restore is limited to 8 MB so decompression cannot monopolise the web process. For a larger archive, stop the application and run `npm run db:restore -- /absolute/path/to/em-backup.zip` as the application user. The offline command loads `.env` from the working directory and requires a non-empty `DATABASE_URL` in `.env` or the environment. It accepts regular files up to 500 MB and streams each archive entry through its expanded-size limit. The database restore runs in one transaction; archive entry counts, paths, compression ratios, and expanded sizes are validated before files are installed. Backup, restore, reset, and screenshot file changes share an exclusive maintenance lock so database commits and filesystem swaps cannot overlap. Requires your admin password to confirm.
- **Reset** wipes all application data, restores the default pink highlight colour, and recreates `admin`. Requires typing `RESET` and re-entering the confirming administrator's current password. That password becomes the recreated account's temporary password and must be changed on first login.

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

Reporting additions: **Finding** also stores `version`, `reviewStatus`, `authorId`, `reviewerId`, `templateId`, and `importFingerprint`; **Screenshot** stores `sortOrder`. **FindingTemplate** holds reviewed reusable wording; **FindingRevision** holds immutable text revisions; **FindingDraft** holds private per-user drafts with conflict versions; **FindingComment** records review discussions; **EngagementReport** holds report title, executive summary and ordered finding IDs; **IssuedReport** stores an immutable PDF, content snapshot and SHA-256 digest for each issued version. User author/reviewer relationships use `SetNull`; private drafts are removed when their user is removed. Reporting records follow their parent engagement/finding lifecycle.

- **User**: `id`, `username`, `passwordHash`, `role` (Admin, User), `lastPasswordChange`, `lastLogin`, `sessions`, `createdAt`, `updatedAt`.
- **Session**: `id`, `userId`, `expiresAt`, `createdAt` — server-side records make each signed login session individually revocable on logout.
- **LoginRateLimit**: `key`, `count`, `resetAt` — atomic source and password-confirmation attempt reservations. Password verification also has a bounded concurrency limit.
- **ApplicationSetting**: singleton application-wide settings record with `highlightColor` (Pink, Blue, Teal, Green, Purple, or Amber) and `updatedAt`.
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

1. **Authentication & Accounts**: Default `admin` account is generated via Prisma seed. `Admin` roles have full create/edit/delete access to all records. `User` roles can create, edit, and delete findings and screenshots; all other entities (engagements, clients, contacts, operators) are read-only for users. Every dashboard page refreshes the session against the database before reading confidential data. Only admins can access the Admin page (`/dashboard/users`), manage accounts, change the application-wide highlight colour, and back up, restore, or reset the database. Backup, restore, and reset require password re-confirmation. Creating a backup is a Server Action; browser download uses `GET /api/db/backup?file=…` with the Admin session and a five-minute signed grant in an `HttpOnly` cookie.
2. **Session Management**: Sessions use `jose` JWTs stored in `HttpOnly`, `SameSite=Lax` cookies and a matching server-side `Session` row that logout revokes. Cookie expiration is intentionally omitted to keep browser-session behavior; both the signed token and database record expire after one day. Transactional admission retains at most ten active sessions per account.
3. **Application Security**:
   - Next.js Edge Proxy (`src/proxy.ts`) enforces session checks and 90-day password rotation across all protected routes.
   - Next.js Server Actions reduce CSRF risk with built-in same-origin protections.
   - Prisma automatically mitigates SQL injection by parameterizing all queries.
   - React mitigates XSS by automatically escaping HTML elements on render.
   - Screenshots are stored with owner-only permissions and bounded aggregate/per-finding quotas. Deletion uses recoverable pending markers; dashboard startup, uploads, and backups reconcile disk files against database references, with cleanup failures recorded in audit output, detailed errors in server logs, and a warning shown to administrators. Failed dashboard reconciliation retries at most once per minute per process; uploads and backups still validate storage immediately. The authenticated `/api/uploads` route prevents IDOR and returns `no-store` responses.
