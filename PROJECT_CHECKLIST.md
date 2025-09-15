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
- [x] Access Logs API: list with filters and pagination (`GET /api/lock/access-logs`)
- [x] Access Logs export CSV (`GET /api/lock/access-logs/export`)
- [x] Access statistics (`GET /api/lock/access-stats`)
- [x] Permissions API: user permissions and RFID key management (assign/revoke)
- [ ] Notification service (email/SMS) integration toggles and stubs
- [x] Rate limiting middleware (e.g., for auth endpoints)
 - [x] Audit logging of key actions (login, permission changes)
 - [x] Audit Logs API: list with filters and pagination (`GET /api/audit`)
- [ ] WebSocket setup: connection/auth handlers, real-time access events
- [ ] Dockerfile and docker-compose (DB, API, frontend, reverse proxy)
- [ ] API docs (docs/api.md) with endpoints, params, and examples

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

## DevOps & Quality

- [x] ESLint + Prettier configured
- [x] TypeScript strict mode for frontend/back
 - [x] CI workflow (lint, typecheck, test)
- [x] Environment templates (`.env.example`) up to date for both apps
 - [ ] README/docs updated for run, build, deploy
 - [x] Basic monitoring/health endpoints exposed

## Data & Security

- [x] Password hashing with bcrypt
- [x] JWT secrets and expiry envs
- [ ] Refresh token rotation (server-side tracking/blacklist optional)
- [ ] RBAC hardening on all endpoints
- [ ] Input validation on all create/update routes
- [ ] Rate limiting for brute-force protection

## Real-Time & Analytics (later phase)

- [ ] WebSocket client + server for live access events
- [ ] System health panel (online/offline locks, last seen)
- [ ] Access charts and usage analytics (daily/weekly trends)

## Release Criteria (to hit 100%)

- [ ] All major features implemented: Auth, Users, Access Logs, Permissions, Dashboard
- [ ] Full CRUD + filters/pagination on Users and Logs
- [ ] Role-based protection enforced end-to-end
- [ ] Error normalization consistently applied, with toasts/UI feedback
- [ ] CI green: lint, typecheck, unit/integration tests
- [ ] Dockerized stack runs locally with one command
- [ ] Minimal docs: run, seed, build, deploy, and API references

---

Quick Wins to do next:
- CI: add GitHub Actions workflow for lint, typecheck, and tests. — done (.github/workflows/ci.yml)
- Docs: update root README with run/seed/build steps, ports, and API overview.
- Docker: add Dockerfile(s) and docker-compose for DB, API (5001), and frontend (5173).
- Tests: add unit tests for services/controllers and key UI components.
- Real-time: add WebSocket server and client for live access events.
