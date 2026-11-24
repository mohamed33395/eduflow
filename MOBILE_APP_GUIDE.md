# EduFlow — Mobile App Developer Guide

Everything you need to build the EduFlow mobile app: architecture, auth, the full API reference, data models, upload flow, QR attendance, and frontend screen map.

## 1. What EduFlow is

A multi-tenant management platform for education centers:

- **Centers** own students, teachers, classes, subjects, pricing.
- **Courses** are sellable packages (level + grade range) owned by a center or a standalone course owner.
- **Students** get tasks (exams), assignments, attendance, and pay invoices by uploading transfer proofs.
- **Teachers** teach subjects, review task submissions, get monthly payouts (fixed salary or % of collected revenue).
- **Super admin** manages centers and platform billing.

## 2. Architecture

```
Mobile app ──► NestJS API  (direct — recommended)
Web app    ──► Next.js BFF (/api/bff/*) ──► NestJS API
                                             │
                                        Neon Postgres (Prisma)
```

| Piece | Stack | Dev URL |
|---|---|---|
| Backend API | NestJS 11 + Prisma + PostgreSQL (Neon) | `http://localhost:3001/api` |
| Web frontend | Next.js 16 (App Router, Turbopack) + Tailwind | `http://localhost:3002` |
| DB | Postgres via Prisma (`server/prisma/schema.prisma`) | Neon cloud |

**Important for mobile:** talk to the Nest API **directly** (`{API_BASE}/api/...`). The Next.js BFF exists only to keep browser tokens in httpOnly cookies — a mobile app manages tokens itself and should skip it entirely.

## 3. Authentication

JWT access token (Bearer) + rotating refresh token. Two login endpoints exist:

### 3.1 Simple login — `POST /api/auth/login` (recommended for mobile)

```http
POST /api/auth/login
Content-Type: application/json

{ "identifier": "owner1@eduflow.local", "password": "Owner@123" }
```

- `identifier` = username **or** email (3–100 chars), `password` ≥ 6 chars.
- **200** → `{ "accessToken": "...", "user": { id, name, role, centerId, ... } }`
- Refresh token arrives as `Set-Cookie: eduflow_refresh=...; HttpOnly; Path=/api/auth` — read it from the response headers and store it in secure storage.
- **401** on bad credentials. Rate limit: **10/min/IP**.

### 3.2 Authenticated calls

```http
Authorization: Bearer <accessToken>
```

### 3.3 Refresh — `POST /api/auth/refresh`

```http
POST /api/auth/refresh
Cookie: eduflow_refresh=<stored refresh token>
```

→ `{ accessToken, user }` + a **rotated** refresh cookie (the old one is revoked — always store the new one). Add `?rotate=false` to get an access token **without** consuming the refresh token. Limit: 30/min.

### 3.4 Other auth endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/auth/me` | — | Current user profile |
| POST | `/api/auth/logout` | — (sends cookie) | Revokes refresh token |
| POST | `/api/auth/change-password` | `{currentPassword, newPassword}` | Authed; newPassword ≥8 |
| POST | `/api/auth/forgot-password` | `{identifier}` | Public; sends reset token/OTP |
| POST | `/api/auth/reset-password` | `{token, newPassword}` | Public |
| POST | `/api/auth/setup` | `{name, username, email, password}` | One-time super-admin bootstrap |

### 3.5 Multi-stage login — `POST /api/auths/*` (optional, OTP-capable flow)

Used by the web's `MultiStageLoginForm`. Steps are driven by short-lived **step tokens** (15 min TTL):

1. `POST /api/auths/get-login-ways` `{identifier}` → `{payload: {token, login_way: {step: {login_option: "password"|"otp", login_option_alternatives}, type: "mail"|"sms"}, can_set_pass, first_login}}`
2. `POST /api/auths/login-step` `{identifier, password, token}` — `password` field carries the password **or** the OTP. Response is either another step `{token, login_way}` or final `{accessToken, user}` + refresh cookie.
3. `POST /api/auths/alternative-step-login` `{identifier, loginOption: "mail"|"sms"|"password"|"social", token}` — switch method mid-flow.
4. `POST /api/auths/resend-otp` `{identifier, token}` (3/min).
5. Password reset: `POST /api/auths/validate-reset-password-otp` `{identifier, otp}` (numeric 5–6 digits) → verified token → `POST /api/auths/reset-password-with-token` `{identifier, password, passwordConfirmation, token}` — password must be ≥8 chars with 1 uppercase + 1 special char.

