# Zero-to-Hero Guide: RFID Access Control

This guide walks you from an empty machine to a working system and through the main workflows. Follow step-by-step.

## 1) Prerequisites

- Windows 10/11 with PowerShell
- Node.js 20+ and npm
- Docker Desktop (for DB) or local PostgreSQL 17
- Git

Verify:

```powershell
node -v
npm -v
git --version
```

## 2) Clone the Repo

```powershell
cd C:\\Users\\Mohammed
git clone https://github.com/MadihDev/asset-access-control.git
cd asset-access-control
```

## 3) Configure Backend

```powershell
cd backend
npm ci
copy .env.example .env
```

Edit `.env` as needed:

- `PORT=5001` (local default)
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/asset_access_control?schema=public`
- `JWT_SECRET=<long-random-secret>`
- Bulk knobs (optional):
  - `MAX_LOCATION_BULK_ITEMS=500`
  - `BULK_RATE_LIMIT_WINDOW_MS=60000`
  - `BULK_RATE_LIMIT_MAX=10`

Generate client and run migrations/seed:

```powershell
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

## 4) Start Database

Option A: Docker (recommended)

```powershell
docker compose up -d db
```

Port: `localhost:5440` (Docker) or `5433` (local dev as configured).

Option B: Local Postgres 17 (ensure credentials match `DATABASE_URL`).

## 5) Run Backend (API)

```powershell
# from backend/
$env:PORT='5001'; npm run dev
```

Health check: `GET http://localhost:5001/api/health`

## 6) Configure & Run Frontend

```powershell
cd ..\\rfid-frontend
npm ci
copy .env.example .env
# Ensure VITE_API_URL=http://localhost:5001/api
npm run dev
```

App: `http://localhost:5173` (may pick `5174` if busy)

## 7) Login (City-Aware)

1. Open the app and select a city (Netherlands-only list from API).
2. Enter username + password and sign in.
3. On success, a JWT is stored; requests are scoped by city.

Notes

- SUPER_ADMIN may pass `cityId` to cross-scope calls.
- 401s auto-logout; refresh token flow handles transient cases if configured.

## 8) Dashboard Walkthrough

- City-scoped KPIs: users, locks (online), keys, attempts, success rate, recent logs.
- Click a location card to pre-filter Access Logs by `addressId`.
- Sorting per-location KPIs.

## 9) Location Details (Admin Connect)

Navigate to `/locations/:addressId`:

- Users tab: `Active | Inactive` filter (recent activity or key/permission status)
- Locks tab: `Online | Offline` and `Active | Inactive`
- Keys tab: `Active | Expired`
- Server-side pagination and status chips

## 10) Bulk Permissions (Manager+)

Two ways:

- Builder: select user + lock + optional validity window → Add to grants/revokes
- CSV: paste lines

Formats

- Grants: `userId,lockId[,validFromISO][,validToISO]`
- Revokes: `userId,lockId`

Rules

- Dates must be valid ISO; if both present, `validFrom <= validTo`
- Dedupe repeated rows automatically
- Limits: `MAX_LOCATION_BULK_ITEMS` (413 if exceeded);
- Bulk rate limiting applies

Submit → toast shows `granted/updated/revoked` and UI refreshes.

## 11) Bulk Key Assignment (Manager+)

Two ways:

- Builder: add items with optional name/expiry/active
- CSV: `cardId,userId[,name][,expiresAtISO][,isActive]`

Rules

- `isActive` accepts `true/false/1/0/yes/no` (case-insensitive) or omit
- Valid ISO `expiresAt` if provided
- Create vs update vs reassign handled automatically
- Limits + bulk rate limiting as above

Submit → toast shows `created/reassigned/updated` and UI refreshes.

## 12) Access Logs & Export

- Filter by user, lock, result, type, date range, `addressId`
- Export CSV via the logs export endpoint

## 13) Audit Logs

- View audit trail for permission and key lifecycle changes

## 14) Real-time Updates (Optional)

- Socket.io client connects with JWT; optionally passes `cityId`
- Events:
  - `location:permissions:changed` (after bulk permissions)
  - `location:keys:changed` (after bulk key assignment)

UI subscribes and triggers selective refresh.

## 15) Running Tests

Backend (Jest):

```powershell
cd backend
npm test
```

Frontend (Vitest):

```powershell
cd rfid-frontend
npm test
```

## 16) Troubleshooting

- API fails to start: ensure DB is up and `DATABASE_URL` is correct; run migrations
- 401 Unauthorized: expired/invalid JWT; re-login
- 403 Forbidden: role too low or address outside your city scope
- 400 Bad Request: CSV/validation errors in bulk modals (check inline errors)
- 413 Payload Too Large: split bulk operations into smaller batches
- CORS/WS: set `ALLOWED_ORIGIN` and `WS_CORS_ORIGIN` in backend `.env`

## 17) Reference

- API reference: `docs/api.md`
- Bulk actions guide: `docs/bulk-actions.md`
- Workflows & status: `docs/WORKFLOWS_AND_STATUS.md`
