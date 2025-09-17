# Internal Project Map

This document provides a concise map of the repository to help with onboarding, debugging, and planning.

## File Tree (high-level)

- `backend/` — Express + Prisma API, background jobs, tests
  - `src/`
    - `app.ts`, `index.ts`
    - `controllers/` — request handlers
    - `routes/` — API route definitions
    - `middleware/` — auth, RBAC, validation, rate limiting, error
    - `jobs/` — background jobs (key expiry, refresh cleanup)
    - `lib/` — logger, websocket init, prisma client, RBAC helpers
    - `config/`, `types/`
  - `prisma/` — `schema.prisma`, migrations, `seed.ts`
  - `__tests__/` — API/integration tests
- `rfid-frontend/` — Vite + React app
  - `src/`
    - `components/` — UI feature components and UI kit
    - `pages/` — page-level components
    - `contexts/` — app-wide state
    - `services/` — API/WS clients
    - `App.tsx`, `main.tsx`, `index.css`
- `docs/`, `ARCHITECTURE.md`, `PROJECT_CHECKLIST.md`, `docker-compose.yml`, etc.

---

## Backend: Routes and Endpoints

Base prefix: `/api`

- Health

  - `GET /api/health` — liveness probe

- Auth (`/api/auth`)

  - `POST /login`
  - `POST /refresh-token`
  - `POST /reset-password`
  - `POST /logout` (auth)
  - `POST /change-password` (auth)
  - `GET /profile` (auth)

- Users (`/api/user`) (auth)

  - `GET /` (manager+, pagination/filters)
  - `GET /export` (manager+) — CSV
  - `GET /with-permissions` (manager+)
  - `POST /` (admin)
  - `GET /:id`
  - `PUT /:id` (admin)
  - `DELETE /:id` (admin)
  - `GET /:id/stats`

- Locks (`/api/lock`)

  - `POST /access-attempt` — device access logging (no JWT)
  - (auth) `GET /access-logs`, `GET /access-logs/export` (manager+), `GET /access-stats` (manager+)
  - (auth) `GET /` — list
  - (auth) `POST /:id/ping` (manager+)
  - (auth) `PUT /:id` (admin), `GET /:id`

- Dashboard (`/api/dashboard`)

  - `GET /` (auth) — overview stats

- Permissions (`/api/permission`) (auth, manager+)

  - `GET /`
  - `POST /`
  - `PUT /:id`
  - `DELETE /:id`

- RFID Keys (`/api/rfid`) (auth)

  - `GET /` (manager+)
  - `POST /` (admin)
  - `PUT /:id` (admin)
  - `POST /assign` (admin)
  - `POST /revoke` (admin)

- Audit Logs (`/api/audit`) (auth, manager+)

  - `GET /` — list with filters

- City Directory (`/api/city`)

  - `GET /` — list active cities

- Location Overview & Admin Connect (`/api/location`) (auth)

  - `GET /:addressId/users`
  - `GET /:addressId/locks`
  - `GET /:addressId/keys`
  - `POST /:addressId/permissions` (manager+) — bulk grant/revoke
  - `POST /:addressId/keys/assign` (manager+) — bulk assign keys

- Simulation (`/api/sim`) — enabled when `ENABLE_SIM_ROUTES=true` (auth, admin)
  - `POST /access`
  - `POST /lock-status`

Cross-cutting middleware: `authenticateToken`, `requireManagerOrAbove`, `requireAdmin`, `apiLimiter`, `authLimiter`, `bulkLimiter`, validators, `errorHandler`.

Background jobs: `keyExpiry.job.ts`, `refreshCleanup.job.ts`.

WebSockets: initialized in `index.ts` via `initWebSocket(server)`; city-scoped rooms for KPI/key events.

---

## Database Schema (Prisma models)

- `User`

  - Fields: `id`, `email`, `username`, `firstName`, `lastName`, `password`, `role`, `isActive`, timestamps, `lastLoginAt`, `cityId`
  - Relations: `city`, `rfidKeys`, `permissions`, `accessLogs`, `auditLogs`, `refreshTokens`
  - Indexes: `@unique(email)`, `@unique(username)`, `@index(cityId)`

- `City`

  - Fields: `id`, `name` (unique), `country`, `isActive`, timestamps
  - Relations: `addresses`, `users`

- `Address`

  - Fields: `id`, `street`, `number`, `zipCode`, `isActive`, timestamps, `cityId`
  - Relations: `city`, `locks`
  - Indexes: unique composite `(street, number, zipCode, cityId)`, `@index(cityId)`

- `Lock`

  - Fields: `id`, `name`, `deviceId` (unique), `secretKey`, `lockType`, `isActive`, `isOnline`, `lastSeen`, `addressId`, timestamps
  - Relations: `address`, `accessLogs`, `permissions`
  - Indexes: `@index(addressId)`, `@index(isActive, isOnline)`

- `RFIDKey`

  - Fields: `id`, `cardId` (unique), `name`, `isActive`, `issuedAt`, `expiresAt`, timestamps, `userId`
  - Relations: `user`, `accessLogs`
  - Indexes: `@index(userId)`, `@index(isActive, expiresAt)`

- `UserPermission`

  - Fields: `id`, `canAccess`, validity window, timestamps, `userId`, `lockId`
  - Relations: `user`, `lock`
  - Indexes: unique `(userId, lockId)`, `@index(userId)`, `@index(lockId)`

- `AccessLog`

  - Fields: `id`, `accessType`, `result`, `timestamp`, `deviceInfo`, `metadata`, `userId?`, `rfidKeyId?`, `lockId`, denormalized `cityId` for fast filtering
  - Indexes: `@index(cityId, timestamp)`, `@index(result)`, `@index(userId)`, `@index(lockId)`

