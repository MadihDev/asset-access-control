# RFID Frontend (React + TypeScript + Vite)

This app is the UI for the RFID Access Control system. It talks to the backend API and renders dashboard KPIs, users, access logs, permissions, and more.

## Getting started

1. Set `VITE_API_URL` in `rfid-frontend/.env` to your backend URL (e.g., `http://localhost:5000`).
2. Install deps and start dev server:

```powershell
cd rfid-frontend
npm install
npm run dev
```

## Dashboard specifics

- City scoping: the dashboard respects the selected city (from the City selector). Manager+ can switch cities.
- Per-location KPIs: grouped by Address. Each row shows:
  - `Active Users` (granted access in last 15 minutes)
  - `Active Keys` (users with at least one active key and valid permission at the address)
  - `Locks (online/total)`
  - `Success Rate` with attempts `(successful/total)`
- Sorting: use the sort dropdown to sort by `Name`, `Active Users`, or `Success Rate`, and the Asc/Desc button to toggle order.
- Quick links:
  - Clicking a location name opens the Location Details screen: `/location/:addressId` and preserves `?cityId=` when a city is selected.
  - The `View logs` button opens Access Logs pre-filtered by that `addressId`.

## Access Logs page

## Location Details page

- Route: `/location/:addressId` optionally with `?cityId=<CITY_ID>`
- Tabs: Users, Locks, Keys; each supports status filtering and pagination.
- Bulk actions:

  - Permissions: grant/revoke in bulk via simple CSV lines (`userId,lockId[,validFromISO][,validToISO]` and `userId,lockId`).
  - Key assignment: assign/update keys in bulk (`cardId,userId[,name][,expiresAtISO][,isActive]`).
  - Actions apply to the current location, and respect city scoping when provided.

- The page accepts the `addressId` query param to pre-filter by location. For example:

```text
/access-logs?addressId=<ADDRESS_ID>
```

- You can also filter by user, lock, result, type, and date range. Filters map to backend `GET /api/lock/access-logs` query params.

## Token refresh & auth

- The Axios client auto-refreshes the access token on the first 401, retries once, then logs out on failure.
- Tokens are stored in `AuthContext` and cleared on logout.

## Notes for contributors

- Keep hooks at top level; avoid conditional hooks in components.
- Use the shared `api` client for requests to inherit auth and refresh handling.
- Tailwind v4 classes are used in components.
