# API Reference (Minimal)

Base URL: `/api`

Auth

- `POST /auth/login` – body: `{ email, password }` → `{ token }`
- `GET /auth/profile` – header: `Authorization: Bearer <token>` → user profile

Health

- `GET /health` → `{ message: string }`

Users (auth required; many routes require admin/manager)

- `GET /user` – list users, supports pagination query `?page=&pageSize=`
- `GET /user/export` – CSV export
- `GET /user/with-permissions` – users with permission counts
- `POST /user` – create user (admin only)
- `GET /user/:id` – get by id
- `PUT /user/:id` – update (admin only)
- `DELETE /user/:id` – delete (admin only)
- `GET /user/:id/stats` – user stats

Locks & Access Logs

- `GET /lock/access-logs` – filters: `userId, lockId, result, type, from, to, page, pageSize`
- `GET /lock/access-logs/export` – CSV export
- `GET /lock/access-stats` – aggregate statistics

Permissions & RFID

- `GET /permission` – list user permissions
- `POST /permission/assign` – assign lock permission to user
- `POST /permission/revoke` – revoke permission
- `POST /rfid/assign` – assign RFID key
- `POST /rfid/revoke` – revoke RFID key

Dashboard

- `GET /dashboard` – overview stats and recent logs

Audit Logs

- `GET /audit` – list with filters and pagination

Notes

- All protected routes require `Authorization: Bearer <token>`
- Role checks enforced (e.g., admin/manager for sensitive operations)
- Validation errors return `{ success: false, error: string }`

Location Overview & Admin Connect (auth required)

- `GET /location/:addressId/users` – list users with effective access at an address; filters: `status=active|inactive`, `page`, `limit`, optional `cityId` when SUPER_ADMIN
- `GET /location/:addressId/locks` – list locks at an address; filters: `status=active|inactive|online|offline`, `page`, `limit`
- `GET /location/:addressId/keys` – list keys for users with access at an address; filters: `status=active|expired`, `page`, `limit`
- `POST /location/:addressId/permissions` – Manager+ only; bulk grant/revoke permissions. Body: `{ grants: [{ userId, lockId, validFrom?, validTo? }], revokes: [{ userId, lockId }] }`
  - Limits: `MAX_LOCATION_BULK_ITEMS` (default 500). Returns 413 if exceeded.
  - Validation: date order, required fields, address scoping and city scoping enforced.
- `POST /location/:addressId/keys/assign` – Manager+ only; bulk create/update/reassign keys. Body: `{ items: [{ cardId, userId, name?, expiresAt?, isActive? }] }`
  - Limits: `MAX_LOCATION_BULK_ITEMS` (default 500). Returns 413 if exceeded.
  - Validation: required fields, valid dates, city scoping enforced.

Realtime events

- On successful bulk permissions: event `location:permissions:changed` is emitted to room `city:<cityId>` with payload `{ addressId, counts: { granted, updated, revoked }, ts }`.
- On successful bulk key assignment: event `location:keys:changed` is emitted to room `city:<cityId>` with payload `{ addressId, counts: { created, reassigned, updated }, ts }`.

Simulation (dev/test only)

- Toggle: set `ENABLE_SIM_ROUTES=true` in backend `.env` to expose `/api/sim/*` (admin only)
- `POST /sim/access` – simulate an access attempt
  - body: `{ lockId, userId?, rfidKeyId?, result, accessType?, timestamp? }`
  - emits `access:attempt` to `city:<cityId>`
- `POST /sim/lock-status` – mark a lock online/offline
  - body: `{ lockId, isOnline }`
  - emits `lock:status` to `city:<cityId>`
