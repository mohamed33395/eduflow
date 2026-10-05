# EduFlow — Educational Management Platform

A scalable SaaS educational management platform built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Firebase** (Auth, Firestore, Storage).

## Features

- **Role-based access control** for:
  - Super Admin
  - Center Owner
  - Course Owner
  - Teacher
  - Student
- Multiple dashboards per role
- Center & course management with unique URLs
- Students, teachers, lessons, assignments, attendance, payments
- Video / PDF / image uploads via Firebase Storage
- Firestore Security Rules for data protection
- Route protection via Next.js 16 `proxy.ts`

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase Client SDK v12
- Firebase Admin SDK v14
- Lucide React icons

## Project Structure

```
app/
├── admin/              # Super Admin dashboard
├── center/             # Center Owner dashboard
├── course/             # Course Owner dashboard
├── teacher/            # Teacher dashboard
├── student/            # Student dashboard
├── login/              # Login page
├── components/         # Reusable UI & layout components
├── lib/                # Firebase client, admin, auth helpers
├── hooks/              # Custom React hooks
├── services/           # Firestore service layer
├── types/              # TypeScript types
proxy.ts                # Next.js 16 route protection
firestore.rules         # Firestore Security Rules
storage.rules           # Firebase Storage Rules
firestore.indexes.json  # Firestore composite indexes
```

## Getting Started

1. Create a Firebase project and enable:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Firebase Storage

2. Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) and sign in.

## Security Rules

Deploy Firestore and Storage rules from the project root:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Build

```bash
npm run build
```

## Important Notes

- This project uses **Next.js 16** where `middleware.ts` is deprecated in favor of `proxy.ts`.
- Server Components fetch data with `getSessionUser()` from the secure HTTP-only session cookie.
- Client Components use Firebase Auth directly for interactive features.
