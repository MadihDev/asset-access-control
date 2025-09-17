# RFID Access Control - Backend Installation

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation Steps

1. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**

   ```bash
   # Install Prisma CLI globally (if not already installed)
   npm install -g prisma

   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma migrate dev --name init

   # Seed database (optional)
   npx prisma db seed
   ```

3. **Environment Configuration**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your database credentials
   # DATABASE_URL="postgresql://username:password@localhost:5433/rfid_access_control"
   # JWT_SECRET="your-super-secret-jwt-key"
   # PORT=5000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run db:reset` - Reset database and reseed
- `npm run db:studio` - Open Prisma Studio GUI

## API Documentation

All protected endpoints require an `Authorization: Bearer <accessToken>` header.

### Health Check

- **GET** `/api/health` - System health status

### Authentication

- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/logout` - User logout
- **POST** `/api/auth/refresh` - Refresh JWT token

### Users

- **GET** `/api/users` - List all users (Admin only)
- **POST** `/api/users` - Create new user (Admin only)
- **GET** `/api/users/:id` - Get user by ID
- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user (Admin only)

### Locks

- **GET** `/api/locks` - List all locks
- **POST** `/api/locks` - Create new lock (Admin only)
- **GET** `/api/locks/:id` - Get lock by ID
- **PUT** `/api/locks/:id` - Update lock
- **DELETE** `/api/locks/:id` - Delete lock (Admin only)
- **POST** `/api/locks/access-attempt` - Log access attempt

### Access Logs

- Note: Access Logs endpoints are under the `lock` route prefix.
- **GET** `/api/lock/access-logs` - List access logs with filters and pagination
  - Query params (all optional unless noted):
    - `page` (number, default 1)
    - `limit` (number, default 25, max 1000)
    - `sortBy` (string)
    - `sortOrder` (`asc` | `desc`)
    - `userId` (ID) - filter by user
    - `lockId` (ID) - filter by lock
    - `addressId` (ID) - filter by lock address/location
    - `result` (`GRANTED` | other `AccessResult` values)
    - `accessType` (`RFID_CARD` | `MANUAL` | `EMERGENCY` | `MAINTENANCE`)
    - `startDate`, `endDate` (ISO 8601) - timestamp range
    - `cityId` (ID) - Only effective for Manager+; users below Manager are auto-scoped to their own city
  - Response:
    - `data`: Array of access logs including `user`, `lock` (with `address` and `city`), `accessType`, `result`, `timestamp`, and optional `rfidKey`.
    - `pagination`: `{ page, limit, total, totalPages, hasNext, hasPrev }`
  - Example:
    ```bash
    curl -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/lock/access-logs?addressId=<addressId>&page=1&limit=50"
    ```
- **GET** `/api/lock/access-logs/export` - Export filtered logs as CSV (Manager+)
  - Accepts the same query params as `/api/lock/access-logs`. Returns a CSV file.

### Audit Logs

- **GET** `/api/audit-logs` - List audit logs (Admin only)

## Location Overview Endpoints

These endpoints provide location-scoped (per Address) lists and bulk admin operations.

- **GET** `/api/location/:addressId/users` — Users at location with `status=active|inactive` and pagination
  - Query: `status=active|inactive` (optional), `page`, `limit`, `cityId` (SUPER_ADMIN only)
  - Response: `data: [{ id, firstName, lastName, email, role, activeAtLocation }]`, plus pagination
- **GET** `/api/location/:addressId/locks` — Locks at location with `status=online|offline|active|inactive` and pagination
  - Query: `status=online|offline|active|inactive` (optional), `page`, `limit`
  - Response: `data: [{ id, name, lockType, isActive, isOnline, lastSeen }]`, plus pagination
- **GET** `/api/location/:addressId/keys` — Keys held by users associated with the location (status filters, pagination)
  - Query: `status=active|expired` (optional), `page`, `limit`
  - Response: `data: [{ id, cardId, name, isActive, issuedAt, expiresAt, user: { id, firstName, lastName } }]`, plus pagination
- **POST** `/api/location/:addressId/permissions` — Bulk grant/revoke permissions between users and locks (Manager+)
  - Body:
    ```json
    {
      "grants": [
        {
          "userId": "...",
          "lockId": "...",
          "validFrom": "2025-09-17T00:00:00.000Z",
          "validTo": "2025-12-31T23:59:59.999Z"
        }
      ],
      "revokes": [{ "userId": "...", "lockId": "..." }]
    }
    ```
  - Response: `{ success: true, data: { granted: number, updated: number, revoked: number } }`
  - Validation & rules:
    - Address must exist and be within effective city scope.
    - Locks must belong to the address; otherwise 400.
    - When city scope applies, users must belong to that city; otherwise 403.
    - Grants are upserted by `(userId, lockId)`; revokes delete the permission if it exists.
- **POST** `/api/location/:addressId/keys/assign` — Bulk key assignments to users (Coming Soon)
- **POST** `/api/location/:addressId/keys/assign` — Bulk key assignments to users (Manager+)
  - Body:
    ```json
    {
      "items": [
        {
          "cardId": "CARD-001",
          "userId": "...",
          "name": "Front Door",
          "expiresAt": "2025-12-31T23:59:59.999Z",
          "isActive": true
        }
      ]
    }
    ```
  - Response: `{ success: true, data: { created: number, reassigned: number, updated: number } }`
  - Validation & rules:
    - Address must exist and be within effective city scope.
    - When city scope applies, users must belong to that city; otherwise 403.
    - If a key with `cardId` exists, it will be updated and counted as `reassigned` if `userId` changes, otherwise `updated`.
    - If it does not exist, a new key is created and counted as `created`.

Notes:

- All endpoints enforce city scoping. Manager+ can cross-scope by passing `cityId` when applicable; otherwise the user's own city is applied.
- Bulk operations require Manager+ role.
- See `ARCHITECTURE.md` → "Location Overview & Admin Connect" for details and acceptance criteria.

### Dashboard

- **GET** `/api/dashboard` - Overview metrics and per-location KPIs
  - Query params:
    - `cityId` (ID) - Optional and only effective for Manager+; non-manager users are scoped to their own city.
  - Response shape:
    ```json
    {
       "success": true,
       "data": {
          "totalUsers": number,
          "activeUsers": number,
          "totalLocks": number,
          "onlineLocks": number,
          "activeKeys": number,
          "totalAccessAttempts": number,
          "successfulAccess": number,
          "recentAccessLogs": [
             {
                "timestamp": string,
                "result": string,
                "accessType": string,
                "user": { "firstName": string, "lastName": string } | null,
                "lock": { "name": string }
             }
          ],
          "locations": [
             {
                "addressId": string,
                "name": string,              // e.g. "Main St 12, 12345"
                "cityId": string,
                "totalLocks": number,
                "activeLocks": number,       // online locks at this address
                "activeUsers": number,       // users with successful access in last 15 minutes
                "activeKeys": number,        // users with an active key and a valid permission for any lock at this address
                "totalAttempts": number,     // total access attempts at this address
                "successfulAttempts": number,
                "successRate": number        // 0..100 (%), computed as successful/total
             }
          ],
          "scope": { "cityId": string | null }
       }
    }
    ```
  - Notes:
    - Per-location KPIs are grouped by `Address` (considered a location) and include live success metrics.
    - `activeUsers` are computed from successful access events within the last 15 minutes.
    - `activeKeys` are users that currently have at least one active RFID key and a valid permission to any lock at the address.
    - `scope.cityId` indicates the effective city scoping applied to this response.

### City Scoping Rules

- Most endpoints are city-scoped. The effective city is resolved as follows:
  1.  If the authenticated user is `SUPER_ADMIN` (Manager+ in general), an explicit `cityId` query param is honored.
  2.  Otherwise, the user's own `cityId` is applied automatically.
- Implementation: see `src/lib/scope.ts` `getEffectiveCityId()`.

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Login (after creating a user)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Automated Testing

```bash
npm test
```