**Recommendation:** use `/auth/login` + `/auth/refresh` in v1; adopt `/auths/*` only if OTP login is required.

## 4. Conventions

- **Base URL**: `{API_BASE}/api` (all routes below are relative to it).
- **IDs**: cuid strings (e.g. `cmuzezmpr000dvt9gjrcgog01`).
- **Roles** (`user.role`, PascalCase in DB; web maps to snake_case): `SUPER_ADMIN`, `CENTER_OWNER`, `COURSE_OWNER`, `TEACHER`, `STUDENT`.
- **Validation**: strict — `ValidationPipe` with `whitelist + forbidNonWhitelisted`. Send **only** documented fields; extra fields → 400.
- **Dates**: ISO-8601. `date` fields stored as `@db.Date` — send `"YYYY-MM-DD"`.
- **Errors**: NestJS shape `{ "statusCode": 400, "message": "..." | ["..."], "error": "Bad Request" }`. Validation messages arrive as a string array.
- **Rate limits**: global throttler + stricter per-route limits on auth endpoints (see §3).
- **Pagination**: `GET /payments` is paginated `{items, total, page, limit}` (`limit` ≤ 100). Most other list endpoints return plain arrays.

## 5. API reference

`🔓` public · otherwise requires Bearer token. Roles shown when restricted.

### Health — `GET /health` 🔓

### Users `/users` — `SUPER_ADMIN`, `CENTER_OWNER` (GET also for list)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| POST | `/users` | user fields (username, name, role, password, email?, phone?, centerId?, courseId?) | Creates user + role profile |
| GET | `/users` | `?role=&search=&centerId=&page=&limit=` | Staff only; students → 403 |
| GET | `/users/:id` | — | |
| PATCH | `/users/:id` | partial | |
| DELETE | `/users/:id` | — | Soft-deactivates |

### Centers `/centers`

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/centers` | super_admin, center_owner | |
| GET | `/centers` | any staff | List (scoped) |
| GET | `/centers/slug/:slug` | 🔓 | Public landing data |
| GET | `/centers/:id` | scoped | |
| PATCH | `/centers/:id` | super_admin, center_owner | |
| PUT | `/centers/:id/settings` | super_admin, center_owner | Pricing/subjects config |
| GET/POST | `/centers/:id/billings` | super_admin | Platform monthly fees |
| PATCH | `/centers/:id/billings/:billingId` | super_admin | |
| POST/DELETE | `/centers/:id/year-packages[/:packageId]` | super_admin, center_owner | Level+grade bundles |
| DELETE | `/centers/:id` | super_admin, center_owner | |

### Academics — `/courses`, `/classes`, `/subjects`

All three expose `POST` (managers), `GET` list (filters: `centerId`, `classId`, `courseId`, `teacherId`), `GET /:id`, `PATCH /:id`, `DELETE /:id` (super_admin/center_owner). Plus:

- `GET /courses/slug/:slug` 🔓 — public course landing.
- Course body: `{name, type, level, gradeFrom, gradeTo, description, ...}` — `level` enum: `KINDERGARTEN|PRIMARY|MIDDLE|HIGH`.
- Class/Subject bodies follow schema fields (§8).

### Students `/students`

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/students` | super_admin, center_owner | |
| GET | `/students` | scoped | `?centerId&classId&teacherId&subjectId&courseId=` — teacher sees own students only; **student sees only their own row** |
| GET | `/students/:id` | scoped | Student → own profile only |
| PATCH | `/students/:id` | scoped | Student may only update own `parentPhone` |
| POST | `/students/:id/enrollments` | owners | `{courseId}` — 409 if already enrolled |
| DELETE | `/students/:id/enrollments/:courseId` | owners | |
| PUT | `/students/:id/subject-assignments` | owners | Replace subject list |
| DELETE | `/students/:id` | owners | Soft-deactivates user |

