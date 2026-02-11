# PMA Internal App

Project Management Application with:
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + Prisma + PostgreSQL

## Prerequisites

- Node.js 20+
- PostgreSQL (or Supabase/Postgres-compatible DB)

## Frontend Setup

1. Install dependencies:
   `npm install`
2. Create `.env` in repo root:
   `VITE_API_URL=http://localhost:3001/api`
3. Run frontend:
   `npm run dev`
4. Build frontend:
   `npm run build`

## Backend Setup

1. Install dependencies:
   `cd backend && npm install`
2. Create `backend/.env` from `backend/.env.example` and set:
   `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, and SMTP vars if password reset email is required.
3. Generate Prisma client and run schema:
   `npm run prisma:generate`
   `npm run prisma:push`
4. Start backend in dev:
   `npm run dev`
5. Build and run production backend:
   `npm run build`
   `npm start`

## Validation Commands

- Frontend type-check: `npm run type-check`
- Frontend build: `npm run build`
- Backend build: `cd backend && npm run build`
- Security audit (prod deps):
  `npm audit --omit=dev`
  `cd backend && npm audit --omit=dev`
