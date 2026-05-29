# Engagement Manager

Engagement Manager is a web application for tracking offensive security engagements. It features a modern UI, built with Next.js, Prisma, and PostgreSQL.

## Prerequisites

Before running the application, ensure you have the necessary dependencies installed on your Ubuntu system:

```bash
sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-contrib
```

## Environment Configuration

Create a `.env` file in the project root before running Prisma or the app:

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://em_admin:em_pass@localhost:5432/engagement_manager"
JWT_SECRET="replace-with-a-long-random-secret"
EOF
```

## Database Setup

Run the following commands to create the PostgreSQL database and user:

```bash
sudo -u postgres psql -c "CREATE USER em_admin WITH ENCRYPTED PASSWORD 'em_pass';"
sudo -u postgres psql -c "ALTER USER em_admin CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE engagement_manager;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE engagement_manager TO em_admin;"
sudo -u postgres psql -c "ALTER DATABASE engagement_manager OWNER TO em_admin;"
```

> **Note:** The database data files are stored in the PostgreSQL data directory (typically `/var/lib/postgresql/<version>/main/`).

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

After seeding the database, you can log in using the default Administrator account:

- **Username**: `admin`
- **Password**: `admin`

> **Note:** Upon logging in, you will be required to change this password after 90 days. All new passwords must be at least 16 characters long and include an uppercase letter, lowercase letter, number, and symbol.

## Implementation Plan & Architecture

This section documents the architecture, database schema, security measures, and completed development phases for the Engagement Manager application.

### Technology Stack

- **Full-Stack Framework**: Next.js 16+ (React) using the App Router.

- **Database**: PostgreSQL.
- **ORM**: Prisma.
- **Authentication**: Custom implementation using strict session cookies (cleared on browser close) and Argon2id for password hashing. Passwords enforce a minimum 16 characters, with mandatory symbols, numbers, and mixed case.
- **Styling**: Vanilla CSS with a dynamic glassmorphism dark-mode aesthetic.

### Database Schema

- **User**: `id`, `username`, `passwordHash`, `role` (ADMIN, USER), `lastPasswordChange`, `createdAt`, `updatedAt`.

- **Engagement**: `id`, `codeName`, `clientId`, `status` (PLANNING, ROE, PREP, LIVE, REPORTING, COMPLETE), `focus`, `type` (AI, CODE_REVIEW, FIREWALL, MULTI, PENTEST, PHISHING, PHYSICAL, PURPLE_TEAM, RED_TEAM, USB_DROP, VISHING, WEB_APP, WIRELESS), `location` (INTERNAL, EXTERNAL), `objectives`, `kickOffDate`, `startDate`, `endDate`, `targets`, `exclusions`, `notes`, `operators` (M:N), `contacts`/`trustedAgents` (M:N with Contact), `findings`, `createdAt`, `updatedAt`.

- **Client**: `id`, `company`, `address`, `city`, `state`, `zip`, `phone`, `website`, `notes`, `contacts`, `engagements`, `createdAt`, `updatedAt`.

- **Contact**: `id`, `clientId`, `name`, `title`, `email`, `phone`, `notes`, `assignedEngagements`, `trustedEngagements`, `createdAt`, `updatedAt`.

- **Finding**: `id`, `engagementId` (optional), `title`, `severity`, `background`, `remediation`, `supportingData`, `screenshots`, `createdAt`, `updatedAt`.
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

1. **Authentication & Accounts**: Default `admin` account is generated via Prisma seed. Only `ADMIN` roles can access the `/users` endpoint to create new accounts (the UI dynamically hides the Users navigation button from non-admins).
2. **Session Management**: Sessions are managed via `jose` JWTs stored in `HttpOnly`, `SameSite=Lax` cookies. Cookie expiration is intentionally omitted to keep browser-session behavior, and JWT payloads currently use a 1-day expiration.
3. **Application Security**:
    - Next.js Edge Proxy (`src/proxy.ts`) enforces session checks and 90-day password rotation across all protected routes.
   - Next.js Server Actions reduce CSRF risk with built-in same-origin protections.
    - Prisma automatically mitigates SQL injection by parameterizing all queries.
    - React mitigates XSS by automatically escaping HTML elements on render.
    - Screenshots are securely stored on the local file system in `/uploads` and are served via an authenticated `/api/uploads` route to prevent IDOR vulnerabilities.
