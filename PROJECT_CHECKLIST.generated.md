# Checklist for RFID Access Control System

Generated: 2025-09-17

Repo State

- Backend

  - Route files: 10 (`auth`, `user`, `lock`, `dashboard`, `permission`, `rfid`, `audit`, `city`, `location`, `sim`)

- [x] Resolve Jest configuration conflict in backend

  - Source: Standardize on a single config (`jest.config.ts` or `jest.config.js`)
  - Notes: Current dual-config requires `--config`; fix to stabilize CI before migration.

- [ ] Add CI smoke tests for critical flows

  - Scope: login, permissions CRUD, RFID CRUD, location bulk grant/revoke and key assign
  - Notes: Fast cross-cutting checks to catch regressions during migration.

- [ ] CI matrix for dual-mode tenancy
  - Modes: `TENANT_MODE=city-only` and `TENANT_MODE=project-city` for critical suites
  - Notes: Ensures both modes remain green during rollout.
  - Endpoints: ≈ 40+ across domains (Auth, Users, Locks/Access, Dashboard, Permissions, RFID, Audit, City, Location)
  - Tests: ≈ 13 backend integration/unit tests in `backend/__tests__/` and `backend/src/__tests__/`
- Frontend

  - Contexts: 3 (`AuthContext`, `CityContext`, `ToastContext`)
  - Services: 4 (`api`, `locationApi`, `socket`, `websocket`)

- [ ] Enforce request/body size limits on bulk endpoints

  - Source: API server limits + middleware; verify/tune `bulkLimiter`
  - Notes: Add per-IP/per-user safeguards to prevent abuse during migration.

- [ ] Audit logging coverage for sensitive operations
  - Scope: permission grant/revoke, RFID key assign/revoke, role changes
  - Notes: Ensure consistent structured logs for traceability during migration.
  - WebSocket client: initialized via `useWebSocket`, events handled in pages like `LocationDetails`

---

## Backend

- [ ] Pre-migration DB integrity audit and cleanup
  - Scope: verify FKs, NOT NULLs, unique constraints; detect/fix orphaned rows; data hygiene for `cityId`
  - Notes: Ensures a clean baseline before introducing `Project`/`ProjectCity`.

### Auth & RBAC

- [x] Login with city-scoping and JWT issuance

  - Source: `backend/src/routes/auth.routes.ts`, `backend/src/middleware/auth.middleware.ts`, `rfid-frontend/src/contexts/AuthContext.tsx`, `rfid-frontend/src/components/Login.tsx`
  - Architecture ref: `ARCHITECTURE.md > Authentication`
  - Notes: City is required at login; access and refresh tokens issued.

  - Source: `backend/src/routes/auth.routes.ts`, `backend/prisma/schema.prisma` (RefreshToken), `rfid-frontend/src/services/api.ts` (401 interceptor)
  - Architecture ref: `ARCHITECTURE.md > Authentication > Refresh tokens`

- [x] Profile endpoint and auth guard

- [x] Frontend scaffolding: feature flag and context (no UI change)

  - Env: `VITE_TENANT_MODE=city-only|project-city`
  - Code: `TenantContext` placeholder gated by the flag

- [x] Branching/PR strategy and migration runbook

  - Strategy: feature branch `feat/tenant-migration`, small reversible PRs
  - Ops: documented rollback and validated DB backup/restore procedure

  - Source: `backend/src/routes/auth.routes.ts`, `backend/src/middleware/auth.middleware.ts`
  - Architecture ref: `ARCHITECTURE.md > Authentication`
  - Notes: Used by `AuthContext` for initial load.

- [x] RBAC middleware (manager/admin + helpers)

  - Source: `backend/src/middleware/auth.middleware.ts`, `backend/src/middleware/role.middleware.ts`
  - Architecture ref: `ARCHITECTURE.md > RBAC`
  - Notes: Enforced across routes; review coverage for new bulk endpoints.

- [ ] 2FA (SMS) endpoints and flow (feature-flagged)
  - Source: (planned) `backend/src/routes/auth.routes.ts` additions; Notification provider
  - Architecture ref: `ARCHITECTURE.md > Two-Factor Authentication`
  - Notes: Not implemented; see Subtasks in Security & Performance.

