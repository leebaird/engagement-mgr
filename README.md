# Engagement Manager

Engagement Manager is a web application for tracking offensive security engagements. It features a modern UI, built with Next.js, Prisma, and PostgreSQL.

## Prerequisites

Before running the application on Ubuntu, install the following prerequisities:
```bash
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-client postgresql-contrib unzip zip
```

## Environment Configuration

Create a `.env` file in the project root before running Prisma or the app:

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://em_admin:em_pass@localhost:5432/engagement_manager?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
EOF
```

Prisma uses the `schema=public` query parameter in `DATABASE_URL`. Backup and restore strip Prisma-only parameters before calling `pg_dump` or `psql`.

## Database Setup

Run the following commands to create the PostgreSQL database and user:

```bash
sudo -u postgres psql -c "CREATE USER em_admin WITH ENCRYPTED PASSWORD 'em_pass';"
sudo -u postgres psql -c "ALTER USER em_admin CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE engagement_manager;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE engagement_manager TO em_admin;"
sudo -u postgres psql -c "ALTER DATABASE engagement_manager OWNER TO em_admin;"
```

> **Note:** The database files are stored in the PostgreSQL data directory (typically `/var/lib/postgresql/<version>/main/`).

## Installation

1. Install Node.js dependencies:

   ```bash
   npm install
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

## Default Credentials

After seeding the database, you can log in using the default admin account:

- **Username**: `admin`
- **Password**: `admin`

> **Note:** Upon logging in, you will be required to change this password after 90 days.
- All new passwords must be at least 16 characters long, include an uppercase letter, lowercase letter, number, and a symbol.

## Server migration (Backup / Restore / Reset)

- Admin can back up and restore the full application data from the **Admin* page.
- Use this when moving from an old server to a new one: clone the app on the new host, then restore a backup from the old host.

On **Admin**, the **Database** section shows **Backup**, **Restore**, and **Reset** buttons. **New Record** stays in the header for adding users.

**Backup** saves a `.zip` download named `em-backup-YYYY-MM-DD-HH-MM.zip`.
- The timestamp uses the **local time** of the server running the app (year, month, day, hour, and minute). Example: `em-backup-2026-06-02-14-30.zip`.

| Path | Contents |
|------|----------|
| `engagement-manager-backup/database.sql` | Full PostgreSQL dump (schema, tables, data, enums, relations) from `pg_dump` |
| `engagement-manager-backup/uploads/` | Finding screenshot files referenced in the database |

- **Restore** accepts the `.zip` from **Backup** and replaces the current database and `uploads/` folder. A plain `.sql` file restores the database only (no screenshots).
- **Reset** wipes all data and recreates the default `admin` account.

**Old server**

1. Log in as an **Admin** user.
2. Open **Admin** and click **Backup** (under **Database**).
3. Save the `.zip` and copy it to the new server (for example with `scp` or `rsync`):

   ```bash
   scp em-backup-2026-06-02-14-30.zip user@new-server:/path/to/
   ```

**New server**

1. Install prerequisites (Node.js, PostgreSQL, `zip`, `unzip`) and clone the repository.
2. Create `.env` with `DATABASE_URL` and `JWT_SECRET` (see [Environment Configuration](#environment-configuration)).
3. Create an empty PostgreSQL database and user (see [Database Setup](#database-setup)).
4. Install dependencies: `npm install`.
5. **Do not** run `npx prisma migrate dev` or `npx prisma db seed` before importing — the SQL dump creates schema and data.
6. Start the app: `npm run dev` (or your production process).
7. Log in as an admin. If the database is empty, run `npx prisma db seed` once so you can reach the UI (`admin` / `admin`); the import step replaces that data with the backup.
8. Open **Users**, click **Restore** (under **Database**) to select the `.zip` from the old server, and confirm.
9. Restart the app if it was already running so it picks up the restored data.

**Notes**

- **Destructive actions:** Restore and Reset replace all existing database rows and overwrite the `uploads/` directory.
- **JWT_SECRET:** May differ on the new server; existing browser sessions from the old server are not migrated. Users sign in again with accounts from the imported database.
- **Application code:** Use `git clone` (or deploy the same revision) on the new server so the app matches the schema expected by the backup. If the old server ran a newer schema than the cloned code, align versions before importing.
- **Tools:** Backup and restore require `pg_dump`, `psql`, `zip`, and `unzip` on the server where the app runs.

## Implementation Plan & Architecture

This section documents the architecture, database schema, security measures, and completed development phases for the Engagement Manager application.

### Technology Stack

- **Full-Stack Framework**: Next.js 16+ (React) using the App Router.
- **Database**: PostgreSQL.
- **ORM**: Prisma.
- **Authentication**: Custom implementation using strict session cookies (cleared on browser close) and Argon2id for password hashing. Passwords enforce a minimum 16 characters, with mandatory symbols, numbers, and mixed case.
- **Styling**: Vanilla CSS with a glassmorphism dark-mode aesthetic on page panels; modals are fully opaque via `Modal.tsx` and `.modal-panel` in `globals.css`.

### Database Schema

- **User**: `id`, `username`, `passwordHash`, `role` (ADMIN, USER), `lastPasswordChange`, `lastLogin`, `createdAt`, `updatedAt`.
- **Engagement**: `id`, `codeName`, `clientId`, `chargeCode`, `status` (PLANNING, ROE, PREP, LIVE, REPORTING, COMPLETE), `focus`, `type` (AI, CODE_REVIEW, FIREWALL, MULTI, PENTEST, PHISHING, PHYSICAL, PURPLE_TEAM, RED_TEAM, USB_DROP, VISHING, WEB_APP, WIRELESS), `location` (INTERNAL, EXTERNAL), `startDate`, `endDate`, `objectives`, `targets`, `exclusions`, `notes`, `operators` (M:N), `contacts`/`trustedAgents` (M:N with Contact), `findings`, `findingContexts`, `createdAt`, `updatedAt`.
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

   `npx prisma db push` — to update the database

   `npx prisma generate` — to update the Prisma Client types

3. Update any affected UI components, forms, validation logic, or server actions as needed.

### Security Architecture

1. **Authentication & Accounts**: Default `admin` account is generated via Prisma seed. Only `ADMIN` roles can access the `/users` endpoint to create new accounts (the UI dynamically hides the Users navigation button from non-admins). Only admins can back up, restore, or reset the database from the Users page.
2. **Session Management**: Sessions are managed via `jose` JWTs stored in `HttpOnly`, `SameSite=Lax` cookies. Cookie expiration is intentionally omitted to keep browser-session behavior, and JWT payloads currently use a 1-day expiration.
3. **Application Security**:
   - Next.js Edge Proxy (`src/proxy.ts`) enforces session checks and 90-day password rotation across all protected routes.
   - Next.js Server Actions reduce CSRF risk with built-in same-origin protections.
   - Prisma automatically mitigates SQL injection by parameterizing all queries.
   - React mitigates XSS by automatically escaping HTML elements on render.
   - Screenshots are securely stored on the local file system in `/uploads` and are served via an authenticated `/api/uploads` route to prevent IDOR vulnerabilities.
