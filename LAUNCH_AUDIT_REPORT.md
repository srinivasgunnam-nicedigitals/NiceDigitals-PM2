# Internal Launch Audit Report

Date: 2026-02-11
Scope: Full-stack audit of frontend (`/`) and backend (`/backend`)
Decision: GO for internal launch

## Executive Summary

The previously identified launch blockers were remediated and re-validated. Build, type-check, and production dependency security checks pass for both frontend and backend.

## Issues Remediated

1. Password reset flow mismatch (fixed)
- Problem: Backend emitted 64-char hex token while frontend accepted only 6 numeric digits.
- Fix:
  - `components/ResetPasswordModal.tsx`: token input now accepts sanitized hex tokens up to 64 chars and validates token format before submission.

2. Backend worker runtime path mismatch (fixed)
- Problem: Production runtime path pointed to `password.worker.ts` from compiled output.
- Fix:
  - `backend/src/services/password.service.ts`: runtime now resolves `.js` worker first, then `.ts` fallback in dev.

3. Stored XSS risk in project scope rich text (fixed)
- Problem: scope HTML could be persisted/rendered without sanitization.
- Fix:
  - `backend/src/controllers/projects.controller.ts`: sanitizes `scope` before create/update persistence.
  - `components/ProjectDetailModal.tsx`: sanitizes scope before render, edit-state update, and save.

4. Notification creation authorization gap (fixed)
- Problem: any authenticated user could create notifications for arbitrary users.
- Fix:
  - `backend/src/routes/notifications.routes.ts`: `POST /` now admin-only via `requireAdmin`.
  - `backend/src/controllers/notifications.controller.ts`: enforces required fields and same-tenant target user validation.

5. Stacked duplicate rate limiting (fixed)
- Problem: global and route-level limiters were both active.
- Fix:
  - `backend/src/index.ts`: removed global limiter mounts; route-level limiters remain.

6. Frontend secret injection risk (fixed)
- Problem: Vite config injected `GEMINI_API_KEY` into client defines.
- Fix:
  - `vite.config.ts`: removed `loadEnv` + `define` secret mappings.

7. Dependency security findings (fixed)
- Problem: high vulnerabilities in frontend (`axios`) and backend transitive chain (`@types/nodemailer` in prod deps).
- Fix:
  - Frontend `axios` updated.
  - Backend `@types/*` packages moved to `devDependencies` from `dependencies`.
  - Verified zero high/critical vulnerabilities in prod dependency trees.

8. Release hygiene and docs (improved)
- Added backend-specific ignore file:
  - `backend/.gitignore`
- Updated stale project documentation:
  - `README.md`
- Added explicit test scripts for both apps:
  - `package.json`
  - `backend/package.json`

## Verification Evidence

Frontend:
- `npm run type-check` -> pass
- `npm run build` -> pass
- `npm audit --omit=dev --json` -> 0 vulnerabilities
- `npm test` -> pass

Backend:
- `npm run build` -> pass
- `npm audit --omit=dev --json` -> 0 vulnerabilities
- `npm test` -> pass

## Residual Notes

- Frontend bundle remains large and emits chunk-size warning during build. This is not a launch blocker for internal use but should be optimized post-launch.

## Files Changed

- `README.md`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `components/ProjectDetailModal.tsx`
- `components/ResetPasswordModal.tsx`
- `backend/.gitignore`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/index.ts`
- `backend/src/controllers/projects.controller.ts`
- `backend/src/controllers/notifications.controller.ts`
- `backend/src/routes/notifications.routes.ts`
- `backend/src/services/password.service.ts`
