# Issues Seed

Use this document to quickly create issues on GitHub by copy/pasting the titles and descriptions.

## Quick Wins

1. WebSocket expiry notifications

- When the key expiry job deactivates keys, emit WebSocket events to subscribed clients (scoped by city).
- Acceptance:
  - [ ] Server broadcasts `key.expired` with keyId, userId, cityId, expiresAt
  - [ ] Client listens and updates dashboard KPIs in near real-time

2. Validate RFID assign/revoke requests

- Add express-validator rules for `/api/rfid/assign` and `/api/rfid/revoke` and wire them in routes.
- Acceptance:
  - [ ] 400 on invalid `cardId`/`userId`/`expiresAt` or missing `id|cardId` on revoke

3. Dashboard per-location KPIs

- Extend `/api/dashboard` to return per-location breakdowns and update UI to render cards per location.
- Acceptance:
  - [ ] API returns `locations: [{ id, name, activeUsers, onlineLocks, activeKeys }]`

4. Backend integration tests (city-aware auth + RFID)

- Add tests for login with `cityId`, and `/api/rfid/assign` + `/api/rfid/revoke` happy and error paths.
- Acceptance:
  - [ ] Jest + Supertest covering success and validation failures

## Scalability & Performance

5. Add indexes for hot columns

- Create migrations to add indexes on `userId`, `keyId`, `cityId` where frequently filtered.

6. Cache dashboard KPIs

- Add in-memory or Redis-based caching for dashboard summaries with short TTL.

7. Log storage strategy

- Document and plan log retention, partitions, or a separate analytics DB for long-term storage.

8. Optimize key expiry job

- Batch updates and use indexed queries to avoid scanning large tables; add metrics.

9. Future multi-region support

- Draft a plan for multi-city/multi-country toggles and data isolation.
