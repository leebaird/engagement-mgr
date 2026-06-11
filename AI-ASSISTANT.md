# AI Assistant Guidelines (Engagement Manager)

These guidelines are written to ensure consistent, safe, and high-quality contributions to the Engagement Manager project.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## 1. Core Principles

- **Precision First**: Implement *exactly* what is asked. Do not add extra features, UI polish, icons, tooltips, animations, or "nice-to-haves" unless explicitly requested.
- **Ask When Unclear**: If an instruction is ambiguous — especially regarding UI-only vs. database/schema changes — ask a clarifying question before making any changes.
- **Respect Architecture**: Stay strictly within the current tech stack:
  - Next.js 16+ (App Router)
  - Prisma + PostgreSQL
  - Vanilla CSS (glassmorphism dark theme)
  - Custom JWT session cookies via `jose`

## 2. Project-Specific Rules

### UI & Styling
- Use **only vanilla CSS** (no Tailwind, no CSS-in-JS, no external libraries).
- Maintain the existing dark glassmorphism aesthetic for **page panels** (lists, dashboard cards, login forms, etc.) via the shared `.glass-panel` class in `globals.css`.
- **Modals must be fully opaque** — no transparency, no backdrop blur on the dialog itself.
  - All modals go through `src/components/Modal.tsx`, which applies `modal-panel` alongside `glass-panel`.
  - `.modal-panel` in `globals.css` overrides the glass effect with a solid `#171a21` background.
  - The modal backdrop is solid `#0f1115` (not a blurred semi-transparent overlay).
  - Any nested `.glass-panel` inside a modal (e.g. the engagement findings section) is also opaque (`#1e2128`) via `.modal-panel .glass-panel`.
  - Do not revert modals to glassmorphism or add transparency when creating or editing modal UI.
- When fixing layout issues (e.g. form field alignment), use clean **CSS Grid** or **Flexbox** and make the right edges align precisely as requested.

### Next.js App Router & Server Actions
- **Component Boundaries**: Ensure strict separation between Server and Client components. Use `'use client'` at the very top of files that use React hooks (`useState`, `useEffect`, `useRouter`) or handle DOM events (`onClick`).
- **Server Actions**: Must begin with `'use server'`. Always return serializable objects (e.g., `{ success: true }` or `{ error: "Message" }`) rather than throwing raw errors, and ensure the Client UI handles and displays these error states gracefully.
- **No DB in Client**: Never import `prisma` or any node-specific dependencies (like `fs`) inside a Client Component.

### Database & Schema Changes
- Every change to `prisma/schema.prisma` must be followed by **in this order**:
  1. `npx prisma migrate dev --name <descriptive_name>` — preferred; creates a migration file and applies it to the database
  2. `npx prisma generate` — updates Prisma Client types (`migrate dev` usually runs this automatically; run again if unsure)
- Use `npx prisma db push` only for quick local prototyping when migration history does not matter. For normal work, use migrations.
- After schema changes, run `npx prisma migrate status` and confirm **Database schema is up to date!** before testing UI or server actions.
- **Schema drift**: If `migrate dev` reports drift, do not apply schema changes with ad-hoc SQL alone. Resolve drift (align DB with migrations, or reset in dev if appropriate), then migrate.
- **Manual DB change already applied**: If the database already matches the schema but a migration was never recorded (e.g. column dropped via `prisma db execute`), mark it applied: `npx prisma migrate resolve --applied <migration_folder_name>`, then `npx prisma generate`, then verify with `npx prisma migrate status`.
- Remove the field from `schema.prisma`, forms, server actions, and types — not UI only.
- After schema changes, always run `npx tsc --noEmit` to catch type errors.
- Never assume a field removal or addition is only UI — always confirm with the user.
- Whenever `prisma/schema.prisma` is modified (add/remove/rename fields, models, enums, or relations), immediately update the **Database Schema** list in `README.md` (Implementation Plan & Architecture section) to keep documentation in sync with the live schema.

