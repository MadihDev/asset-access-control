# RFID Asset Access Control System

[![CI](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml/badge.svg)](https://github.com/MadihDev/asset-access-control/actions/workflows/ci.yml)

City‑aware, full‑stack system for managing RFID keys and access to locks, with audits, dashboards, role‑based access control, and Netherlands‑only city filtering.

This README gives you a concise yet complete briefing: what the app does, what’s implemented today, what’s still in progress, how to run it on Windows (PowerShell), and where to go next.

## At a Glance

- Backend API: `http://localhost:5001`
- Frontend (Vite): `http://localhost:5173` (Vite may auto-pick `5174` if busy)
- Database: PostgreSQL 17 — local: `localhost:5433`, Docker: `localhost:5440`
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
- Location Details page with Users/Locks/Keys tabs, status filters, and bulk actions (CSV templates, builder pickers)

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

See `ARCHITECTURE.md` for a deeper architecture and runtime view, `docs/WORKFLOWS_AND_STATUS.md` for current app workflows and status, and `docs/bulk-actions.md` for the Bulk Actions guide.

## Run Locally (Windows PowerShell)

1. Backend (API)

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

2. Frontend (Vite)

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
- `WS_CORS_ORIGIN=http://localhost:5173` (optional; defaults to `*`)
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
  - Supports filters: `userId`, `lockId`, `addressId`, `cityId`, `result`, `accessType`, `startDate`, `endDate`, pagination and sorting
  - Example: `GET /api/lock/access-logs?addressId=<ADDRESS_ID>&page=1&limit=20`
- Audit Logs: `GET /api/audit`

For a broader list and request/response examples, see `docs/api.md`.

## Location Details & Bulk Actions (Admin)

The Location Details page (`/locations/:addressId?cityId=...`) provides tabs for Users, Locks, and Keys with status filters and pagination. Two admin bulk actions are available via modals:

Bulk grant/revoke permissions

- Open “Bulk permissions”. You can:
  - Build lines with pickers (search user and lock) and optional validity window
  - Or paste CSV lines directly
- CSV formats:
  - Grants: `userId,lockId[,validFromISO][,validToISO]`
  - Revokes: `userId,lockId`
- Valid dates: ISO (e.g., `2025-01-01T00:00:00Z`); `validFrom` must be <= `validTo` if both present
- Empty/whitespace lines are ignored
- Use the “Download CSV template” buttons for examples

Bulk key assignment

- Open “Bulk key assign”. Build items with pickers or paste CSV lines
- CSV format: `cardId,userId[,name][,expiresAtISO][,isActive]`
- `isActive` accepted values (case-insensitive): `true`, `false`, `1`, `0`, `yes`, `no` (or omit)
- Dates must be valid ISO strings
- Empty lines are ignored
- A “Download CSV template” button is available

Notes

- Inline validation highlights per-line issues and prevents submission until fixed
- After applying changes, the lists refresh automatically and a toast summarizes results
- Backend bulk endpoints and location-scoped list endpoints must be available for full functionality

### Dashboard Response: Locations

The dashboard endpoint includes a `locations` array (grouped by address) when data is present in scope:

```
GET /api/dashboard?cityId=<CITY_ID>

data: {
  // ... global KPIs ...
  locations: [
    {
      addressId: string,
      name: string,            // e.g., "Main St 12, 1234AB"
      cityId: string,
      totalLocks: number,
      activeLocks: number,     // online locks count
      activeUsers: number,     // users with recent granted access (15m)
      activeKeys: number,      // users who currently hold an active key and permission
      totalAttempts: number,   // total access attempts at this address
      successfulAttempts: number,
      successRate: number      // 0-100
    }
  ]
}
```

## WebSocket: How to Connect (Frontend)

The backend exposes a Socket.io server on the same host/port as the API. Authenticate the socket with the same JWT used for API calls and optionally provide `cityId` to join a city room for scoped events.

Client example (Socket.io v4):

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
  transports: ["websocket"],
  auth: {
    token: `Bearer ${accessToken}`,
    cityId: selectedCityId,
  },
});

socket.on("connect", () => console.log("WS connected", socket.id));
socket.on("disconnect", () => console.log("WS disconnected"));

// Listen for key expiry events in your city
socket.on("key.expired", (event) => {
  // event: { keyId, cardId, userId, expiredAt }
  console.log("Key expired", event);
});
```

Notes

- The server validates the JWT during the WS handshake. Provide `auth.token` as `Bearer <jwt>`.
- If `auth.cityId` is provided, the server joins the socket to `city:<cityId>` and emits city-scoped events there.
- Configure allowed origins with `WS_CORS_ORIGIN` (comma-separated list). Defaults to `*` for development.

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
- `npm run test` – run Vitest unit tests

Backend

- `npm test` – run Jest tests

## Docker (Local Stack)

```powershell
docker compose up --build
```

Services

- PostgreSQL: `localhost:5440`
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
- CSV booleans: for bulk key assignment `isActive` accepts `true/false/1/0/yes/no`; any other value is invalid

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
