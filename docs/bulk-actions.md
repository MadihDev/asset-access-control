# Bulk Actions Guide (Admins)

This guide explains how to use the Location Details bulk actions to grant/revoke permissions and assign RFID keys in batches.

Location: `/locations/:addressId?cityId=...`

Two modals are available from the page actions:

- Bulk permissions (grant/revoke)
- Bulk key assignment

## Bulk Permissions: Grants & Revokes

Open the “Bulk permissions” modal. You have two ways to prepare your changes:

- Builder: search + pick a user and a lock, optionally set validity window; click “Add to grants” or “Add to revokes”.
- CSV: paste lines yourself, one per change.

CSV formats

- Grants: `userId,lockId[,validFromISO][,validToISO]`
- Revokes: `userId,lockId`

Examples

```
# Grants (with validity)
user_123,lock_abc,2025-01-01T00:00:00Z,2025-12-31T23:59:59Z

# Revokes
user_456,lock_def
```

Validation

- Dates must be valid ISO strings (e.g., `2025-01-01T00:00:00Z`).
- If both dates are provided, `validFrom` must be <= `validTo`.
- Empty/whitespace lines are ignored.
- Inline errors are shown per line; submission is disabled until fixed.

Downloads

- Use “Download CSV template” buttons for a ready-to-edit example.

## Bulk Key Assignment

Open the “Bulk key assign” modal. Use the builder or paste CSV.

CSV format

- `cardId,userId[,name][,expiresAtISO][,isActive]`

Examples

```
CARD-001,user_123,Main Card,2025-12-31T23:59:59Z,true
CARD-002,user_456,,,
CARD-003,user_789,Spare,2026-01-01T00:00:00Z,no
```

Validation

- `isActive`: accepts `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive). Omit to leave unchanged/default.
- `expiresAt`: must be a valid ISO datetime if provided.
- Empty lines are ignored.

Downloads

- Use the “Download CSV template” button for a starting point.

## Tips & Troubleshooting

- If submission is disabled, check the inline error list beneath each textarea.
- Ensure you’ve added at least one valid line (grants/revokes/items) before submitting.
- After submitting, a toast will summarize the results (e.g., granted/updated/revoked, created/reassigned/updated) and the lists refresh.
- The builder’s date/time inputs are converted to ISO automatically.

## Backend Requirements

- Location endpoints for users/locks/keys should support pagination and status filters.
- Bulk endpoints must validate inputs and apply rate limiting.
- Recommended indexes: `UserPermission.lockId`, `Lock.addressId`, `RFIDKey.userId`.
