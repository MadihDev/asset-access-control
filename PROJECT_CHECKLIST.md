# RFID Access Control System – Delivery Checklist

This checklist tracks what’s DONE vs NOT DONE to reach 100% completion, based on ARCHITECTURE.md and the current codebase.

## Backend (API)

- [x] Project scaffolding (TypeScript, Express)
- [x] Prisma schema and client generation
- [x] PostgreSQL 17 setup and connectivity
- [x] Seed script with demo data (admins, users, locks, logs)
- [x] Auth: login, JWT issuance, token validation
- [x] Auth middleware: `authenticateToken`, role checks (admin/manager)
- [x] Users API: list, get by id, create, update, delete, stats
- [x] Access endpoints under lock routes (access logs, export, stats)
- [x] Dashboard API: overview stats + recent access logs
- [x] Global error handling middleware
- [x] Validation middleware (express-validator)
- [x] Access Logs API: list with filters and pagination (`GET /api/lock/access-logs`) — tracks lock usage
- [x] Access Logs export CSV (`GET /api/lock/access-logs/export`)
- [x] Access statistics (`GET /api/lock/access-stats`)
- [x] Permissions API: user permissions and RFID key management (assign/revoke)
- [ ] Notification service (email/SMS) integration toggles and stubs
- [x] Rate limiting middleware (e.g., for auth endpoints)
- [x] Audit logging of key actions (login, permission changes, RFID key issue/revoke)
- [x] Audit Logs API: list with filters and pagination (`GET /api/audit`)
- [x] City directory endpoint for login (`GET /api/city`)
- [x] City-scoped login: validate `{ username, password, cityId }` within selected city
- [x] Seed/demo users assigned to cities (`User.cityId`) for out-of-the-box city login
- [x] Key auto-expiry enforcement (6h) + background job to deactivate
  - [x] Real-time notifications on expiry (WebSocket)
- [x] City-scoped RBAC filters across all endpoints
- [x] WebSocket setup: connection/auth handlers, real-time access events
- [x] Dockerfile and docker-compose (DB, API, frontend)
- [x] API docs (docs/api.md) with endpoints, params, and examples

### Location Overview & Admin Connect (Backend)

- [x] Location-scoped endpoints (by Address)
  - [x] GET `/api/location/:addressId/users` (status=active|inactive, pagination)
  - [x] GET `/api/location/:addressId/locks` (status=online|offline|active|inactive, pagination)
  - [x] GET `/api/location/:addressId/keys` (status=active|expired, pagination)
  - [x] Bulk endpoints: permissions grant/revoke and key assignments (limits + validation)
  - [x] Index review: `UserPermission.lockId`, `UserPermission.userId`, `Lock.addressId`, `RFIDKey.userId`, `RFIDKey(isActive, expiresAt)`, `Address.cityId`, `User.cityId`

## Frontend (Vite + React + Tailwind v4)

Note: the frontend lives in the `rfid-frontend/` folder.

- [x] Project scaffolding with Vite + TS + Tailwind v4
- [x] Environment config: `VITE_API_URL`
- [x] Shared Axios client with token injection
- [x] AuthContext with `login`, `logout`, profile loading
- [x] App wrapped with `AuthProvider`
- [x] Axios 401 interceptor (auto logout + redirect)
- [x] Dashboard: loads real stats from API (with error states)
- [x] Users: paginated list wired to `/api/user`
- [x] Users: search, sort, role filter, view/edit forms
- [x] Access Logs page: list with filters (date, user, lock, result, type)
- [x] Permissions UI: assign RFID keys, grant/revoke access to locks
- [x] Reusable DataTable, Pagination, and Filter components
- [x] Route guard and role-based protection utilities
- [x] Notification/toast system for errors/success
- [x] Audit Logs page: list with filters, sorting, and pagination
- [x] Export CSV from logs (Access Logs)
- [x] Export CSV from users
- [ ] Tests (components, hooks, and e2e smoke)
- [x] Login page: City + Username + Password
- [ ] Post-login redirect to user-assigned location(s) in selected city
- [x] Dashboard: per-location KPIs (Active Users, Active Locks, Active Keys)
  - [x] Sorting (name, active users, success rate) and asc/desc toggle
  - [x] Success rate and attempts per location
  - [x] Links to Access Logs pre-filtered by `addressId`
- [x] Real-time KPI updates via WebSocket

Alignment updates (from comparison):

- [ ] Navigation: add Location Details to main nav and ensure route path matches docs or document alias
- [ ] Route alias: support `/locations/:addressId` in addition to existing `/location/:addressId` (non-breaking)
- [ ] Global layout shell: sidebar/header/footer based on simplified design; defer full layout until tenant migration

### Location Overview & Admin Connect (Frontend)