### Git & New Files

- Whenever new files are created (components, API routes, libraries, Prisma migrations, etc.), run `git status` to detect untracked files.
- New files must be committed and pushed to the remote repository at these checkpoints:
  1. When the user-requested feature or change is complete and working.
  2. As soon as any committed code imports or depends on the new files (a fresh clone must not break).
  3. Before the user would reasonably pull/clone or test on another machine.
- Group related new files into a small number of logical commits (typically 1-3) with descriptive messages.
- Stage the files, commit, then push with `git push origin main`.
- Surface the list of files and proposed commit messages/grouping to the user for approval before committing and pushing (unless the user has previously instructed "you take care of it").

### Orphaned & Leftover Files

Avoid leaving files in the repo that nothing uses. Orphans confuse future work and often end up in the remote repository indefinitely.

**When to check**

- After refactors (e.g. API route → Server Action, rename/move/delete a module, schema or seed script changes).
- Before marking a task complete: run `git status` and confirm every tracked file still has a purpose.
- When adding a replacement file, delete the superseded file in the same change set (e.g. `seed.ts` replaces `seed.mjs`).

**What often becomes orphaned in this project**

- One-off patch scripts at the repo root (e.g. `fix.js`) — delete once the real source fix is merged.
- Duplicate configs or seeds (only one Prisma seed entrypoint: `prisma/seed.ts` via `prisma.config.ts`).
- Next.js scaffold assets with no imports (`public/*.svg`, unused `*.module.css`).
- Empty directories left after removing routes (e.g. `src/app/api/...`).

**How to verify a file is unused**

- Search the codebase for imports and path references (`grep`, glob).
- Confirm nothing in `package.json` scripts, `prisma.config.ts`, or README points at the file.
- Do not assume a file is dead from training data alone — check this repository.

**Cleanup rules**

- Remove orphans your own changes create; commit and push the deletions with the related work.
- For pre-existing orphans you did not create: mention them to the user; delete when asked or when clearly superseded by your change.
- Never add throwaway helper scripts to the repo root unless the user explicitly wants them kept.

### Security by Design (OWASP Top 10)