- `AuditLog`

  - Fields: `id`, `action`, `entityType`, `entityId`, diffs, `ipAddress`, `userAgent`, `timestamp`, `userId?`

- `SystemConfig` (key/value) and `NotificationTemplate` (type+content) for messaging

- `RefreshToken` — rotation/revocation; indexes on `(userId, isRevoked)` and `expiresAt`

Enums: `UserRole`, `LockType`, `AccessType`, `AccessResult`, `AuditAction`, `NotificationType`.

Note: Current schema is city-scoped; tenant Project+City is planned (see `ARCHITECTURE.md`).

---

## Frontend: Contexts, Components, Pages, Services

Contexts

- `AuthContext.tsx` — auth state, tokens, login/logout, profile
- `CityContext.tsx` — current scoping (tenant context planned)
- `ToastContext.tsx` + `ToastStore.ts` — notifications

Components (feature)

- `Login.tsx`, `Dashboard.tsx`, `UserManagement.tsx`, `AccessLogs.tsx`, `AuditLogs.tsx`, `Locks.tsx`, `Settings.tsx`
- Routing/guards: `Navigation.tsx`, `ProtectedRoute.tsx`
- UI kit: `components/ui/` — `DataTable.tsx`, `FilterBar.tsx`, `Pagination.tsx`

Pages

- `pages/LocationDetails.tsx` — route currently `/location/:addressId` (docs use `/locations/:addressId`; alias planned)

Services

- `services/api.ts` — Axios client & interceptors
- `services/locationApi.ts` — location endpoints
- `services/websocket.ts`, `services/socket.ts` — socket.io-client

---

## Feature-to-File Mapping

Authentication

- Backend: `routes/auth.routes.ts`, `controllers/auth.controller.ts`, `middleware/auth.middleware.ts`, Prisma `RefreshToken`
- Frontend: `components/Login.tsx`, `contexts/AuthContext.tsx`, `components/ProtectedRoute.tsx`, `services/api.ts`

RBAC & Rate Limiting

- Backend: `middleware/role.middleware.ts`, `middleware/rateLimit.middleware.ts`
- Frontend: `ProtectedRoute.tsx` and role-based UI props

Users

- Backend: `routes/user.routes.ts`, `controllers/user.controller.ts`
- Frontend: `components/UserManagement.tsx`, UI kit components

Locks & Access

- Backend: `routes/lock.routes.ts`, `controllers/lock.controller.ts`, `controllers/access.controller.ts`
- Frontend: `components/Locks.tsx`, `components/AccessLogs.tsx`

Permissions & RFID

- Backend: `routes/permission.routes.ts`, `controllers/permission.controller.ts`, `routes/rfid.routes.ts`, `controllers/rfid.controller.ts`
- Frontend: `UserManagement.tsx` (permissions & keys), related modals/views

Dashboard

- Backend: `routes/dashboard.routes.ts`, `controllers/dashboard.controller.ts`
- Frontend: `components/Dashboard.tsx` + WebSocket services

Audit Logs

- Backend: `routes/audit.routes.ts`, `controllers/audit.controller.ts`
- Frontend: `components/AuditLogs.tsx`

Location Overview & Admin Connect

- Backend: `routes/location.routes.ts`, `controllers/location.controller.ts`
- Frontend: `pages/LocationDetails.tsx`, `services/locationApi.ts`

City Directory (Login)

- Backend: `routes/city.routes.ts`
- Frontend: `components/Login.tsx`

Background Jobs

- Backend: `jobs/keyExpiry.job.ts`, `jobs/refreshCleanup.job.ts`

WebSockets

- Backend: `lib/ws.ts` (init, rooms/events)
- Frontend: `services/socket.ts`, `services/websocket.ts`

2FA (SMS) — planned

- Backend: 2FA endpoints (`/api/auth/2fa/*`), `NotificationService` (Twilio), `TwoFactorChallenge` store (DB/Redis)
- Frontend: two-step login UI with resend & countdown

Tenant Model (Project + City) — planned

- Backend: add `Project`, `ProjectCity`, update scoping
- Frontend: `TenantContext`, login with project+city

---

## Dependencies and Libraries

Backend

- Core: `express`, `cors`, `helmet`, `dotenv`, `compression`, `morgan`
- Auth/Security: `jsonwebtoken`, `bcryptjs`, `express-rate-limit`, `express-validator`, `joi`
- DB/ORM: `pg`, `@prisma/client` (dev: `prisma`)
- Files/CSV: `multer`, `csv-parser`, `csv-writer`
- Logging: `winston`
- Real-time: `socket.io`
- Notifications: `twilio`
- Test/Tooling: `jest`, `supertest`, `ts-jest`, `ts-node`, `tsx`, `typescript`, ESLint/Prettier

Frontend

- Core: `react`, `react-dom`, `react-router-dom`
- Data fetching/cache: `@tanstack/react-query`
- HTTP: `axios`
- Real-time: `socket.io-client`
- CSS/Build: `tailwindcss` v4, `@tailwindcss/postcss`, `postcss`, `autoprefixer`, `vite`, `@vitejs/plugin-react`, `typescript`, ESLint
- Testing: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`/`happy-dom`

---

## Notes & Known Gaps (from comparison)

- Route naming: Frontend uses `/location/:addressId`; docs use `/locations/:addressId` — plan to add alias.
- Post-login redirect: to assigned location(s) or dashboard — planned.
- Notification service: Twilio deps present but not wired — add provider abstraction and hook into 2FA.
- Optional caching: Redis for dashboard endpoints.
- Testing: add frontend tests for Location Details, post-login redirect, and 2FA; backend tests for upcoming `GET /api/project`.
