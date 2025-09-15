# RFID Asset Access Control System

[![CI](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml/badge.svg)](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml)

Full‑stack system for managing RFID access to assets/locks with audits, permissions, and dashboards.

## Stack
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: Vite + React + TypeScript + Tailwind v4
- CI: GitHub Actions (lint, typecheck/build, tests)

## Quick Start

1) Backend (API)

```powershell
cd backend
# Install deps
npm ci

# Configure environment
copy .env.example .env
# Update DATABASE_URL, JWT_SECRET, etc.

# Prisma
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed

# Run the API on port 5001
$env:PORT='5001'; npm run dev
```

Health check: `GET http://localhost:5001/api/health`

2) Frontend (Vite)

```powershell
cd rfid-frontend
npm ci

# Configure environment
copy .env.example .env
# Ensure VITE_API_URL points to your API, e.g.:
# VITE_API_URL=http://localhost:5001/api

# Start Vite dev server (defaults to 5173; may auto-pick 5174)
npm run dev
```

App: `http://localhost:5173` (or whichever port Vite selects)

## Scripts Cheatsheet

Backend:
- `npm run dev` – start API in dev (ts-node-dev)
- `npm run build` – typecheck/build to `dist`
- `npm test` – run Jest tests
- `npm run db:migrate` – `prisma migrate dev`
- `npm run db:reset` – reset DB (dev only)
- `npm run db:studio` – open Prisma Studio

Frontend:
- `npm run dev` – start Vite dev server
- `npm run build` – typecheck/build frontend
- `npm run preview` – preview built app

## Environment

Backend `.env` (see `backend/.env.example`):
- `DATABASE_URL=postgresql://user:pass@localhost:5432/asset_access`
- `JWT_SECRET=...`
- `PORT=5001` (optional; defaults to 5000 – we use 5001 locally)

Frontend `.env` (see `rfid-frontend/.env.example`):
- `VITE_API_URL=http://localhost:5001/api`

## Features
- Auth (JWT), role-based protection (admin/manager)
- Users CRUD with pagination + CSV export
- Access Logs with filters/pagination + CSV export
- Permissions: grant/revoke lock access, RFID key management
- Audit logging and Audit Logs page with filters/sorting
- Dashboard with recent activity and stats

## Project Structure

```
backend/          # Express API (TypeScript + Prisma)
rfid-frontend/    # Vite + React + Tailwind v4 app
```

## CI
CI runs on push/PR to `main`:
- Backend: install, lint, build, test
- Frontend: install, lint, build

Workflow: `.github/workflows/ci.yml`

## Troubleshooting
- If API port 5001 is busy, free it or set another `PORT`.
- If Vite says port 5173 is in use, it will start on 5174 (check terminal output).
- Ensure DB is running and `DATABASE_URL` is correct before migrations.

## Next Steps
- Add Dockerfile(s) and `docker-compose.yml` for DB/API/Frontend
- Add tests (backend services/controllers; frontend components/hooks)
- Write API docs under `docs/api.md`