- [ ] Location Details page `/locations/:addressId` with tabs/sections:
  - [ ] Users (Active | Inactive)
  - [ ] Locks (Online | Offline) and (Active | Inactive)
  - [ ] Keys (Active | Inactive)
- [ ] Status filters, chips/toggles, server-side pagination
- [ ] Admin actions in-context: assign/reassign keys; grant/revoke lock permissions (include bulk)
- [ ] Real-time updates for key/permission/lock changes without manual refresh

## DevOps & Quality

- [x] ESLint + Prettier configured
- [x] TypeScript strict mode for frontend/back
- [x] CI workflow (lint, typecheck, test)
- [x] Environment templates (`.env.example`) up to date for both apps
- [x] README/docs updated for run, build, deploy
- [x] Basic monitoring/health endpoints exposed

Alignment updates (from comparison):

- [ ] Wire Twilio notification service (env-gated) and use for SMS 2FA and future alerts
- [ ] Add optional Redis and enable caching for heavy dashboard endpoints

### Location Overview & Admin Connect (Docs, Tests, Ops)

- [x] API docs for location endpoints (users/locks/keys; bulk)
- [ ] Frontend README section for Location Details workflow
- [x] Backend integration tests for location endpoints
- [ ] Frontend component tests for Location Details lists/actions
- [x] Rate limiting for bulk endpoints and sensitive operations

## Data & Security

- [x] Password hashing with bcrypt
- [x] JWT secrets and expiry envs
- [x] Refresh token rotation with DB-backed revocation and rotation
- [ ] RBAC hardening on all endpoints
- [ ] Input validation on all create/update routes
  - [ ] Validation for new location endpoints and bulk actions
- [ ] Rate limiting for brute-force protection

Alignment updates (from comparison):

- [ ] RBAC validation coverage review for new/bulk routes (harden where needed)

### Two-Factor Authentication (SMS 2FA)

Backend (API)

- [ ] Env flags and config: `TWOFA_ENABLED`, `TWOFA_CODE_TTL_SEC`, `TWOFA_MAX_ATTEMPTS`, `TWOFA_RESEND_COOLDOWN_SEC`
- [ ] Extend `User` with `phone`, `twoFactorEnabled`, `twoFactorVerifiedAt`
- [ ] New `TwoFactorChallenge` store (DB or Redis) with hashed code and TTL
- [ ] `POST /api/auth/login` returns 202 with `{ challengeId, maskedPhone }` when 2FA required
- [ ] `POST /api/auth/2fa/verify` accepts `{ challengeId, code }` and returns tokens
- [ ] `POST /api/auth/2fa/resend` rate-limited resend
- [ ] Audit logs for challenge create, verify success, verify fail, lockout
- [ ] Lockout after max attempts; 423 status on locked challenge
- [ ] Rate limiting on verify and resend endpoints

Frontend (Vite + React)

- [ ] Two-step login UI: step 1 (password), step 2 (code input)
- [ ] Masked phone display and countdown timer
- [ ] Resend button with cooldown and error states
- [ ] Validation for 6-digit numeric code; disable submit until valid
- [ ] Persist tokens on success and proceed with normal redirect

DevOps

