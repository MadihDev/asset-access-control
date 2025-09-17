# RFID Access Control System - Architecture & Runtime Guide

This document combines the target system design with a quick runtime snapshot of the current repository so you can run and verify the app quickly.

## Quick Runtime Facts (current project state)

- Backend API: `http://localhost:5001`
- Frontend (Vite): typically `http://localhost:5173` (Vite may auto-pick `5174` if busy)
- Database: PostgreSQL 17 on `localhost:5433`, DB name `rfid_access_control`
- ORM: Prisma 5 (client generated)
- CSS: Tailwind CSS v4 with PostCSS pipeline
- Background jobs: Key expiry watcher auto-deactivates expired RFID keys
  - Env: `KEY_EXPIRY_JOB_INTERVAL_MS` (default 300000 ms = 5 minutes)

### Run commands (Windows PowerShell)

```powershell
# Backend
cd backend
npm install
npm run dev  # or: npx tsx src/index.ts

# Frontend
cd ..\rfid-frontend
npm install
npm run dev
```

### Tailwind v4 note

- `postcss.config.js` uses `@tailwindcss/postcss`
- `src/index.css` uses `@import "tailwindcss";` (v4 style)
- `tailwind.config.js` scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`

To verify styling loads, open the app in the browser and look for elements with Tailwind classes (e.g., white rounded cards with shadows in User Management, gradient background on Login). If it looks unstyled, hard refresh (Ctrl+F5) and ensure `src/main.tsx` imports `./index.css`.

---

## Backend Folder Structure (target design)

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts          # Login, register, JWT refresh
│   │   ├── user.controller.ts          # User CRUD operations
│   │   ├── location.controller.ts      # City/Address/Lock management
│   │   ├── permission.controller.ts    # RFID key assignments
│   │   ├── access.controller.ts        # Access attempt handling
│   │   ├── audit.controller.ts         # Logs and reports
│   │   └── dashboard.controller.ts     # Statistics and overview
│   │
│   ├── services/
│   │   ├── auth.service.ts             # JWT token handling
│   │   ├── user.service.ts             # User business logic
│   │   ├── location.service.ts         # Hierarchy management
│   │   ├── permission.service.ts       # Access control logic
│   │   ├── access.service.ts           # RFID validation
│   │   ├── audit.service.ts            # Logging and reporting
│   │   ├── notification.service.ts     # SMS/Email alerts
│   │   └── cache.service.ts            # Redis caching
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT verification
│   │   ├── role.middleware.ts          # Permission checking
│   │   ├── validation.middleware.ts    # Input validation
│   │   ├── ratelimit.middleware.ts     # API rate limiting
│   │   ├── audit.middleware.ts         # Request logging
│   │   └── error.middleware.ts         # Error handling
│   │
│   ├── models/
│   │   ├── schema.prisma               # Database schema
│   │   ├── user.model.ts               # User interfaces
│   │   ├── location.model.ts           # Location interfaces
│   │   ├── permission.model.ts         # Permission interfaces
│   │   └── audit.model.ts              # Audit log interfaces
│   │
│   ├── routes/
│   │   ├── auth.routes.ts              # /api/auth/*
│   │   ├── users.routes.ts             # /api/users/*
│   │   ├── locations.routes.ts         # /api/locations/*
│   │   ├── permissions.routes.ts       # /api/permissions/*
│   │   ├── access.routes.ts            # /api/access/*
│   │   ├── audit.routes.ts             # /api/audit/*
│   │   └── dashboard.routes.ts         # /api/dashboard/*
│   │
│   ├── websockets/
│   │   ├── connection.handler.ts       # WebSocket setup
│   │   ├── auth.handler.ts             # Socket authentication
│   │   ├── access.handler.ts           # Real-time access events
│   │   └── notification.handler.ts     # Live notifications
│   │
│   ├── jobs/
│   │   ├── cleanup.job.ts              # Database maintenance
│   │   ├── reports.job.ts              # Scheduled reports
│   │   └── notifications.job.ts        # Alert processing
│   │
│   ├── utils/
│   │   ├── encryption.util.ts          # Password hashing
│   │   ├── validation.util.ts          # Input validators
│   │   ├── date.util.ts                # Date formatting
│   │   ├── permissions.util.ts         # Access control helpers
│   │   └── logger.util.ts              # Logging utilities
│   │
│   ├── config/
│   │   ├── database.config.ts          # Prisma setup
│   │   ├── redis.config.ts             # Cache configuration
│   │   ├── websocket.config.ts         # Socket.io setup
│   │   ├── jwt.config.ts               # Token configuration
│   │   └── app.config.ts               # Application settings
│   │
│   ├── types/
│   │   ├── auth.types.ts               # Authentication types
│   │   ├── user.types.ts               # User-related types
│   │   ├── location.types.ts           # Location hierarchy types
│   │   ├── permission.types.ts         # Access control types
│   │   ├── audit.types.ts              # Logging types
│   │   └── api.types.ts                # API response types
│   │
│   └── index.ts                        # Application entry point
│
├── prisma/
│   ├── schema.prisma                   # Database schema
│   ├── migrations/                     # Database migrations
│   └── seed.ts                         # Initial data
│
├── tests/
│   ├── unit/                           # Unit tests
│   ├── integration/                    # API tests
│   └── e2e/                           # End-to-end tests
│
├── docker/
│   ├── Dockerfile                      # Container definition
│   ├── docker-compose.yml             # Multi-container setup
│   └── nginx.conf                      # Reverse proxy config
│
├── docs/
│   ├── api.md                          # API documentation
│   ├── deployment.md                   # Deployment guide
│   └── architecture.md                 # System architecture
│
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── eslint.config.js                    # ESLint rules
├── prettier.config.js                  # Prettier formatting
└── README.md                           # Project documentation
```