This application stores **strictly confidential** offensive-security engagement data. Design and review every change with security in mind. Use the [OWASP Top 10](https://owasp.org/www-project-top-ten/) as a minimum checklist — not an afterthought at the end of a task.

**Defense in depth (required patterns in this codebase)**

- **Proxy is not enough**: `src/proxy.ts` redirects unauthenticated users, but **every Server Action and API route must enforce auth itself**. Use `requireAuth()` from `src/lib/require-auth.ts` for authenticated mutations; use `requireAdmin()` from `src/lib/require-admin.ts` for admin-only operations.
- **Prefer Server Actions for mutations**: Do not add new cookie-authenticated `fetch()` POST/DELETE API routes — they are CSRF-prone. Admin backup/restore/reset live in `src/app/actions/db.ts` for this reason.
- **Sessions & secrets**: `JWT_SECRET` must be ≥ 32 characters in production (`src/lib/jwt-secret.ts`). No hardcoded fallback outside development. Sessions use `HttpOnly`, `SameSite=Lax` cookies with `jose` JWTs.
- **Password policy**: Minimum 16 characters with uppercase, lowercase, number, and symbol — never weaken (`src/lib/auth/password.ts`).
- **File paths**: Never pass user-controlled paths to `fs` directly. Screenshot downloads must go through `resolveUploadFilePath()` in `src/lib/uploads-path.ts`.
- **Database access**: Use Prisma parameterised queries. Do not build raw SQL from user input. Backup/restore (`src/lib/db-backup.ts`) runs arbitrary SQL only from trusted admin uploads — treat as highly privileged.
- **Shell commands**: Use `execFile` with argument arrays for `pg_dump`/`psql`/`zip`/`unzip` — never `exec` with string interpolation.
- **Client boundaries**: Never import `prisma`, `fs`, secrets, or password hashes into Client Components. Do not return passwords or tokens in Server Action state.

**OWASP Top 10 — what to watch for here**

| Risk | Examples in this app |
|------|----------------------|
| **A01 Broken Access Control** | Missing `requireAuth()` on a new action; IDOR on uploads/findings; assuming proxy protects `/api/*` |
| **A02 Cryptographic Failures** | Weak/missing `JWT_SECRET`; serving sensitive files; logging credentials |
| **A03 Injection** | Path traversal in uploads; unsafe raw SQL; unvalidated restore uploads |
| **A04 Insecure Design** | Destructive admin APIs without re-auth; no upload size/type limits; default `admin`/`admin` |
| **A05 Security Misconfiguration** | Missing security headers; `NODE_ENV` mis-set in production; committed `.env` |
| **A06 Vulnerable Components** | Run `npm audit` before deploy; keep overrides documented in `package.json` |
| **A07 Auth Failures** | No login rate limiting; password change without current-password check; stale JWT roles |
| **A08 Integrity Failures** | Unsigned backups; zip-slip on restore; tampered import archives |
| **A09 Logging Failures** | Logging passwords, tokens, or full stack traces to clients |
| **A10 SSRF** | Not currently applicable — avoid adding outbound fetch to user-supplied URLs without safeguards |

**When adding or changing features**

1. Identify which OWASP categories the change touches.
2. Add server-side validation (prefer Zod schemas aligned to Prisma enums).
3. Confirm auth on every new mutation path — UI hiding alone is not security.
4. For file upload/download, allowlist types, enforce max size, and validate resolved paths.
5. For admin/destructive operations, require explicit user confirmation in UI and server-side admin checks.

**Testing & review discipline**

- **Never run destructive tests** (database reset, restore, delete-all) against a real database without **explicit written user authorization**. Use isolated fixtures or ask the user first.
- After security-sensitive changes, run `npm run build` and consider `npm audit`.
- When the user asks for a security review, check Server Actions, API routes, auth/session code, uploads, and backup/restore — not just the file that was edited.

## 3. Coding & Editing Discipline

- **Component Creation Order**: Before importing a new component or file into an existing route or layout, create the target file first. Inserting imports for missing files will crash the Next.js compiler with `Module not found` and block development.
- **Surgical Edits**: Prefer small, focused changes over large file replacements.
- **No Unrequested Deletions**: Never delete variables, functions, or logic unless explicitly told or you are 100% certain they are unused.
- **Type Safety**: After any change that could affect types, run `npx tsc --noEmit`.
- **File Opening**: After editing any file, open it in VS Code so the user can review the changes immediately.

## 4. Environment & Credentials

When changing `.env` values or database credentials:
1. Update `.env`
2. Update `README.md`
3. Apply the change in PostgreSQL
4. Restart the dev server (`npm run dev`)

The running server caches environment variables — changes are not live until restart.

## 5. Verification Protocol (Always Follow)

After any meaningful change:
- Check terminal logs for errors.
- Run `npx tsc --noEmit`.
- Run `git status`. If new untracked application files exist, commit and push them following the "Git & New Files" rules above.
- If schema was changed: clear `.next` cache if issues arise (`rm -rf .next`).
- If auth, uploads, admin APIs, or user input handling changed: re-read **Security by Design (OWASP Top 10)** and confirm server-side checks are in place.
- Test the affected functionality when practical.

## 6. Working with Screenshots & User Requests

- When the user attaches a screenshot, analyze it carefully and reference specific elements (field names, alignment problems, etc.).
- Provide complete, ready-to-use code for fixes such as form alignment.
- When suggesting code changes, show clear "Before → After" diffs or the full relevant component when helpful.

## 7. Troubleshooting

- `net::ERR_CONNECTION_REFUSED` → Run `npm run dev` in the terminal (do **not** use `npx next dev`).
- Unexpected behavior after schema change → Clear `.next` cache and restart the server.
- Styling not applying → Ensure the component correctly imports the CSS file.
