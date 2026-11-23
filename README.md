# EduFlow — Educational Management Platform

A SaaS platform for managing tutoring centers and their courses, built with **Next.js 16** (frontend), **NestJS** (API), and **PostgreSQL on Neon** via **Prisma**.

> **Note:** An earlier version of this project used Firebase (Auth, Firestore, Storage). That backend has been fully replaced by the NestJS + Postgres API in `server/`. The `firebase.json`, `firestore.rules`, and `storage.rules` files are legacy and no longer used.

## Roles & Features

Role-based access control for five roles:

- **Super Admin** — platform-wide: centers, platform billing (`CenterBilling` monthly fees), payments overview, users.
- **Center Owner** — manages one center: teachers, students, subjects per level/grade, year packages (`CenterYearPackage`), classes, attendance, student payments, tasks/exams.
- **Course Owner** — owns courses inside a center: lessons with files (PDF/video/image), assignments, grading.
- **Teacher** — lessons, assignments, task review queue (accept + grade or reject student submissions).
- **Student** — enrollments, attendance, assignment & task submissions, grades.

Other features:

- **Multi-stage login** — username → password (see `app/login/` and `server/src/auth/multi-stage-auth.controller.ts`).
- **Tasks workflow** — center creates an exam/worksheet → recipients get a notification → students upload a solution → reviewer grades or rejects → student resubmits.
- **Finance** — student payments, teacher compensation (`FIXED`/`PERCENTAGE`), payout status tracking.
- **File uploads** — stored as `bytea` in Postgres (`stored_files` table, 50MB cap), served through the API. Optional S3 config exists in `server/.env`.
- **i18n** — English & Arabic message files in `app/lib/i18n/messages/`.

## Tech Stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide icons, shadcn/ui
- **Backend:** NestJS, Prisma ORM, `helmet`, cookie-based JWT auth (access + refresh rotation)
- **Database:** PostgreSQL (Neon serverless) — schema in `server/prisma/schema.prisma`
- **Route protection:** Next.js 16 `proxy.ts` (replaces deprecated `middleware.ts`)

## Project Structure

```
app/                    # Next.js frontend (port 3002 in dev)
├── admin/              # Super Admin dashboard (centers, payments, users)
├── center/             # Center Owner dashboard
├── course/             # Course Owner dashboard
├── teacher/            # Teacher dashboard (assignments, tasks, attendance)
├── student/            # Student dashboard (courses, submissions, grades)
├── login/              # Multi-stage login form
├── api/                # Next route handlers proxying/refreshing against the API
├── components/         # Reusable UI & layout components
├── lib/                # api-server.ts (API_BASE), api.ts, auth helpers, i18n
proxy.ts                # Next.js 16 route protection

server/                 # NestJS API (default port 4000; dev uses 3001)
├── src/
│   ├── auth/           # JWT auth, multi-stage login, refresh/reset tokens
│   ├── centers/        # centers, billing, subjects, year packages
│   ├── academics/      # courses, classes, subjects
│   ├── people/         # student/teacher profiles, enrollments
│   ├── learning/       # lessons, lesson files, assignments, submissions
│   ├── tasks/          # task/exam workflow + review queue
│   ├── attendance/     # attendance records
│   ├── finance/        # payments, payouts, compensation
│   ├── notifications/
│   ├── uploads/        # file uploads → stored_files (Postgres bytea)
│   └── prisma/         # PrismaService
└── prisma/
    ├── schema.prisma   # ~25 models, enums for roles/statuses
    ├── stored_files.sql# manual migration for the uploads table
    └── migrations/
```

## Getting Started

### 1. Backend (`server/`)

```bash
cd server
npm install
```

Create `server/.env`:

```
DATABASE_URL=postgres://...        # Neon pooled connection (used by Prisma)
DIRECT_URL=postgres://...          # Neon direct connection (migrations)
PORT=3001
CORS_ORIGIN=http://localhost:3002  # frontend origin, comma-separated for multiple

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=30d
```

Optional (commented in `.env`): S3-compatible storage (`S3_*`) and SMTP (`SMTP_*`) for emails.

Apply the schema:

```bash
npx prisma db push   # or: npx prisma migrate deploy
```

> **Warning:** `prisma migrate dev` wants to reset the Neon database due to pre-existing schema drift (indexes/FKs on tasks/task_submissions were created manually). Do not run it blindly — use `db push` or replay `prisma/stored_files.sql` after `migrate deploy`.

Run the API:

```bash
npm run dev          # nest start --watch → http://localhost:3001/api
```

### 2. Frontend (repo root)

```bash
npm install
```

`.env.local` needs the API base (defaults to `http://localhost:3001` if unset):

```
API_BASE_URL=http://localhost:3001
```

Run the dev server:

```bash
npm run dev -- -p 3002   # → http://localhost:3002
```

Open [http://localhost:3002](http://localhost:3002) and sign in.

## Build

```bash
npm run build                                   # frontend
cd server && npm run build && npm start         # backend → node dist/main.js
```

## Deployment

The API is a plain Node process (NestJS + Express). No serverless adapter needed.

```bash
cd server
npm ci            # postinstall runs `prisma generate` automatically
npm run build     # → dist/
npm run start:prod
```

### Required env vars (see `server/.env.example` for the full template)

- **`DATABASE_URL`** — Neon/Postgres connection string.
- **`JWT_ACCESS_SECRET`** — long random string (e.g. `openssl rand -hex 32`).
- **`CORS_ORIGIN`** — production frontend origin(s), comma-separated. Defaults to localhost only, so browsers block the API without it.
- **`NODE_ENV=production`** — makes refresh cookies `Secure` (requires HTTPS) and disables dev-only token responses.
- **`API_PUBLIC_URL`** — public URL of the API itself (`https://api.example.com/api`); upload presign links are built from it.
- **`PORT`** — listen port (default `4000`).

### Behind a reverse proxy

`TRUST_PROXY=1` (default) trusts one proxy hop so `X-Forwarded-For` populates the client IP — without it the ThrottlerGuard rate-limits all users as the proxy's IP. Set `TRUST_PROXY=false` if the API faces the internet directly.

### Database

- **Never run `prisma migrate dev` against production** — pre-existing schema drift makes it want a destructive reset.
- Fresh database: `prisma db push` then replay `prisma/multi-stage-auth.sql` and `prisma/stored_files.sql` (`prisma db execute --file ...`).
- The manual tables are already applied to the shared Neon dev database.

### Works out of the box / needs optional config

- Logins (all roles), sessions, refresh rotation, file uploads (Postgres `stored_files` blobs up to 50MB — or set `S3_*` for object storage).
- Email OTPs / forgot-password mail need `SMTP_*`; WhatsApp task results need `WHATSAPP_*`. Everything else works without them.
- Health check for the host/load balancer: `GET /api/health` (public).

### Process

Keep it alive with `pm2`, `systemd`, or a container — e.g. `pm2 start dist/main.js --name eduflow-api`.
