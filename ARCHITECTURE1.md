# RFID Access Control — Current Architecture (2025-09)

This document captures the app’s current architecture as implemented in this repository, plus a forward look at upcoming features. It complements `ARCHITECTURE.md` by reflecting what’s actually running today.

## Runtime overview

- Backend API

  - Stack: Node.js + Express (TypeScript), Prisma 5, PostgreSQL 17
  - Port: `PORT=5000` (see `backend/src/index.ts`)
  - Auth: JWT access tokens + DB-backed refresh tokens with rotation and revocation
  - Jobs:
    - Key expiry job (`startKeyExpiryJob`) — auto-deactivates expired RFID keys and emits WS events
    - Refresh cleanup job (`startRefreshCleanupJob`) — deletes expired refresh tokens
  - Realtime: Socket.IO server (`initWebSocket(server)`) for live KPI updates and key events

- Frontend App

  - Stack: React + Vite + TypeScript + Tailwind CSS v4
  - Auth: Axios client adds `Authorization` header; auto-refresh on 401
  - City scoping: City selector context drives `cityId` query for Manager+ and implicit scoping for others

- Data store
  - PostgreSQL via Prisma schema (`prisma/schema.prisma`)
  - Key models: `User`, `City`, `Address`, `Lock`, `RFIDKey`, `UserPermission`, `AccessLog`, `AuditLog`, `RefreshToken`

## Logical architecture

- Authentication & RBAC

  - Login: `POST /api/auth/login` with `{ username, password, cityId }`
  - Tokens: short-lived access; long-lived refresh with rotation & revocation in DB
  - Middleware: `authenticateToken`, plus role checks (e.g., `requireManagerOrAbove`, `requireAdmin`)
  - Scoping: `getEffectiveCityId(req)` enforces city constraints for non-manager roles

- Domain services

  - Access: `POST /api/lock/access-attempt` (public for devices) records attempts and drives dashboard/logs
  - RFID Keys: assign/update/revoke; auto-set `expiresAt` (default now + 6h when not provided)
  - Permissions: per-user/per-lock with validity windows; enforced in access checks

- Observability & governance

  - Audit logs on: login/logout, user CRUD, permission grant/update/revoke, RFID key create/update/assign/revoke/expire, export actions
  - Access Logs: serve as lock usage history; filters include `userId`, `lockId`, `addressId`, `result`, `accessType`, date range; CSV export for Manager+

- Real-time channel
  - Events: `key.assigned`, `key.revoked`, `key.expired`, `kpi:update` (by city room)
  - Consumers: Dashboard listens to refresh KPIs and display toasts

## API surfaces (high-level)

- Dashboard: `GET /api/dashboard?[cityId]`
  - Returns overview metrics plus per-location KPIs (grouped by `Address`): active users (last 15 min), active keys, online/total locks, success rate, attempts
- Access logs: `GET /api/lock/access-logs` (+ `export`)
  - Query params: pagination, sorting, `addressId`, `userId`, `lockId`, `result`, `accessType`, `startDate`, `endDate`, `cityId`
- Locks: `GET /api/lock`, `GET /api/lock/:id`, `PUT /api/lock/:id`, `POST /api/lock/:id/ping`
- RFID keys: assign/create/update/revoke under RFID controller endpoints
- Users: CRUD and listing with filters
- Audit: list audit logs with filters (Admin+)

## Frontend features (current)

- Login with city selection; tokens stored and auto-refreshed
- Dashboard
  - Overview stats and recent access logs
  - Locations table with sorting (name, active users, success rate), active keys, online/total locks
  - Quick links to Access Logs with `addressId` pre-applied
- Access Logs: filters (including `addressId`), pagination, CSV export
- Users/Permissions/RFID Keys management flows
- Real-time: automatic KPI refresh and key event toasts via WebSocket

## Background jobs

- Key Expiry (`backend/src/jobs/keyExpiry.job.ts`)

  - Periodically marks `RFIDKey` rows inactive when `expiresAt <= now`
  - Emits `key.expired` and city-scoped `kpi:update` events
  - Writes audit entries per expired key

- Refresh Token Cleanup (`backend/src/jobs/refreshCleanup.job.ts`)
  - Periodically deletes expired `RefreshToken` rows

## What’s done vs upcoming

- Implemented (done)

  - City-aware login and scoping across endpoints
  - JWT with refresh token rotation + revocation; cleanup job
  - Access logs with server-side filters and city scoping; CSV export
  - Dashboard per-location KPIs with success rates and sorting; quick links to logs
  - WebSocket-based real-time updates for KPIs and key events
  - Auto-expiration of keys after 6 hours; expiry job, audits, and notifications
  - Audit logging of key actions (incl. RFID key issue/revoke) and exports
  - Minimal backend integration tests for dashboard and access logs
  - Documentation updates for API and frontend usage

- Upcoming (to reach 100%)
  - Frontend tests (components/hooks/e2e) and CI green
  - Post-login UX: redirect to user’s default context/location
  - RBAC hardening and validation audit for all write endpoints
  - Rate limiting beyond auth (sensitive routes like export)
  - Ops polish: one-command stack run; optional caching for dashboard KPIs
  - Optional analytics: system health panel and trend charts
  - Scale & data lifecycle: log growth strategy, job optimization, multi-city/country readiness

## Hardware integration notes

- You can test most flows without hardware by posting to `POST /api/lock/access-attempt`.
- Hardware is required to validate reader UID reliability, latency, and real network/device behavior.
- Consider a deviceId→lockId mapping layer if readers can’t embed internal IDs.

## Pointers

- Detailed endpoint docs: `backend/README.md`
- Frontend usage notes: `rfid-frontend/README.md`
- High-level design: `ARCHITECTURE.md`