### Users API

- [x] Users CRUD + pagination/filters

  - Source: `backend/src/routes/user.routes.ts`, controllers/services, `rfid-frontend/src/components/UserManagement.tsx`
  - Architecture ref: `ARCHITECTURE.md > Users`
  - Notes: CSV export implemented; role-based gating on UI and server.

- [x] User stats by id
  - Source: `backend/src/routes/user.routes.ts`, `backend/src/controllers/user.controller.ts`
  - Architecture ref: `ARCHITECTURE.md > Users`

### Locks & Access Logs

- [x] Device access attempt ingestion

  - Source: `backend/src/routes/lock.routes.ts` (`POST /access-attempt`), `backend/src/controllers/access.controller.ts`
  - Architecture ref: `ARCHITECTURE.md > Access Logs`
  - Notes: No JWT (device-level); writes `AccessLog` with city denorm.

- [x] Access logs listing and export CSV

  - Source: `backend/src/routes/lock.routes.ts`, `rfid-frontend/src/components/AccessLogs.tsx`
  - Architecture ref: `ARCHITECTURE.md > Access Logs`
  - Notes: Filters include `userId`, `lockId`, `addressId`, `result`, `accessType`, date range.

- [x] Access statistics endpoint
  - Source: `backend/src/routes/lock.routes.ts`, `backend/src/controllers/access.controller.ts`
  - Architecture ref: `ARCHITECTURE.md > Dashboard`

### Permissions & RFID Keys

- [x] User permissions CRUD

  - Source: `backend/src/routes/permission.routes.ts`, `rfid-frontend/src/components/UserManagement.tsx`
  - Architecture ref: `ARCHITECTURE.md > Permissions`
  - Notes: Revocation and assignment supported; also via location bulk.

- [x] RFID keys CRUD and assignment

  - Source: `backend/src/routes/rfid.routes.ts`, `rfid-frontend/src/components/UserManagement.tsx`
  - Architecture ref: `ARCHITECTURE.md > RFID Keys`
  - Notes: Key auto-expiry enforced via background job.

- [x] Location bulk grant/revoke and bulk key assignment
  - Source: `backend/src/routes/location.routes.ts`, `rfid-frontend/src/pages/LocationDetails.tsx`, `rfid-frontend/src/services/locationApi.ts`
  - Architecture ref: `ARCHITECTURE.md > Location Overview & Admin Connect`
  - Notes: Validations and limits in place; add more input validation (see Security).

### Dashboard / Analytics

- [x] Overview stats + recent logs

  - Source: `backend/src/routes/dashboard.routes.ts`, `rfid-frontend/src/components/Dashboard.tsx`
  - Architecture ref: `ARCHITECTURE.md > Dashboard`
  - Notes: Supports optional `cityId` filter.

- [ ] Caching for heavy KPI endpoints
  - Source: Add Redis/optional caching layer
  - Architecture ref: `ARCHITECTURE.md > Performance`
  - Notes: Not implemented; consider feature flag.

### WebSocket & Notifications

- [x] WebSocket server + auth

  - Source: `backend/src/index.ts` (init), `backend/src/lib` (ws helpers)
  - Architecture ref: `ARCHITECTURE.md > Real-time`
  - Notes: City-scoped rooms/events.

- [x] Real-time events for keys, permissions, locks

  - Source: Emitted in services/controllers; consumed by `rfid-frontend/src/pages/LocationDetails.tsx`
  - Architecture ref: `ARCHITECTURE.md > Real-time`

- [ ] Notification service (SMS/Email) provider abstraction
  - Source: (planned) `backend/src/services/notification.service.ts`
  - Architecture ref: `ARCHITECTURE.md > Notifications`
  - Notes: Twilio deps present; wire env-gated provider.

### DB Migrations & Indexes

