# RFID Asset Access Control System

[![CI](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml/badge.svg)](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml)

City‑aware, full‑stack system for managing RFID keys and access to locks, with audits, dashboards, role‑based access control, and Netherlands‑only city filtering.

This README gives you a concise yet complete briefing: what the app does, what’s implemented today, what’s still in progress, how to run it on Windows (PowerShell), and where to go next.

## At a Glance

- Backend API: `http://localhost:5001`
- Frontend (Vite): `http://localhost:5173` (Vite may auto-pick `5174` if busy)
- Database: PostgreSQL 17 on `localhost:5433`
- ORM: Prisma 5
- Styling: Tailwind CSS v4
- Background job: auto-deactivates expired RFID keys
	- Env: `KEY_EXPIRY_JOB_INTERVAL_MS` (default 300000 ms = 5 minutes)

## Core Features (Implemented)

Authentication & Roles
- City‑aware login: `POST /api/auth/login` expects `{ username, password, cityId }` and validates the user within the selected city
- JWT authentication, token validation returns user context including `cityId`
- Roles: `admin`, `manager`, `user`; middleware enforces role checks

City Directory (Netherlands only)
- `GET /api/city` returns only active Dutch cities (country = “Netherlands”) for the login dropdown
- Seed data includes Netherlands cities and maps demo users to them (`User.cityId`)

Dashboard (city‑scoped)
- `GET /api/dashboard?cityId=...` returns KPIs filtered by city and user role
- KPIs: total users, active users, total locks, online locks, active keys, total access attempts, successful access, recent logs

Users & Permissions
- Users: CRUD, pagination, sorting, CSV export
- Permissions: grant/revoke access to locks
- RFID keys: list/create/update
- Assign/ Revoke RFID keys:
	- `POST /api/rfid/assign` assigns a card to a user with optional `expiresAt`; defaults to now + 6h
	- `POST /api/rfid/revoke` immediately deactivates a key

Access & Audit
- Access Logs: list with filters and pagination; CSV export
- Access statistics endpoints
- Audit logging for key actions (login, permission changes, RFID key lifecycle)

Platform & Quality
- Error handling and rate limiting middleware (strict for auth)
- CI: GitHub Actions for lint, typecheck/build, and tests
- Docker support: `docker-compose.yml` runs DB, API, and frontend

Frontend Highlights
- React + Vite + Tailwind v4 UI with Auth context and route guards
- Login page with City + Username + Password
- Dashboard shows real data with city scoping
- Users, Access Logs, Audit Logs pages with filtering and CSV export

## What’s Not Implemented Yet (Roadmap)

- Real‑time updates (WebSocket server/client) for KPIs, access attempts, and lock online/offline events
- Notification service (email/SMS) integration and toggles
- Post‑login redirect to user’s assigned location(s) within the selected city
- Expanded tests: backend integration for new endpoints, frontend component/e2e tests
- Refresh token rotation and server‑side revocation/blacklist
- Brute‑force protection hardening and broader RBAC enforcement coverage
- Input validation for new RFID assign/revoke endpoints (baseline validation exists elsewhere; needs wiring here)
- System health panel (device status, last seen) and access analytics charts

## Tech Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL 17
- Frontend: React, Vite, TypeScript, Tailwind CSS v4
- Tooling: ESLint, Prettier, Jest, Supertest, Docker, GitHub Actions

## Project Structure

```
backend/          # Express API (TypeScript + Prisma)
rfid-frontend/    # Vite + React + Tailwind v4 app
```

See `ARCHITECTURE.md` for a deeper architecture and runtime view.

## Run Locally (Windows PowerShell)

1) Backend (API)

```powershell
cd backend

# Install dependencies
npm ci

# Environment
copy .env.example .env
# Update DATABASE_URL, JWT_SECRET, etc. Example:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/asset_access_control?schema=public
# PORT=5001

# Prisma
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed

# Start API (port 5001)
$env:PORT='5001'; npm run dev
```