### Backend - current snapshot (this repo)

```
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── package.json
├── tsconfig.json
└── .env               # DATABASE_URL uses port 5433; PORT=5001
```

---

## Frontend Folder Structure (target design)

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Layout/                 # App layout wrapper
│   │   │   ├── Navigation/             # Main navigation
│   │   │   ├── Sidebar/                # Sidebar menu
│   │   │   ├── Header/                 # Top header
│   │   │   ├── Footer/                 # Page footer
│   │   │   ├── LoadingSpinner/         # Loading indicator
│   │   │   ├── ErrorBoundary/          # Error handling
│   │   │   ├── Modal/                  # Modal dialog
│   │   │   ├── DataTable/              # Reusable table
│   │   │   ├── SearchBar/              # Search component
│   │   │   ├── Pagination/             # Page navigation
│   │   │   └── ConfirmDialog/          # Confirmation popup
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm/              # User login
│   │   │   ├── RegisterForm/           # User registration
│   │   │   ├── ForgotPassword/         # Password reset
│   │   │   ├── ProfileSettings/        # User profile
│   │   │   └── ChangePassword/         # Password change
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Overview/               # Main dashboard
│   │   │   ├── StatsCards/             # Statistic widgets
│   │   │   ├── AccessChart/            # Access analytics
│   │   │   ├── RecentActivity/         # Latest events
│   │   │   ├── QuickActions/           # Common actions
│   │   │   └── SystemHealth/           # System status
│   │   │
│   │   ├── locations/
│   │   │   ├── CityManager/            # City CRUD
│   │   │   ├── AddressManager/         # Address CRUD
│   │   │   ├── LockManager/            # Lock CRUD
│   │   │   ├── LocationTree/           # Hierarchical view
│   │   │   ├── LocationForm/           # Add/Edit locations
│   │   │   └── LocationDetails/        # Location info
│   │   │
│   │   ├── users/
│   │   │   ├── UserList/               # All users table
│   │   │   ├── UserForm/               # Add/Edit user
│   │   │   ├── UserDetails/            # User profile view
│   │   │   ├── UserSearch/             # User search
│   │   │   └── UserImport/             # Bulk user import
│   │   │
│   │   ├── permissions/
│   │   │   ├── PermissionMatrix/       # Access grid
│   │   │   ├── RFIDKeyManager/         # RFID card assignment
│   │   │   ├── AccessLevelForm/        # Permission levels
│   │   │   ├── BulkPermissions/        # Mass assignments
│   │   │   └── PermissionHistory/      # Change history
│   │   │
│   │   ├── audit/
│   │   │   ├── AccessLogs/             # Access attempt logs
│   │   │   ├── AuditReport/            # Detailed reports
│   │   │   ├── LogFilters/             # Search filters
│   │   │   ├── ExportData/             # Data export
│   │   │   └── LogAnalytics/           # Usage analytics
│   │   │
│   │   └── real-time/
│   │       ├── LiveMonitor/            # Real-time access
│   │       ├── AlertCenter/            # Active alerts
│   │       ├── SystemStatus/           # Device status
│   │       └── EventStream/            # Live event feed
│   │
│   ├── pages/
│   │   ├── Dashboard/                  # Main dashboard page
│   │   ├── Login/                      # Login page
│   │   ├── Users/                      # User management
│   │   ├── Locations/                  # Location management
│   │   ├── Permissions/                # Permission management
│   │   ├── Audit/                      # Audit and logs
│   │   ├── Settings/                   # System settings
│   │   └── Profile/                    # User profile
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                  # Authentication hook
│   │   ├── useApi.ts                   # API calling hook
│   │   ├── useWebSocket.ts             # Real-time updates
│   │   ├── useLocalStorage.ts          # Local storage
│   │   ├── useDebounce.ts              # Input debouncing
│   │   ├── usePagination.ts            # Table pagination
│   │   └── usePermissions.ts           # User permissions
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.service.ts         # Auth API calls
│   │   │   ├── user.service.ts         # User API calls
│   │   │   ├── location.service.ts     # Location API calls
│   │   │   ├── permission.service.ts   # Permission API calls
│   │   │   ├── audit.service.ts        # Audit API calls
│   │   │   └── dashboard.service.ts    # Dashboard API calls
│   │   ├── websocket.service.ts        # WebSocket client
│   │   ├── storage.service.ts          # Local storage
│   │   ├── notification.service.ts     # Notifications
│   │   └── export.service.ts           # Data export
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Authentication state
│   │   ├── ThemeContext.tsx            # UI theme
│   │   ├── NotificationContext.tsx     # App notifications
│   │   ├── PermissionContext.tsx       # User permissions
│   │   └── WebSocketContext.tsx        # Real-time connection
│   │
│   ├── types/
│   │   ├── auth.types.ts               # Auth interfaces
│   │   ├── user.types.ts               # User interfaces
│   │   ├── location.types.ts           # Location interfaces
│   │   ├── permission.types.ts         # Permission interfaces
│   │   ├── audit.types.ts              # Audit interfaces
│   │   ├── api.types.ts                # API response types
│   │   └── common.types.ts             # Shared types
│   │
│   ├── utils/
│   │   ├── validation.utils.ts         # Form validation
│   │   ├── format.utils.ts             # Data formatting
│   │   ├── date.utils.ts               # Date operations
│   │   ├── export.utils.ts             # Data export
│   │   ├── permissions.utils.ts        # Permission checks
│   │   └── constants.ts                # App constants
│   │
│   ├── styles/
│   │   ├── globals.css                 # Global styles
│   │   ├── components.css              # Component styles
│   │   ├── utilities.css               # Utility classes
│   │   └── themes/                     # Theme definitions
│   │
│   └── assets/
│       ├── images/                     # Static images
│       ├── icons/                      # Icon files
│       └── fonts/                      # Custom fonts
│
├── public/
│   ├── index.html                      # HTML template
│   ├── favicon.ico                     # App icon
│   └── manifest.json                   # PWA manifest
│
├── tests/
│   ├── components/                     # Component tests
│   ├── hooks/                          # Hook tests
│   ├── services/                       # Service tests
│   └── e2e/                           # End-to-end tests
│
├── .env.example                        # Environment template
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── tailwind.config.js                  # Tailwind CSS
├── vite.config.ts                      # Vite configuration
└── README.md                           # Project documentation
```

### Frontend - current snapshot (this repo)

The frontend lives under `rfid-frontend/` (not `frontend/`).

```
rfid-frontend/
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx           # imports ./index.css
│   ├── index.css          # Tailwind v4: @import "tailwindcss";
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Navigation.tsx
│   │   ├── UserManagement.tsx
│   │   ├── AccessLogs.tsx
│   │   └── Settings.tsx
├── tailwind.config.js
├── postcss.config.js      # uses @tailwindcss/postcss
├── vite.config.ts
└── package.json
```

---

## Feature Design Addendum (Tenant Model: Project + City, Dashboard, Keys, Roles)

This section captures the newly introduced functional requirements and how they map to the data model, APIs, and runtime behavior.

### 1) Tenant Login (Project + City) and Post-login Navigation

- Login Inputs: Project, City, Username, Password
- Validation rules:
  - `project` must reference an active Project; `city` must be active and linked via `ProjectCity` to the selected project
  - `username/password` checked for a user belonging to the resolved `projectCityId`
  - User must be active (`isActive = true`)
- API Contract:
  - `POST /api/auth/login` body: `{ username: string, password: string, project: string, city: string }`
  - Success: `{ user, project, city, projectCityId, accessToken, refreshToken, expiresIn }`
  - On success, the client stores `accessToken` along with tenant scope and loads profile/permissions
- Project/City Directory (optional UX improvements):
  - `GET /api/project` → returns active projects
  - `GET /api/city?project=PerfectIT` → returns cities linked to that project
- Redirect after login:
  - Client redirects the user to pages scoped to the tenant (e.g., dashboard path filtered by `projectCityId` and user’s assignments).

Data model notes:

- Add `Project` and `ProjectCity` tables; `unique(Project.slug)` and `unique(ProjectCity.projectId, ProjectCity.cityId)`
- Add `projectCityId` foreign key to `User`, `UserPermission`, `Lock`, `AccessLog` (and `Address` if desired for strictness)
- During migration, support both `cityId` and `projectCityId`; prefer `projectCityId` when available

### 2) Dashboard by Location with Real-time Metrics

Once authenticated, the dashboard shows the user’s location(s) for their city, along with live indicators:

- Per location KPIs:
  - Active Users: users with recent activity or holding a currently valid key (configurable definition, e.g., last activity within 15 minutes OR any non-expired key)
  - Active Locks: locks flagged `isOnline = true` in the last health check/heartbeat
  - Active Keys: keys with `isActive = true` and `expiresAt > now()` for that location
- Data sources:
  - `AccessLog` stream and lock health updates (future WebSocket)
  - `RFIDKey` validity window (see section 3)
- Suggested API/flow:
  - `GET /api/dashboard?projectCityId=...` returns summary with lists and counts filtered by tenant (and narrowed by user role/assignments)
  - Real-time: WebSocket channel broadcasting lock online/offline events, key assignment/revocation, and access attempts to subscribed clients (scoped by tenant room or permission)

### 3) Key & Lock Management

- Associations:
  - Each Lock may require a Key (RFID key) for access
  - Each Key is assigned to a User
- Key expiry/auto-disconnect:
  - Keys automatically expire/disconnect after 6 hours
  - Implementation:
    - Store `expiresAt` on `RFIDKey` (already present) and/or on issued key sessions
    - Enforce validity in access checks (deny when `expiresAt <= now()` or `isActive = false`)
    - Background job (cron/scheduler) to mark expired keys inactive and notify clients via WebSocket
- Admin controls:
  - Revoke Key: set `isActive = false` (and optionally clear associations)
  - Reassign Key: update `userId` and reset `issuedAt`/`expiresAt`
- Suggested APIs (existing endpoints can be extended):
  - `POST /api/rfid/assign` → assign key to user with optional `expiresAt` (default now + 6h); require or infer tenant via `projectCityId`
  - `POST /api/rfid/revoke` → revoke key immediately; scoped by tenant
  - `GET /api/lock?...projectCityId=...` and `GET /api/permission?...projectCityId=...` for tenant filtering

### 4) System Roles & Access Scope

- Roles:
  - User: logs in and sees their assigned location(s) and locks; limited to their city
  - Supervisor/Admin: can monitor all users, locks, and keys by city and by location
- Enforcement:
  - Role checks are applied in middleware (e.g., `requireManagerOrAbove`, `requireAdmin`)
  - Tenant scope: filter queries by `projectCityId` (preferred) derived from JWT or request; fallback to `cityId` during migration
  - UI honors scope by showing only allowed locations/locks and management actions within the tenant

### Contracts, Edge Cases, and Success Criteria

Contracts:

- Login request: `{ username, password, project, city }` → 200 OK with tokens and user profile + tenant; 401 for invalid creds/tenant
- Project list: `GET /api/project` → `{ success, data: Project[] }`
- City list (by project): `GET /api/city?project=...` → `{ success, data: City[] }`
- Dashboard request: accepts `projectCityId` and returns filtered stats and lists

Edge cases:

- Project or City inactive → block login
- City not linked to Project (no `ProjectCity` row) → invalid tenant
- User not assigned to the given tenant → invalid credentials
- Key expired mid-session → subsequent access attempts denied; UI updates via WebSocket
- Lock offline → access attempts may return device error; dashboard reflects status

Success criteria:

- User can log in only when selecting their correct project + city and valid credentials
- Post-login, user sees only their tenant’s assigned location(s)
- Dashboard reflects “Active Users/Locks/Keys” with near real-time updates
- Admin can revoke/reassign keys; revoked/expired keys are enforced immediately

---

## Location Overview & Admin Connect (Most important feature)

This section consolidates the requirements to provide a single place per location (Address) to see active/inactive Users, Locks, and Keys, and to allow Admins to connect users with keys and locks from the same screen.

Purpose

- Per location (Address), provide:
  - Users: Active vs Inactive (for that location)
  - Locks: Online vs Offline, and Active vs Inactive
  - Keys: Active vs Inactive (and who holds them)
- Enable Admin actions in-context: assign/reassign keys, grant/revoke permissions between users and locks.

What is already implemented (today)

- Data model fully supports the feature:
  - City → Address → Lock hierarchy; `UserPermission` (user↔lock) links; `RFIDKey` (assigned to user with `expiresAt`/`isActive`).
- Backend capabilities:
  - Dashboard exposes per-location KPIs: active users (last 15 min), active keys, online/total locks, success rate, attempts.
  - Access Logs with filters (including `addressId`) and CSV export.
  - Locks API with online/active flags; can filter by `addressId`.
  - RFID key assign/revoke APIs; auto-expiration after ~6 hours; background job deactivates expired keys and emits events.
  - Audit logs for key issue/revoke/expire and permission changes.
  - City scoping enforced by role (Manager+ can cross-city with `cityId`; others scoped to their city).
- Frontend capabilities:
  - Dashboard shows location KPIs with sorting; links to Access Logs filtered by `addressId`.
  - Users/Locks/Keys management UIs exist; keys can be assigned/revoked; permissions can be granted/revoked.
  - Real-time updates via WebSocket for KPI refresh and key events.

What needs to be updated (to deliver the feature end-to-end)

1. Frontend: Location Details page (one screen per Address)

   - Route: `/locations/:addressId` (linked from Dashboard “Locations” table).
   - Sections/Tabs:
     - Users (Active | Inactive)
     - Locks (Online | Offline) and (Active | Inactive)
     - Keys (Active | Inactive)
   - Definitions (surface in UI tooltips/help):
     - Active user (at location): has a valid permission to any lock at this address AND either
       (a) holds an active RFID key (`isActive = true` and not expired), or
       (b) has a successful access within the last 15 minutes.
     - Inactive user: does not meet the above at this address.
     - Active key: `isActive = true` AND (`expiresAt` is null OR `expiresAt > now`).
     - Active lock: `isActive` flag; Online/Offline from `isOnline` heartbeat.
   - Admin actions (contextual):
     - On a User row: Assign/Reassign key; Grant/Revoke permission to one or more locks at this address.
     - On a Lock row: View/Manage permitted users; Grant/Revoke.
     - On a Key row: Assign to a user; Revoke.
   - Real-time: reflect key assignment/revocation/expiry and lock online/offline changes without manual refresh.

2. Backend: Location-scoped list endpoints (or reuse with additional filters)
   Option A — Dedicated endpoints (clear, self-documenting API):

   - `GET /api/location/:addressId/users`
     - Query: `status=active|inactive` (optional), `page`, `limit`
     - Returns users with computed `activeAtLocation` flag based on the definition above.
   - `GET /api/location/:addressId/locks`
     - Query: `status=online|offline|active|inactive` (multi-select), `page`, `limit`
     - Returns locks for the address with `isActive`, `isOnline` flags.
   - `GET /api/location/:addressId/keys`
     - Query: `status=active|inactive`, `page`, `limit`
     - Returns keys for users associated with this address (via permissions), with `isActive` and holder.
   - Bulk actions for admin productivity:
     - `POST /api/location/:addressId/permissions` — Body: `{ userIds: string[], lockIds: string[], canAccess?: boolean, validFrom?: Date, validTo?: Date }`
     - `POST /api/location/:addressId/keys/assign` — Body: `{ assignments: Array<{ cardId: string, userId: string, expiresAt?: Date, name?: string }> }`

   Option B — Reuse existing endpoints with small additions:

   - Users: add filter `hasPermissionAtAddressId=<addressId>` to users listing.
   - Locks: reuse `addressId` filter; add multi-status filters if missing.
   - Keys: add `userIds[]` filter and `addressId` inference (keys whose owner has permission to any lock at `addressId`).
   - Keep existing POSTs for permissions and RFID assign/revoke; add bulk variants.

Notes:

- All endpoints must continue to respect tenant scoping via `getEffectiveScope(req)` → `{ projectId, cityId, projectCityId }`. Prefer filtering by `projectCityId`.
- Add DB indexes as needed (e.g., `UserPermission.lockId`, `Lock.addressId`, `RFIDKey.userId`) and ensure these compound with `projectCityId` where beneficial.

3. UI/UX wiring

   - Navigation: link Dashboard → Location Details; optional location selector.
   - Filters: chips/toggles for Active/Inactive and Online/Offline; server-side pagination.
   - Modals: assign/revoke/grant (support bulk); optimistic updates with toasts.

4. Real-time updates

   - Continue using city rooms; emit lightweight events when permissions or key assignments change at an address.
   - Client for the current `addressId` listens and updates tables live.

5. Acceptance criteria (done definition)
   - For a given `addressId`, Admin can see three lists with counts:
     - Users (Active/Inactive) matching definitions above.
     - Locks (Online/Offline + Active/Inactive).
     - Keys (Active/Inactive), including who holds each key.
   - From this page, Admin can connect users⇄locks (permissions) and users⇄keys (assign), including bulk operations.
   - Real-time changes (key revoke/assign/expire; lock online/offline; permission changes) update the lists without refresh.
   - All actions and resulting state transitions generate appropriate audit entries.

Risks & considerations

- The “active user” definition can be ambiguous; the UI should expose both signals (recent success vs active key+permission) to avoid confusion.
- Bulk operations should be rate-limited and audited; provide preview/confirmation.
- Performance: prefer server-side filtering/pagination; consider caching for heavy dashboard/location queries.

Suggested next steps

- Backend: implement tenant-aware list endpoints (or extend existing ones) and bulk endpoints; ensure all queries include `projectCityId` filters.
- Frontend: feature-flag the new login (Project + City); create `TenantContext` (replacing `CityContext`), propagate to Users/Locks/Permissions/Dashboard, and update API calls to include tenant.
- Tests: add integration tests for tenant isolation (same usernames across tenants), dashboard scoping by tenant, and auth flow with `{ project, city }`.
- Docs: update README and API docs; link to `LOGIN_PROJECT_CITY_MIGRATION.txt` and `PROJECT_CHECKLIST.md`.

---

## Tenant Model Deep Dive (New)

This section consolidates design details for the Project + City tenant model.

### Database schema

- `Project(id, name, slug, isActive, createdAt, updatedAt)`
- `ProjectCity(id, projectId, cityId, isActive, createdAt, updatedAt)`, unique(projectId, cityId)
- Add `projectCityId` to: `User`, `UserPermission`, `Lock`, `AccessLog` (and `Address` if required)
- Indexing:
  - unique(Project.slug)
  - indexes on `projectCityId` for all scoped tables
  - compound indexes where queries filter by both `projectCityId` and another foreign key (e.g., `(projectCityId, addressId)` on `Lock`)

### Auth flow and scoping

1. Client submits `{ username, password, project, city }`.
2. API resolves tenant → `projectCityId` via `Project.slug|name` and `City.name` with `ProjectCity` join.
3. Lookup user by `(username, projectCityId)`; verify password and `isActive`.
4. Issue JWT with claims `{ sub, role, projectId, cityId, projectCityId }`.
5. Middleware extracts scope via `getEffectiveScope(req)` and applies `projectCityId` to queries.
6. Socket.io joins `tenant:<projectCityId>` room for events; server emits to this room for tenant events.

### Frontend state

- Introduce `TenantContext` storing `{ project, city, projectCityId }` along with tokens.
- The login page captures Project (input or autocomplete) + City (select filtered by project).
- All pages and services append tenant scope to API calls.

### Migration strategy

- Dual-mode: accept `{ cityId }` logins during migration, prefer `{ project, city }`.
- Backfill: create a default `Project` for existing data; map each `cityId` to a `ProjectCity`; update scoped tables with `projectCityId`.
- Feature flag: `VITE_TENANT_MODE=project_city`; roll out backend first, then frontend under flag; migrate data; switch flag on fully.

### Security and auditing

- Tenant claims in JWT; verify on each request.
- Audit logs include `projectCityId` for changes (key assign/revoke, permission changes, user updates).
- Prevent cross-tenant leakage in endpoints and WebSocket events.

---

## SMS-based Two-Factor Authentication (2FA) — Design

Goal: Strengthen login by adding a one-time SMS code after password verification. This introduces a step-up authentication flow with minimal impact on existing APIs and UI while keeping testability and ops in mind.

### User flows

1. Password step → 2FA challenge

- Client posts login as usual (currently `{ username, password, cityId }` or `{ username, password, project, city }` when tenant mode is enabled).
- If the user has 2FA enabled (or the system enforces it globally), the server returns `202 Accepted` with `{ challengeId, method: "sms", maskedPhone, expiresIn }` and DOES NOT issue access/refresh tokens yet.
- Server sends a 6-digit numeric code via SMS to the user’s verified phone number.

2. Submit code → tokens

- Client posts `{ challengeId, code }` to verify endpoint within `expiresIn`.
- On success, server returns the normal login payload: `{ user, tenant, accessToken, refreshToken, expiresIn }`.
- On failure, return `400/401` with remaining attempts; lockout after N failed attempts or after expiry.

3. Recovery and fallback

- If SMS is delayed, client can call `resend` endpoint (rate-limited) to re-send the code and extend expiry minimally.
- If user has no phone bound, either block login with a clear error or fall back to password-only when feature flag is off.

### API surface

- `POST /api/auth/login` (unchanged request body)

  - Responses:
    - 200 OK → password-only success (when 2FA disabled) with tokens.
    - 202 Accepted → 2FA required: `{ challengeId, method: "sms", maskedPhone, expiresIn }`.
    - 401/400 → invalid credentials or invalid tenant.

- `POST /api/auth/2fa/verify`

  - Body: `{ challengeId: string, code: string }`
  - Success 200: tokens payload `{ user, tenant, accessToken, refreshToken, expiresIn }`.
  - Errors: `400` invalid/expired, `429` rate limited, `423` locked.

- `POST /api/auth/2fa/resend`
  - Body: `{ challengeId: string }`
  - Success 204 (no body).
  - Errors: `404` no challenge, `429` too many requests.

### Data model additions (Prisma)

- Extend `User`:

  - `phone: string | null` (E.164 format, verified)
  - `twoFactorEnabled: boolean` (default `false`)
  - `twoFactorVerifiedAt: DateTime | null` (optional record of phone verification)

- New table `TwoFactorChallenge` (ephemeral):
  - `id: string` (uuid)
  - `userId: string` (FK)
  - `codeHash: string` (bcrypt hash of 6-digit code)
  - `expiresAt: DateTime`
  - `attempts: Int` (default 0)
  - `maxAttempts: Int` (default 5, configurable)
  - `method: "sms" | "totp"` (future-proof)
  - `createdAt/updatedAt`
  - Indexes: `idx_twofactor_user_expires (userId, expiresAt)`

Note: If avoiding a new table, you can store challenges in Redis with TTL; keep the Prisma model for auditability optional.

### Backend logic changes

- Login controller:

  - After verifying password and tenant scope, check 2FA policy and user flags.
  - If 2FA required → create challenge: generate 6-digit code, store `codeHash`, set `expiresAt = now + 5m`, send SMS, return 202 with challenge info.
  - If not required → return tokens as today.

- Verify endpoint:

  - Lookup challenge by id; ensure not expired or locked; compare bcrypt(code) to `codeHash`.
  - On success → issue tokens and delete challenge.
  - On failure → increment attempts; if attempts >= max, lock and return `423`.

- Resend endpoint:
  - Rate-limit per challenge and per phone; generate a new code (or reuse by policy), update `expiresAt`, send SMS again.

### SMS provider integration

- Integrate Twilio (already in dependencies) or any SMS provider behind an abstraction `SmsProvider`.
- Implement `sendSms(to: string, message: string): Promise<void>` with provider-specific code gated by env flags.
- Build a `NotificationService` that can send login codes and mask phone numbers for UI.

### Configuration & env vars

- `TWOFA_ENABLED=true|false`
- `TWOFA_METHODS=sms` (future: `sms,totp`)
- `TWOFA_CODE_TTL_SEC=300` (default 300s)
- `TWOFA_MAX_ATTEMPTS=5`
- `TWOFA_RESEND_COOLDOWN_SEC=30`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM_NUMBER`)