- [x] Prisma schema, migrations, and seed

  - Source: `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, `backend/prisma/seed.ts`
  - Architecture ref: `ARCHITECTURE.md > Data model`

- [x] Indexes on hot paths (cityId, userId, lockId, isActive)
  - Source: `backend/prisma/schema.prisma`
  - Architecture ref: `ARCHITECTURE.md > Data model > Indexes`

---

## Frontend

### Login & Tenant Context

- [x] City + Username + Password login

  - Source: `rfid-frontend/src/components/Login.tsx`, `rfid-frontend/src/contexts/AuthContext.tsx`
  - Architecture ref: `ARCHITECTURE.md > Authentication`
  - Notes: City is required; lists cities from `/api/city`.

- [x] City scope provider and persistence

  - Source: `rfid-frontend/src/contexts/CityContext.tsx`
  - Architecture ref: `ARCHITECTURE.md > RBAC/Scoping`
  - Notes: Stores `cityId` in `localStorage`; dispatches `city:changed`.

- [ ] Tenant mode (Project + City) feature flag and UI (UI wiring pending)
  - Source: (planned) `TenantContext` replacing `CityContext`
  - Architecture ref: `ARCHITECTURE.md > Tenant Model`
  - Notes: Back-end dual-mode planned.

### Dashboard & KPI Pages

- [x] Dashboard with KPIs and recent logs
  - Source: `rfid-frontend/src/components/Dashboard.tsx`
  - Architecture ref: `ARCHITECTURE.md > Dashboard`
  - Notes: Sorting for locations; link to access logs and location details.

### Users / Locks / Keys Pages

- [x] Users list + view/edit/create/delete + CSV export

  - Source: `rfid-frontend/src/components/UserManagement.tsx`
  - Architecture ref: `ARCHITECTURE.md > Users`

- [x] Locks list + activate/deactivate + ping

  - Source: `rfid-frontend/src/components/Locks.tsx`
  - Architecture ref: `ARCHITECTURE.md > Locks`

- [x] Access logs list + filters + CSV export

  - Source: `rfid-frontend/src/components/AccessLogs.tsx`
  - Architecture ref: `ARCHITECTURE.md > Access Logs`

- [x] Location details with Users/Locks/Keys tabs
  - Source: `rfid-frontend/src/pages/LocationDetails.tsx`, `rfid-frontend/src/services/locationApi.ts`
  - Architecture ref: `ARCHITECTURE.md > Location Overview & Admin Connect`
  - Notes: Route is `/location/:addressId`; docs show `/locations/:addressId` (add alias or update docs).

### Real-time updates

- [x] WebSocket connection and event handling
  - Source: `rfid-frontend/src/hooks/useWebSocket` (via `App.tsx`), `rfid-frontend/src/services/socket.ts`
  - Architecture ref: `ARCHITECTURE.md > Real-time`
  - Notes: Auth payload `{ token: 'Bearer <token>', cityId }`.

### Reusable UI components

- [x] Shared DataTable, FilterBar, Pagination
  - Source: `rfid-frontend/src/components/ui/*`
  - Architecture ref: `ARCHITECTURE.md > Frontend`

### Post-login redirects

- [ ] Redirect to assigned location(s) or dashboard based on role/scope
  - Source: (planned) `rfid-frontend/src/contexts/AuthContext.tsx` + router logic
  - Architecture ref: `ARCHITECTURE.md > Frontend > Navigation`

---

## DevOps & Testing

- [x] Dockerization (DB, API, Frontend)

  - Source: `docker-compose.yml`, `backend/Dockerfile`, `rfid-frontend/Dockerfile`
  - Architecture ref: `PRODUCTION_SETUP.md`

- [x] ESLint + TypeScript strict across backend/frontend

  - Source: `backend/eslint.config.*`, `rfid-frontend/eslint.config.js`, tsconfigs
  - Architecture ref: `PROJECT_CHECKLIST.md`

- [x] CI pipeline for lint, typecheck, tests (baseline)

  - Source: CI config (repo-level)
  - Architecture ref: `PROJECT_CHECKLIST.md`
  - Notes: Expand tests per sections below.

- [ ] Frontend tests (components, hooks, smoke)

  - Source: Add tests in `rfid-frontend/src/test/*`
  - Architecture ref: `PROJECT_CHECKLIST.md > Frontend`
  - Notes: Cover `LocationDetails`, login, dashboard sorting, CSV exports.

- [x] Backend integration tests for locations, users, rfid, access logs
  - Source: `backend/__tests__/*`
  - Architecture ref: `PROJECT_CHECKLIST.md > Backend`

---

## Security & Performance

- [x] Rate limiting for auth and API

  - Source: `backend/src/middleware/rateLimit.middleware.ts`, `backend/src/app.ts`
  - Architecture ref: `ARCHITECTURE.md > Security`

- [ ] Input validation coverage on all create/update routes

  - Source: Validators in controllers/middleware; extend for new/bulk routes (`/api/location/:addressId/*`, `/api/rfid`, `/api/permission`)
  - Architecture ref: `ARCHITECTURE.md > Validation`
  - Notes: Add schemas (e.g., Joi/Zod) for bulk payloads.

- [ ] 2FA SMS (feature flagged)

  - Source: See subtasks below
  - Architecture ref: `ARCHITECTURE.md > Two-Factor Authentication`

- [ ] Optional caching for dashboard/access stats

  - Source: Redis + cache middleware
  - Architecture ref: `ARCHITECTURE.md > Performance`

- [ ] RBAC hardening review for bulk routes
  - Source: `backend/src/middleware/auth.middleware.ts`, `role.middleware.ts`
  - Architecture ref: `ARCHITECTURE.md > RBAC`

### Optional Subtasks: 2FA SMS (Login)

Backend

- [ ] Add env flags: `TWOFA_ENABLED`, TTLs, resend cooldown
- [ ] Extend `User` model with `phone`, `twoFactorEnabled`, `twoFactorVerifiedAt`
- [ ] `POST /api/auth/login` returns 202 `{ challengeId, maskedPhone }` when 2FA required
- [ ] `POST /api/auth/2fa/verify` accepts `{ challengeId, code }`; returns tokens
- [ ] `POST /api/auth/2fa/resend` with rate limiting
- [ ] Audit logs for create/verify/fail/lockout

Frontend

- [ ] Two-step login UI with countdown and resend
- [ ] Validation for 6-digit codes; disable submit until valid
- [ ] Persist tokens on success; continue normal redirect

Tests

- [ ] Unit (code generation/verify/expiry), integration (202+verify/resend), e2e (UI flow)

---

## Tenant Migration (Project + City)

- [x] Backend scaffolding: feature flags and helpers (no behavior change)

  - Env: `TENANT_MODE=city-only|project-city` and read/write migration toggles
  - Code: tenant config helper and new scope helper added; existing city-only behavior preserved

- [x] Frontend scaffolding: feature flag and context (no UI change)

  - Env: `VITE_TENANT_MODE=city-only|project-city`
  - Code: `TenantContext` placeholder gated by the flag

- [ ] Branching/PR strategy and migration runbook

  - Strategy: feature branch `feat/tenant-migration`, small reversible PRs
  - Ops: documented rollback and validated DB backup/restore procedure

- [x] Backend: add `Project`, `ProjectCity`, `projectCityId` scoping; dual-mode auth

  - Source: Prisma models/migrations; auth/login update; JWT now carries `cityId` and `projectCityId`; scope helpers consume claims
  - Architecture ref: `ARCHITECTURE.md > Tenant Model`

- [x] Frontend: `TenantContext`, login UI for project+city, feature flag `VITE_TENANT_MODE`
  - Source: New context and login update
  - Architecture ref: `ARCHITECTURE.md > Tenant Model`
  - Notes: Project+City selectors appear only when `VITE_TENANT_MODE=project-city`; cities filter by selected project.

---

## Naming/Route Alignment

- [ ] Add route alias or update docs: `/location/:addressId` (frontend) vs `/locations/:addressId` (docs)
  - Source: `rfid-frontend/src/App.tsx`, docs (`ARCHITECTURE.md` / `docs/*`)
  - Architecture ref: `ARCHITECTURE.md > Location Overview`
  - Notes: Add alias route to avoid breaking links.

---

## Acceptance Criteria Snapshot

- Auth, Users, Access Logs, Permissions, Dashboard implemented and protected by roles
- CSV exports work for Access Logs and Users
- Real-time updates reflect key/permission/lock changes
- City scoping enforced in queries and UI state
- CI green: lint, typecheck, unit/integration tests
- Dockerized stack runs via compose
- Location Details complete and documented; alias path resolved