Health check: `GET http://localhost:5001/api/health`

2) Frontend (Vite)

```powershell
cd rfid-frontend
npm ci

copy .env.example .env
# Ensure VITE_API_URL points to the API (default shown)
# VITE_API_URL=http://localhost:5001/api

# Start Vite (5173; may pick 5174)
npm run dev
```

App: `http://localhost:5173`

## Environment Variables

Backend (`backend/.env.example`)
- `PORT=5000` (we use 5001 locally)
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/asset_access_control?schema=public`
- `JWT_SECRET=replace-with-a-long-random-secret`
- `JWT_EXPIRES_IN=1d`
- `ALLOWED_ORIGIN=http://localhost:5173`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_*`
- `KEY_EXPIRY_JOB_INTERVAL_MS` (optional; defaults to 5 minutes)

Frontend (`rfid-frontend/.env.example`)
- `VITE_API_URL=http://localhost:5001/api`

## Key Concepts

- City scoping: Users and data are filtered by `cityId`; only Netherlands cities are available in the city list
- RFID key expiry: keys expire by default after 6 hours; a background job marks expired keys inactive and access checks enforce validity
- RBAC: `admin` and `manager` roles unlock management routes; route guards in frontend mirror backend rules

## Useful API Endpoints

- Health: `GET /api/health`
- Cities: `GET /api/city` (Netherlands only)
- Auth: `POST /api/auth/login` (requires `cityId`)
- Dashboard: `GET /api/dashboard?cityId=...`
- RFID:
	- `POST /api/rfid/assign` – assign a key to a user (default expiry now + 6h)
	- `POST /api/rfid/revoke` – revoke a key immediately
- Access Logs: `GET /api/lock/access-logs`, `GET /api/lock/access-logs/export`
- Audit Logs: `GET /api/audit`

For a broader list and request/response examples, see `docs/api.md`.

## Scripts Cheatsheet

Backend
- `npm run dev` – start API in dev (ts-node-dev)
- `npm run build` – typecheck/build to `dist`
- `npm test` – run Jest tests
- `npm run db:migrate` – `prisma migrate dev`
- `npm run db:reset` – reset DB (dev only)
- `npm run db:studio` – open Prisma Studio

Frontend
- `npm run dev` – start Vite dev server
- `npm run build` – typecheck/build frontend
- `npm run preview` – preview built app

## Docker (Local Stack)

```powershell
docker compose up --build
```

Services
- PostgreSQL: `localhost:5433`
- Backend API: `http://localhost:5001/api`
- Frontend: `http://localhost:5173`

Notes
- Backend container runs DB migrations automatically on start
- Frontend is built with `VITE_API_URL` at build time; adjust in `docker-compose.yml` if needed

## CI

Runs on push/PR to `main`:
- Backend: install, lint, build, test
- Frontend: install, lint, build

Workflow file: `.github/workflows/ci.yml`

## Troubleshooting

- If API port `5001` is busy, free it or set another `PORT`
- If Vite port `5173` is in use, it will auto‑select another port (check terminal)
- Ensure PostgreSQL is running and `DATABASE_URL` matches your setup before running migrations
- If Tailwind styles don’t load, hard refresh (Ctrl+F5) and confirm `rfid-frontend/src/main.tsx` imports `./index.css`

## Status Summary

Implemented
- City‑aware auth, RBAC, Netherlands city directory
- Users, Access Logs, Audit Logs, Permissions, RFID key assign/revoke
- Dashboard KPIs (city‑scoped), CSV exports, error handling, rate limiting
- Key expiry job and enforcement, Docker, CI

Not Yet Implemented
- Real‑time (WebSocket) updates and health panel
- Notifications (email/SMS)
- Post‑login redirect to assigned locations
- Expanded tests (frontend + integration + e2e)
- Refresh token rotation and brute‑force hardening
- Full RBAC/input validation coverage across all endpoints
