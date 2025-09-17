# RFID Access Control — Briefing

This document summarizes the system’s current functionality, what remains to reach 100% completion, and when physical RFID cards/readers are needed for testing.

## 1) What the app does today

- Architecture

  - Backend: Node.js/Express (TypeScript), Prisma + PostgreSQL, JWT auth with refresh token rotation and revocation, WebSocket server for live events.
  - Frontend: React + Vite + Tailwind CSS, Axios client with token auto-refresh on 401, role-based UI and city scoping.
  - Docker Compose for DB/API/frontend; seeds and demo users/data included.

- Auth & Security

  - City-aware login: `username`, `password`, `cityId` with RBAC roles: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `USER`.
  - Access/refresh tokens with rotation; DB-backed refresh token store and cleanup job.
  - Rate limiting on auth; input validation via `express-validator`.

- City Scoping & RBAC

  - All key endpoints enforce city scope via `getEffectiveCityId()`. Manager+ can pass `cityId` to query other cities.

- Users & Locks

  - Users CRUD with filters/pagination/sorting.
  - Locks list/detail/update; `POST /api/lock/:id/ping` marks lock online and updates `lastSeen`.

- RFID Keys & Permissions

  - Assign/revoke RFID keys to users; default auto-expiration in 6 hours when no `expiresAt` provided.
  - Background job deactivates expired keys and emits WebSocket events.
  - User permissions per lock with validity windows (from/to) and `canAccess`.

- Access Logs

  - Device (or simulator) posts access attempts: `POST /api/lock/access-attempt` with `cardId`, `lockId`, etc. (public endpoint for devices).
  - Query logs: `GET /api/lock/access-logs` supports `userId`, `lockId`, `addressId`, `result`, `accessType`, date range, pagination, sorting. CSV export for Manager+: `GET /api/lock/access-logs/export`.

- Dashboard

  - Overview metrics: users, locks, online locks, total attempts, successful access, recent logs.
  - Per-location KPIs grouped by `Address`: active users (last 15 min), active keys, online/total locks, success rate, total/successful attempts.
  - Sorting (name, active users, success rate) + asc/desc toggle. Quick links to Access Logs pre-filtered by `addressId`.

- Real-time Updates

  - WebSocket events on key assigned/revoked/expired and `kpi:update`. Frontend listens and refreshes.

- Audit Logs

  - Audits for login/logout, user CRUD, permission grant/update/revoke, RFID key create/update/assign/revoke/expire, and access logs export.
  - Listing with filters and pagination (Admin+).

- Docs & Tests
  - Backend README documents dashboard `locations` fields and access logs `addressId` filter + city scoping.
  - Frontend README explains dashboard sorting and access-log `addressId` links.
  - Minimal backend integration tests for dashboard and access logs are green.

## 2) What’s left to reach 100%

Core items to check off before marking the release as “complete”:

- Frontend tests (components/hooks/e2e)

  - Cover login flow, dashboard sorting, access logs `addressId` prefill. Ensure CI green.

- Post-login UX

  - Redirect users to context-relevant page (e.g., default dashboard for selected city or user’s primary location).

- RBAC hardening pass

  - Re-verify all endpoints for least-privilege and add tests for Manager/Admin protections.

- Input validation coverage

  - Audit every create/update endpoint and ensure consistent 400 errors with field-level messages.

- Rate limiting beyond auth

  - Add reasonable limits to sensitive routes (e.g., export, bulk changes). Make limits configurable.

- Ops polish

  - One-command dev run (root script for `docker-compose up -d` + seed).
  - Optional: light caching for dashboard KPIs (Redis or in-memory) to reduce query overhead.

- Analytics (optional but valuable)

  - System health panel (online/offline locks, `lastSeen`).
  - Trends/charts (daily/weekly access success/denied).

- Scalability & data lifecycle (optional)

  - Strategy for large log growth (partition/archival), optimize key expiry job for scale, and multi-city/country concerns.

- Release criteria alignment
  - Verify: all major features, CRUD + pagination/filters, RBAC enforced, error normalization, CI green, one-command Docker run, and updated docs.

## 3) When hardware is needed (RFID cards & readers)

You can validate most flows without hardware by posting to the device endpoint and using the UI. Hardware is needed for true end-to-end validation.

- What you can test now (no hardware):

  - Assign a key with a short `expiresAt`, simulate access attempts, watch dashboard KPIs and logs update in real-time.
  - Verify CSV export, city scoping, audit logs, and per-location links.
  - Example (PowerShell):
    ```powershell
    $body = @{ cardId = 'CARD-DEMO'; lockId = '<LOCK_ID>'; accessType = 'RFID_CARD' } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/lock/access-attempt -ContentType 'application/json' -Body $body
    ```

- When hardware becomes necessary:

  - Validate reader reliably reads card UIDs and de-bounces reads at expected range/speed.
  - Ensure reader or gateway can call `POST /api/lock/access-attempt` with correct `lockId`/`cardId` over your network.
  - Measure true latency and resilience under real network/device conditions.
  - Exercise offline/online transitions and `POST /api/lock/:id/ping` heartbeat.

- Integration tips:
  - Store `lockId` on the device, or add a small deviceId→lockId mapping service so devices can send `deviceId` and the server resolves `lockId`.
  - If devices can’t call HTTP directly, use a bridge (e.g., Raspberry Pi or microservice) to forward serial/MQTT events to the API.

## 4) Quick start (reference)

- Backend dev:

  ```powershell
  cd backend
  npm install
  npm run dev
  ```

- Frontend dev:

  ```powershell
  cd rfid-frontend
  npm install
  npm run dev
  ```

- Run backend tests:
  ```powershell
  cd backend
  npm test
  ```

---

For details on request/response shapes and filters, see:

- `backend/README.md` (Dashboard `locations` fields, Access Logs `addressId` filter, city scoping rules)
- `rfid-frontend/README.md` (Dashboard sorting, access logs pre-filter link behavior)
