# App Workflows and Status (Sept 2025)

This document captures end-to-end workflows available today and what remains to reach the stated scope. It complements `PROJECT_CHECKLIST.md` and `README.md`.

## User Stories and Flows (Implemented)

1. City‑scoped Login

- Go to the login page.
- Select a city from the Netherlands-only directory (`GET /api/city`).
- Enter username + password, submit.
- On success, the app stores a JWT and user profile with `cityId`; requests are city‑filtered.

2. Dashboard (City Scope)

- Loads KPIs from `GET /api/dashboard?cityId=...`.
- Shows totals: users, locks, keys, access attempts, success rate, recent logs.
- Per‑location KPIs with sorting and links to logs.
- Real-time updates for key expiry events.

3. Users Management

- List/search/sort/paginate users.
- View/edit user details; export users as CSV.

4. Access Logs

- View access logs with filters (date/user/lock/result/type/address).
- Export logs to CSV.
- Basic stats via dedicated endpoints.

5. Permissions & RFID Keys (Individual)

- Assign a key to a user with optional expiry; revoke keys.
- Grant/revoke lock permissions for a user.
- Audit logs record key/permission changes.

6. Location Details (Per Address)

- Navigate from dashboard locations to `/locations/:addressId?cityId=...`.
- Tabs: Users, Locks, Keys with status filters and server pagination.
- Bulk actions via modals:
  - Permissions: grants & revokes. CSV templates, inline validation, builder pickers for users/locks, optional validity window.
  - Key assignment: CSV template, inline validation, builder pickers; `isActive` accepts `true/false/1/0/yes/no`.
- Success toasts summarize results; lists refresh after actions.

## Developer Flows

- Backend: TypeScript + Prisma; migrations, seed data, and Jest tests.
- Frontend: React + Vite + Tailwind v4; Vitest tests; route guards; Axios with JWT.
- Docker: Compose file runs DB (Postgres 17), API, and frontend.
- CI: Lint, typecheck, build; ready to include frontend tests.

## What’s Partially Done or Pending

Priority items next:

1. Frontend tests for bulk parsing (Done)

- Vitest unit tests for CSV: date validity, boolean variants, empty/malformed rows, payload shaping.
- Place under `rfid-frontend/src/**/__tests__` and wire into CI.

2. CI: run frontend tests (Done)

- Update GitHub Actions to run `npm ci && npm run test` within `rfid-frontend`.

3. Real-time UI enhancements

- Broaden WS usage to live-update Location Details: users active, locks online/offline, keys state.

4. Docs for Location endpoints and bulk actions

- Expand `docs/api.md` with location-scoped endpoints and bulk routes.
- Bulk Actions guide added at `docs/bulk-actions.md`; API references still pending.

5. Backend: Location endpoints completeness

- Ensure `/api/location/:addressId/{users,locks,keys}` support status filters and pagination as used by the UI.
- Bulk endpoints for permissions and key assignments; rate limiting and validation.
- Index review: `UserPermission.lockId`, `Lock.addressId`, `RFIDKey.userId`.

6. Security hardening

- RBAC verification on all new routes.
- Input validation for new create/update/bulk operations.
- Rate limiting for brute-force and bulk endpoints.

7. Post-login redirect

- After login, route users to their assigned location(s) in the chosen city.

8. Analytics & Health (optional later)

- System health panel (lock status, last seen); access charts.
- Consider caching for dashboard endpoints; plan for log growth.

## Current Status Snapshot

- Backend: core auth/users/logs/permissions/audit implemented; sockets and expiry job in place. Location endpoints and bulk endpoints may need finalization and validation.
- Frontend: Login, Dashboard, Users, Logs, Audit, Permissions UIs done. Location Details UI and bulk modals implemented; parsing utils unit-tested.
- CI: active for lint/build/tests (backend and frontend).
- Docs: API docs present; need expansion for location/bulk flows.

## Acceptance Criteria to Call It "Done"

- Location Details fully wired: lists, filters, pagination, bulk endpoints.
- Unit tests green for parsing and integration paths; CI runs frontend tests.
- Real-time updates reflect key/permission/lock changes without manual refresh.
- Docs updated with workflows, API references, and troubleshooting.
- Dockerized stack runs end-to-end with one command.