### Security considerations

- Code hashing: never store raw codes; hash with bcrypt; compare in constant time.
- Brute-force protection: attempts cap, cooldowns, IP/device fingerprints if desired, and `429` on abuse.
- PII minimization: store phone in E.164 and mask in responses (`+31******789`).
- Audit: log challenge created, verified, failed, locked with userId and tenant scope.
- Replay prevention: single-use challenge; delete on verify; expire on timeout.
- Time skew: TTL should be server-enforced; client timer is advisory only.
- Multi-session: invalidate prior challenges on new login start.

### Frontend changes

- Login page becomes two-step when 2FA is required:
  - Step 1: Username/Password (+ Project/City in tenant mode)
  - If 202 Accepted: render code entry with masked phone and countdown; disable submit until input is 6 digits.
  - Button to Resend (disabled until cooldown ends); show remaining attempts and expiry.
  - On verification success: proceed as normal (store tokens and tenant, redirect).

### Edge cases

- No phone on account but 2FA required → return 409 Conflict with message to contact admin.
- SMS delivery delays → allow 1-2 resends; show UX hints to wait up to 30s.
- Phone change flow (later): add verification before enabling 2FA.

### Acceptance criteria

- When `TWOFA_ENABLED=true`, successful login requires a valid SMS code for users with `twoFactorEnabled=true` (or globally enforced).
- API returns 202 with challenge details; verify returns tokens; incorrect/expired codes are rejected; lockout after max attempts.
- Events are audited; rate limits prevent abuse; no raw codes are persisted.

---

## Implementation Alignment (from latest comparison)

This section notes current deviations and immediate decisions to keep architecture and implementation in sync.

- Tenant Model (Project + City): Planned in this doc; implementation is city-only today. Migration plan remains as documented (dual-mode, feature flag, backfill). Action: proceed with backend dual-mode first, then frontend `TenantContext`.
- Notification Service (Twilio): Dependencies present but not wired. Action: introduce `NotificationService` with `SmsProvider` adapter and env-based enablement; use for SMS 2FA and future alerts.
- Route naming: Frontend uses `/location/:addressId` while docs use `/locations/:addressId`. Action: accept current route and document it; optionally alias `/locations/:addressId` to avoid breaking links.
- Post-login redirect: Missing. Action: add redirect to user-assigned location(s) or dashboard with tenant filters.
- Frontend layout: Global layout (sidebar/header/footer) is simplified. Action: keep simplified layout for now; revisit after tenant migration.
- Caching: No dashboard caching in place. Action: optional Redis cache layer for heavy dashboard endpoints.
- Testing: Backend tests strong; frontend tests minimal. Action: add tests for Location Details, post-login redirect, and 2FA flows.