- [ ] Add Twilio envs: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`
- [ ] Update `.env.example` for backend
- [ ] Feature flag default off in production; enable per environment

QA & Tests

- [ ] Unit tests: code generation, hashing/verify, expiry and lockout
- [ ] Integration tests: 202 flow, verify success, verify fail, lockout, resend
- [ ] Frontend e2e: full two-step login, resend cooldown, error messaging
- [ ] Security tests: brute-force rate limit, no raw code in logs

Acceptance Criteria

- [ ] When enabled, users with 2FA must provide a valid SMS code to receive tokens
- [ ] Incorrect or expired codes yield appropriate errors; lockout after max attempts
- [ ] Resend is rate-limited; audit entries exist for all events

## Real-Time & Analytics (later phase)

- [x] WebSocket client + server for live access events
- [ ] System health panel (online/offline locks, last seen)
- [ ] Access charts and usage analytics (daily/weekly trends)

Alignment updates (from comparison):

- [ ] System health panel on frontend backed by existing backend health data

## Scalability & Performance (New – Risk Mitigation)

- [x] Add indexes on frequently queried columns (userId, keyId, cityId)
- [ ] Consider caching for dashboard/KPI endpoints (Redis or in-memory)
- [ ] Plan for log storage growth: partition tables or separate analytics DB
- [ ] Optimize background job for key expiry (avoid DB bottleneck on large datasets)
- [ ] Evaluate multi-city/multi-country support for future scalability

## Tenant Migration: Project + City Login (New)

End goal: Replace city-only scoping with Project + City (tenant) scoping (e.g., PerfectIT_Amsterdam), isolating users, locks, permissions, and KPIs per tenant.

### Backend (API)

- [ ] Data model
  - [ ] Add `Project` model (id, name, slug, isActive, timestamps)
  - [ ] Add `ProjectCity` model (id, projectId, cityId, isActive, unique(projectId, cityId))
  - [ ] Add `projectCityId` to scoped tables: `User`, `UserPermission`, `Lock`, `AccessLog` (and `Address` if needed)
  - [ ] Indexes: unique(Project.slug); indexes on `projectCityId` across scoped tables
- [ ] Prisma migration: create models/columns and generate client
- [ ] Seed updates
  - [ ] Seed sample `Project` (e.g., PerfectIT)
  - [ ] Seed `ProjectCity` rows (PerfectIT × Amsterdam, Utrecht, ...)
  - [ ] Seed users/locks/permissions bound to `projectCityId`
- [ ] Auth and scope
  - [ ] Update `/api/auth/login` to accept `{ username, password, project, city }` (and optionally `tenant: "Project_City"`)
  - [ ] Resolve tenant → `projectCityId`; find user by `username + projectCityId`
  - [ ] Include `projectId` and `projectCityId` in JWT claims
  - [ ] Add `getEffectiveScope(req)` helper returning `{ projectId, cityId, projectCityId }`
- [ ] Services & controllers
  - [ ] Update scoping from `cityId` to `projectCityId` for: Users, Locks, Permissions, RFID, Audit, Dashboard, Access Logs
  - [ ] Maintain backward-compat: prefer `projectCityId`, fallback to `cityId` during migration
- [ ] Optional supporting endpoints
  - [ ] `GET /api/project` (list active projects)
  - [ ] `GET /api/city?project=PerfectIT` (list cities for project)
- [ ] CSV/export endpoints include project+city columns and filter by tenant

### Frontend (Vite + React)

- [ ] Login UI
  - [ ] Replace city-only with Project (text input) + City (select)
  - [ ] Optionally: autocomplete projects (`GET /api/project`) and filter cities by project (`GET /api/city?project=...`)
  - [ ] Validation: both fields required; disable Sign in until city selected
- [ ] Auth state & context
  - [ ] Store `project`, `city`, and `projectCityId` with tokens
  - [ ] Rename `CityContext` → `TenantContext` (or `ScopeContext`); update all consumers
- [ ] Pages & API calls
  - [ ] Update queries/mutations to include tenant scope (`projectCityId` or `{project,city}`)
  - [ ] Users/Locks/Permissions/RFID pages respect tenant filtering and creation rules
  - [ ] Exports include project/city; filters include tenant
- [ ] Feature flag
  - [ ] Add `VITE_TENANT_MODE=project_city` to toggle new UI while backend supports both

### Data Migration & Ops

- [ ] Backfill script
  - [ ] Create default `Project` (e.g., "Default")
  - [ ] For each existing `cityId`, create `ProjectCity` under Default
  - [ ] Update users/locks/permissions/accessLogs with matching `projectCityId`
- [ ] Apply indexes; verify query plans prefer `projectCityId`

### QA & Rollout

- [ ] Dual-mode login: backend accepts legacy `{ cityId }` and new `{ project, city }`
- [ ] E2E: two tenants with same usernames (PerfectIT_Amsterdam vs PerfectIT_Utrecht) remain isolated
- [ ] Integration tests for tenant-scoped listing/creation and RBAC
- [ ] Docs updated (README, API refs, migration notes)
- [ ] Deploy order: backend dual-mode → frontend with feature flag → migrate/backfill → enable new mode → monitor

### Tests & QA (comparison-driven)

- [ ] Frontend: tests for Location Details rendering and actions
- [ ] Frontend: post-login redirect behavior test
- [ ] Frontend: 2FA flows (202 accept, verify success/failure, resend cooldown)
- [ ] Backend: GET /api/project endpoint tests
- [ ] Backend: notification service stub/provider tests

## Release Criteria (to hit 100%)

- [ ] All major features implemented: Auth, Users, Access Logs, Permissions, Dashboard
- [ ] Full CRUD + filters/pagination on Users and Logs
- [ ] Role-based protection enforced end-to-end
- [ ] Error normalization consistently applied, with toasts/UI feedback
- [ ] CI green: lint, typecheck, unit/integration tests
- [ ] Dockerized stack runs locally with one command
- [ ] Minimal docs: run, seed, build, deploy, and API references
- [ ] Location Details feature implemented and documented (pages + endpoints)

---

Quick Wins to do next:

- Post-login: redirect to user-assigned location(s) in selected city.
- Tests: add frontend login/dashboard tests and more backend city-scope integration tests.
- Optional: system health panel (online/offline locks) and basic access charts.
- Optional: caching for dashboard endpoint; add charts for success/failure trends.
- [x] Frontend: automatic refresh-token flow (refresh on 401, retry once).
- [x] Backend: scheduled cleanup for expired refresh tokens.
- [ ] Switch to tenant-mode login (Project + City): add feature flag, implement login UI, and enable backend dual-mode.
