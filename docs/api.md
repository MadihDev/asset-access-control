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
