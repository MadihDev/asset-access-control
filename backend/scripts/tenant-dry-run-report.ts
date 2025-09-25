import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

type CountRow = { cityId: string | null; count: bigint | number };

const prisma = new PrismaClient();

function toNumber(n: bigint | number): number {
  return typeof n === 'bigint' ? Number(n) : n;
}

async function main() {
  console.log('Tenant Migration Dry-Run Report (city distribution)');
  console.log('Database URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');

  // Load cities for name lookup
  const cities = await prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const cityName = new Map<string, string>();
  for (const c of cities) cityName.set(c.id, c.name);

  // Users by city
  const usersByCity = await prisma.user.groupBy({ by: ['cityId'], _count: { _all: true } });
  // Addresses by city
  const addressesByCity = await prisma.address.groupBy({ by: ['cityId'], _count: { _all: true } });
  // Access logs by city (uses denormalized cityId)
  const accessByCity = await prisma.accessLog.groupBy({ by: ['cityId'], _count: { _all: true } });

  // Locks by city via address join
  const locksByCity = (await prisma.$queryRaw<CountRow[]>`
    SELECT a."cityId" AS "cityId", COUNT(l."id")::bigint AS count
    FROM "locks" l
    JOIN "addresses" a ON l."addressId" = a."id"
    GROUP BY a."cityId"
  `) as CountRow[];

  // RFID keys by user.cityId
  const rfidByCity = (await prisma.$queryRaw<CountRow[]>`
    SELECT u."cityId" AS "cityId", COUNT(k."id")::bigint AS count
    FROM "rfid_keys" k
    JOIN "users" u ON k."userId" = u."id"
    GROUP BY u."cityId"
  `) as CountRow[];

  // Permissions by lock.address.cityId
  const permissionsByCity = (await prisma.$queryRaw<CountRow[]>`
    SELECT a."cityId" AS "cityId", COUNT(p."id")::bigint AS count
    FROM "user_permissions" p
    JOIN "locks" l ON p."lockId" = l."id"
    JOIN "addresses" a ON l."addressId" = a."id"
    GROUP BY a."cityId"
  `) as CountRow[];

  // Null diagnostics
  const nullDiag = await Promise.all([
    prisma.user.count({ where: { cityId: null } }),
    prisma.accessLog.count({ where: { cityId: null } }),
  ]);
  const [usersCityNull, accessCityNull] = nullDiag;

  // Index by cityId for aggregation
  type Row = { cityId: string | null; name: string; users: number; addresses: number; locks: number; rfidKeys: number; permissions: number; accessLogs: number };
  const map = new Map<string, Row>();

  function ensureRow(cityId: string | null): Row {
    const key = cityId ?? 'NULL';
    const existing = map.get(key);
    if (existing) return existing;
    const row: Row = {
      cityId,
      name: cityId ? cityName.get(cityId) ?? '(unknown city)' : '(null)',
      users: 0,
      addresses: 0,
      locks: 0,
      rfidKeys: 0,
      permissions: 0,
      accessLogs: 0,
    };
    map.set(key, row);
    return row;
  }

  for (const r of usersByCity) ensureRow(r.cityId ?? null).users = r._count._all;
  for (const r of addressesByCity) ensureRow(r.cityId ?? null).addresses = r._count._all;
  for (const r of accessByCity) ensureRow(r.cityId ?? null).accessLogs = r._count._all;
  for (const r of locksByCity) ensureRow(r.cityId ?? null).locks = toNumber(r.count);
  for (const r of rfidByCity) ensureRow(r.cityId ?? null).rfidKeys = toNumber(r.count);
  for (const r of permissionsByCity) ensureRow(r.cityId ?? null).permissions = toNumber(r.count);

  // Prepare and print table
  const rows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  const totals = rows.reduce(
    (acc, r) => {
      acc.users += r.users;
      acc.addresses += r.addresses;
      acc.locks += r.locks;
      acc.rfidKeys += r.rfidKeys;
      acc.permissions += r.permissions;
      acc.accessLogs += r.accessLogs;
      return acc;
    },
    { users: 0, addresses: 0, locks: 0, rfidKeys: 0, permissions: 0, accessLogs: 0 }
  );

  const printable = rows.map(r => ({
    cityId: r.cityId ?? 'NULL',
    city: r.name,
    users: r.users,
    addresses: r.addresses,
    locks: r.locks,
    rfidKeys: r.rfidKeys,
    permissions: r.permissions,
    accessLogs: r.accessLogs,
  }));

  console.log('\nPer-city distribution:');
  console.table(printable);

  console.log('Totals:', totals);

  if (usersCityNull > 0 || accessCityNull > 0) {
    console.log('\nDiagnostics:');
    console.log(`- Users with cityId = NULL: ${usersCityNull}`);
    console.log(`- AccessLogs with cityId = NULL: ${accessCityNull}`);
  }

  console.log('\nNote: This is a dry-run read-only report. No writes were performed.');
}

main()
  .catch((e) => {
    console.error('Error running tenant dry-run report:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
