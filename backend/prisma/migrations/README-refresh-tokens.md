# 2025-09-16: Add refresh_tokens for JWT refresh rotation

Purpose:

- Persist refresh tokens with `jti` for rotation and revocation.
- Enforce single-use refresh tokens by revoking on rotation.

Schema:

- Table: `refresh_tokens` with indexes on `(userId,isRevoked)` and `expiresAt`.
- FKs: `userId -> users(id)`, `replacedById -> refresh_tokens(id)`.

Operations:

- Apply migration: `npm run db:migrate`
- Consider a daily cleanup task to delete expired rows.
