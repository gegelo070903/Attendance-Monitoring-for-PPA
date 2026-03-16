# Copilot Instructions for PPA Attendance Monitoring System

## Project Context

This repository is an offline-first, local-network Attendance Monitoring System for the Philippine Ports Authority (PPA), built with Next.js 14 App Router + TypeScript + Prisma + SQLite.

Primary behavior:

- QR-based attendance flow (AM/PM/Night)
- Face capture during scan
- Real-time dashboard updates via Socket.IO
- Admin management, reports, activity logs, and database backup/restore

## Core Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Prisma + SQLite (`prisma/dev.db`)
- NextAuth (email/password, JWT session)
- Tailwind CSS
- Socket.IO

## Architecture and File Conventions

- App pages and API routes live in `src/app/`
- API handlers must stay under `src/app/api/`
- Shared helpers live in `src/lib/`
- UI components live in `src/components/`
- Types live in `src/types/`
- Prisma schema is `prisma/schema.prisma`

Prefer Server Components by default. Use Client Components only when hooks/browser APIs/interactivity are required.

## Security and Data Rules

- Hash all passwords with `bcryptjs` before storing
- Validate role checks on admin routes (`session.user.role === "ADMIN"`)
- Prevent path traversal for file operations (use `path.basename` and constrained directories)
- Keep backup/restore operations admin-only and auditable
- Never hardcode secrets in source files

## Attendance Rules

Maintain and preserve these business behaviors when editing attendance logic:

- Day shift sequence: AM In -> AM Out -> PM In -> PM Out
- Night shift sequence: Night In -> Night Out
- Respect configurable grace periods and late thresholds from settings
- Recalculate `workHours` and status consistently after updates
- Prevent duplicate/invalid scans for the same phase

## Logging and Realtime Requirements

- Log significant actions using `logActivity()` from `src/lib/activityLogger.ts`
- Keep activity type accurate (`INFO`, `SUCCESS`, `WARNING`, `ERROR`)
- Broadcast real-time updates for attendance/dashboard/activity-log views when relevant

## Backup and Restore

- Backup API is at `src/app/api/backup/route.ts`
- Keep backup filenames/time format sortable and safe
- Preserve safety backup creation before restore
- If restore behavior changes, keep user messaging clear that server restart may be required

## Coding Style Preferences

- Keep changes small and targeted
- Avoid broad refactors unless explicitly requested
- Prefer explicit types for public function signatures
- Do not introduce new dependencies unless necessary
- Keep comments brief and only for non-obvious logic

## Validation Checklist Before Finishing

1. TypeScript/ESLint diagnostics show no new issues
2. Updated endpoints align with README and UI usage
3. Role checks and activity logging are present for admin-sensitive actions
4. No regression to offline/local-network behavior
5. For docs changes, ensure README and this file stay consistent with scripts and runtime

## Operations Notes

- Default LAN dev server script: `npm run dev` (`next dev -H 0.0.0.0`)
- HTTPS start script: `npm run start:https` (`node generate-cert.js && node server.js`)
- Batch files are deployment helpers for Windows environments
- `AUTO-START.bat` may contain machine-specific paths and should be adjusted per deployment PC