### Teachers `/teachers` — same shape

`POST`, `GET` list, `GET /:id`, `GET /:id/students`, `PATCH /:id`, `DELETE /:id`, `PUT /:id/subject-assignments`. Teacher profile carries compensation: `compensationType: FIXED|PERCENTAGE`, `fixedAmount`, `commissionPercent`.

### Learning — lessons, assignments, submissions

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/courses/:courseId/lessons` | enrolled/staff | |
| POST/PATCH/DELETE | `/lessons[/:id]` | content managers | `{courseId, title, description?, videoUrl?, order?}` |
| GET | `/courses/:courseId/assignments` | scoped | |
| GET | `/assignments/:id` | scoped | |
| POST/PATCH/DELETE | `/assignments[/:id]` | content managers | `{courseId, title, description, deadline, maxGrade?}` |
| GET | `/submissions` | student | Own submissions |
| GET | `/assignments/:assignmentId/submissions` | staff | |
| POST | `/assignments/:assignmentId/submissions` | student | `{fileUrl?, text?}` — one per student per assignment |
| PATCH | `/submissions/:id/grade` | content managers | `{grade, feedback?}` → status GRADED |

### Tasks (exams) `/tasks`

Flow: center creates → recipients notified (`TASK_ASSIGNED`) → student uploads solution → reviewer accepts+grades or rejects (`TASK_GRADED`/`TASK_REJECTED`) → student may resubmit (attempts++).

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/tasks/form-data?subjectId=<id>` | center managers | subjectId required, ≤64 chars |
| POST | `/tasks` | center managers | `{subjectId, teacherId, title, examFileUrl, lessonId?}` |
| GET | `/tasks` | scoped | `?centerId=` etc. |
| GET | `/tasks/mine` | student | Tasks assigned to me |
| GET | `/tasks/review-queue` | teacher, owners | Submissions to review |
| GET | `/tasks/:id` | scoped | |
| POST | `/tasks/:id/submissions` | student | `{fileUrl}` — one active submission per task |
| PATCH | `/task-submissions/:id/review` | teacher, owners | `{status: "GRADED"|"REJECTED", grade?, feedback?}` |
| POST | `/task-submissions/:id/send-result` | teacher, owners | Pushes result notification |

### Attendance `/attendance`

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/attendance` | super_admin, center/course owner, teacher | `{date: "YYYY-MM-DD", entries: [{userId, status: "PRESENT"|"ABSENT"|"LATE"}]}` — empty entries → 400 |
| GET | `/attendance` | scoped | `?userId=&courseId=&date=` |
| PATCH | `/attendance/:id` | same as POST | `{status}` |

**QR check-in (what the web kiosk does):** student QR encodes `.../center/attendance/checkin?u=<userId>`. For a mobile check-in screen: `GET /attendance?userId=<id>` → if a record exists for today with no `courseId` → `PATCH /attendance/:id {status:"PRESENT"}` else `POST /attendance {date: today, entries:[{userId, status:"PRESENT"}]}`. Staff-only — verify the target's `centerId` matches the staff member's.

### Finance — payments, methods, proofs, payouts

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/payments` | managers | `{studentId, courseId, amount, dueDate?}` |
| GET | `/payments` | scoped | `?page&limit(≤100)` — student sees own |
| PATCH | `/payments/:id` | managers | |
| POST | `/payments/:id/installments` | managers | `{amount}` — increments `paid`, updates `remaining` |
| DELETE | `/payments/:id` | managers | |
| GET/POST | `/payment-methods` | GET: all / POST: managers | `{kind: "BANK"|"WALLET"|"CASH", label, account, details?}` — collection accounts students transfer to |
| PATCH/DELETE | `/payment-methods/:id` | managers | |
| POST | `/payments/:id/proofs` | student | `{methodId?, amount, reference?, screenshot?}` — needs reference or screenshot; **one PENDING proof per invoice**; screenshot must be our upload URL |
| GET | `/payment-proofs` | managers | Review queue |
| GET | `/payment-proofs/mine` | student | |
| PATCH | `/payment-proofs/:id` | managers | `{status: "APPROVED"|"REJECTED", notes?}` — APPROVED auto-records the installment |
| GET | `/payouts/preview` | owners, teacher | `?teacherId&periodStart&periodEnd` (ISO dates — invalid → 400) |
| POST | `/payouts` | super_admin, center_owner | `{teacherId, periodStart, periodEnd, notes?}` |
| GET | `/payouts[/:id]` | owners, teacher | |
| PATCH | `/payouts/:id` | owners | `{status: "APPROVED"|"PAID", notes?}` |
| DELETE | `/payouts/:id` | owners | |

