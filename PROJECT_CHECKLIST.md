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

- [ ] Location-scoped endpoints (by Address)
  - [ ] GET `/api/location/:addressId/users` (status=active|inactive, pagination)
  - [ ] GET `/api/location/:addressId/locks` (status=online|offline|active|inactive, pagination)
  - [ ] GET `/api/location/:addressId/keys` (status=active|inactive, pagination)
  - [ ] Bulk endpoints: permissions grant/revoke and key assignments
  - [ ] Index review: `UserPermission.lockId`, `Lock.addressId`, `RFIDKey.userId`

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

### Location Overview & Admin Connect (Docs, Tests, Ops)

- [ ] API docs for location endpoints (users/locks/keys; bulk)
- [ ] Frontend README section for Location Details workflow
- [ ] Backend integration tests for location endpoints
- [ ] Frontend component tests for Location Details lists/actions
- [ ] Rate limiting for bulk endpoints and sensitive operations

## Data & Security

- [x] Password hashing with bcrypt
- [x] JWT secrets and expiry envs
- [x] Refresh token rotation with DB-backed revocation and rotation
- [ ] RBAC hardening on all endpoints
- [ ] Input validation on all create/update routes
  - [ ] Validation for new location endpoints and bulk actions
- [ ] Rate limiting for brute-force protection

## Real-Time & Analytics (later phase)

- [x] WebSocket client + server for live access events
- [ ] System health panel (online/offline locks, last seen)
- [ ] Access charts and usage analytics (daily/weekly trends)

## Scalability & Performance (New – Risk Mitigation)

- [x] Add indexes on frequently queried columns (userId, keyId, cityId)
- [ ] Consider caching for dashboard/KPI endpoints (Redis or in-memory)
- [ ] Plan for log storage growth: partition tables or separate analytics DB
- [ ] Optimize background job for key expiry (avoid DB bottleneck on large datasets)
- [ ] Evaluate multi-city/multi-country support for future scalability

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
