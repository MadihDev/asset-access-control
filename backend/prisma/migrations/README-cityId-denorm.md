This migration introduces a denormalized `cityId` column on `access_logs` for faster filtering and adds supporting indexes:

- `@@index([cityId, timestamp])`
- `@@index([result])`
- `@@index([userId])`
- `@@index([lockId])`

After running `prisma migrate dev`, run the backfill script:

npm run db:backfill:accesslog-city

It will populate `access_logs.cityId` based on `locks.address.cityId`.