### Notifications `/notifications`

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Own notifications (`type`: TASK_ASSIGNED / TASK_SUBMITTED / TASK_REJECTED / TASK_GRADED) |
| PATCH | `/notifications/read-all` | |
| PATCH | `/notifications/:id/read` | |

### Uploads `/uploads` — two-step flow

```http
POST /api/uploads/presign      (any authenticated user)
{ "filename": "scan.pdf", "contentType": "application/pdf",
  "folder": "submissions", "scopeId": "<optional-id>" }
```

→ `{ uploadUrl, publicUrl }`. Then `PUT <uploadUrl>` with the raw file bytes (`Content-Type` header). `folder` ∈ `avatars|covers|lessons|submissions|misc`; bad folder → 400.

- When S3 isn't configured (current setup): `uploadUrl` points to `PUT /api/uploads/local?key=...&token=...` and files are served from `GET /api/uploads/local?key=...` (public). Blobs live in Postgres (`stored_files`, **50MB cap**).
- File-type/size rules are enforced client-side; server caps size — mobile should enforce extension rules too (see `app/lib/validators.ts`).

### Landing requests `/landing-requests` — public booking form

| Method | Path | Notes |
|---|---|---|
| POST | `/landing-requests` 🔓 | `{role: "student"|"teacher", name, phone, email?, message?, centerSlug \| courseSlug, website?}` — `website` is a honeypot: filled → fake success |
| GET | `/landing-requests` | Managers, center-scoped |
| PATCH | `/landing-requests/:id` | `{status: "pending"|"contacted"|"accepted"|"rejected"}` |
| DELETE | `/landing-requests/:id` | Managers |

## 6. Suggested mobile screen ↔ endpoint map

