# Tenant Migration Runbook (Project + City)

Date: 2025-09-17
Owner: Engineering
Branch: `feat/tenant-migration`

## Overview

This runbook guides the rollout of the new tenant model introducing `Project` and `ProjectCity`, while keeping the current city-only mode running. We will roll out in stages with feature flags and clear rollback points.

## Flags

- `TENANT_MODE`: `city-only` | `project-city`
- `TENANT_MIGRATION_READ_MODE`: `old` | `dual` | `new`
- `TENANT_MIGRATION_WRITE_MODE`: `old` | `dual` | `new`

## Stages

1. Prep (current)

- Ensure tests are green and rate limits/validation are in place.
- Run dry-run report: `npm run tenant:dry-run` (backend)
- Backfill missing `access_logs.cityId` if needed: `npm run db:backfill:accesslog-city`

2. Schema Introduce (no behavior change)

- Add `Project`/`ProjectCity` tables.
- Add nullable `projectCityId` FKs to core tables (User, Address, Lock, UserPermission, AccessLog).
- Add supporting indexes.
- Keep app behavior unchanged; flags remain `TENANT_MODE=city-only` and RW modes `old`.

3. Dual Read (safe)

- Set `TENANT_MIGRATION_READ_MODE=dual`.
- Code reads by `projectCityId` when present else falls back to `cityId`.
- Continue writing only to `cityId`.

4. Dual Write (advance)

- Set `TENANT_MIGRATION_WRITE_MODE=dual`.
- Begin writing both `cityId` and `projectCityId` (when resolvable).
- Run backfill to populate `projectCityId` rows from existing `cityId` and seeded mappings.

5. New Mode (cutover)

- Set `TENANT_MODE=project-city`, `TENANT_MIGRATION_READ_MODE=new`, `TENANT_MIGRATION_WRITE_MODE=new`.
- Remove reliance on `cityId` paths gradually.

## Backups & Rollback

- Take a DB snapshot before stages 2, 4, and 5.
- Rollback: revert flags to previous stage; restore DB snapshot if schema/data issues occur.

## Smoke Tests (per stage)

- Auth: login, profile; 401s on invalid.
- Users: list, CRUD; permissions list.
- Locks/Permissions: list, assign/revoke; bulk endpoints behave.
- RFID: assign/revoke.
- Dashboard: KPIs load; access logs filter.

## Observability & Audit

- Audit logs for permission/key changes.
- Monitor DB for slow queries; validate new indexes.

## Run Commands (PowerShell)

```powershell
# Dry-run report
cd backend
npm run tenant:dry-run

# Backfill access log cityId, if needed
npm run db:backfill:accesslog-city
```

## Notes

- CI to add a matrix for `TENANT_MODE` in later PR.
- Frontend `VITE_TENANT_MODE` stays `city-only` until stage 5.