| Screen | Endpoints |
|---|---|
| Login | `POST /auth/login` (+ optionally `/auths/*`) |
| Home/dashboard | `GET /auth/me`, `GET /notifications` |
| My tasks (student) | `GET /tasks/mine` → `POST /tasks/:id/submissions` (upload via `/uploads/presign` first) |
| Task review (teacher) | `GET /tasks/review-queue` → `PATCH /task-submissions/:id/review` |
| Assignments | `GET /courses/:id/assignments`, `GET /submissions` |
| Lessons | `GET /courses/:courseId/lessons` |
| Attendance (staff) | `GET /students`, `POST /attendance`, `PATCH /attendance/:id` |
| QR check-in (kiosk) | see §5 Attendance |
| My payments (student) | `GET /payments`, `GET /payment-methods`, `POST /payments/:id/proofs`, `GET /payment-proofs/mine` |
| Payments admin | `GET /payments`, `GET /payment-proofs` → `PATCH /payment-proofs/:id` |
| Profile | `GET /auth/me`, `POST /auth/change-password` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` |

## 7. Frontend (web) — reference for parity

Next.js App Router, role-gated dashboards via `DashboardLayout`. Routes (auth required unless noted):

- **Public**: `/login`, `/forgot-password`, `/center/[slug]`, `/course/[slug]` (landing + join form)
- **Admin** (`/admin`): centers, users, payments, settings
- **Center** (`/center`): dashboard, students, teachers, attendance (+ `/scan` camera + `/kiosk` hardware-scanner mode), tasks, payments, requests, reports, profile, settings
- **Course** (`/course`): lessons, assignments, students, progress, requests, profile
- **Teacher** (`/teacher`): courses, tasks, assignments, submissions, attendance
- **Student** (`/student`): dashboard (shows attendance QR card), courses, tasks, assignments, attendance, grades, payments

Key shared modules: `app/lib/api.ts` (browser client → BFF), `app/lib/api-server.ts` (SSR fetch + session cookies `edu_session`/`edu_rt`/`edu_role`), `app/lib/validators.ts` (client file/field rules), `app/lib/i18n/messages/{ar,en}.json` (full ar/en strings — reuse keys for the app).

## 8. Data model summary (`schema.prisma`)

- **User** — id, username (unique), email?, name, phone?, role, avatarUrl?, centerId?, courseId?, isActive. Profile rows share the user id (`StudentProfile.id == User.id`).
- **StudentProfile** — level?, grade?, classId?, primaryTeacherId?, parentName?, parentPhone?, gender?.
- **TeacherProfile** — compensationType, fixedAmount?, commissionPercent?.
- **Center** — slug (unique, public landing), ownerId, landing JSON, monthlyFee.
- **Course / Class / Subject** — level EducationLevel + grade range; subject attaches to class **or** course + optional teacher.
- **Enrollment** — student×course (unique). **StudentSubjectAssignment / TeacherSubjectAssignment** — per level/grade range.
- **Lesson + LessonFile** — ordered content per course.
- **Assignment + Submission** — deadline, maxGrade, grade/feedback, unique per student.
- **Task + TaskRecipient + TaskSubmission** — exam file, per-student status `SUBMITTED|REJECTED|GRADED`, attempts counter.
- **AttendanceRecord** — userId + optional courseId + date + `PRESENT|ABSENT|LATE`.
- **Payment** — student×course invoice: amount, paid, remaining, dueDate. **PaymentMethod** — center collection account (BANK/WALLET/CASH). **PaymentProof** — PENDING→APPROVED|REJECTED; approval auto-records installment.
- **TeacherPayout** — monthly settlement: FIXED or PERCENTAGE × collectedRevenue; PENDING→APPROVED→PAID.
- **Notification** — type, title, body, data JSON, readAt.
- **LandingRequest** — public join requests (role/status strings).
- **CenterBilling** — platform fee per center/month (PENDING|PAID|WAIVED).
- **CenterYearPackage + CenterYearSubject + CenterGradeGroup** — bundled pricing.
- **StoredFile** — uploaded blobs in Postgres (50MB).

## 9. Security notes (already enforced server-side)

- Global `ValidationPipe` (whitelist + forbidNonWhitelisted) — extra fields → 400.
- Rate limiting on auth routes; global throttler enabled.
- Helmet headers + CORS restricted to `CORS_ORIGIN` origins (web). Mobile apps aren't subject to CORS.
- Role scoping: students can only read their own row in `/students`, own profile in `/students/:id`, and only `parentPhone` is self-editable; teacher lists are scoped to their students; every center-scoped query enforces `centerId`.
- Prisma errors are filtered (`PrismaExceptionFilter`) — no internals leak.
- Uploads require signed token for local PUT; presign validates folder whitelist.
- Access tokens ~15 min; refresh tokens 30 days, rotating — persist in secure storage (Keychain/Keystore), never in plain prefs.

## 10. Environment (dev)

Backend `.env` (`server/`): `DATABASE_URL`, `DIRECT_URL` (Neon), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `API_PUBLIC_URL`, `PORT=3001`, optional `S3_*` (else local blob storage), `TRUST_PROXY`.

Frontend `.env.local` (root): `API_BASE_URL=http://localhost:3001`, `NEXT_PUBLIC_API_URL` (used only by the multi-stage login form — public value, not a secret).

## 11. Dev test accounts (local seed)

| Role | Identifier | Password |
|---|---|---|
| Super admin | `admin` | `Admin@123` |
| Center owner | `owner1@eduflow.local` | `Owner@123` |
| Student | `student1@eduflow.local` | `Student@123` |

Run API smoke test: `cd server && node test-smoke.cjs` (85 checks, all modules).
