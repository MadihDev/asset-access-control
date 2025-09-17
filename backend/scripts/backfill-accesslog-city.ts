import prisma from '../src/lib/prisma'

async function main() {
  console.log('Backfilling access_logs.cityId...')
  // Process in batches to avoid memory pressure
  const batchSize = 1000
  let skip = 0
  let updated = 0

  while (true) {
    const logs = await prisma.accessLog.findMany({
      where: { cityId: null },
      select: { id: true, lockId: true },
      skip,
      take: batchSize,
      orderBy: { timestamp: 'asc' }
    })
    if (logs.length === 0) break

    const lockIds = Array.from(new Set(logs.map((l: { lockId: string }) => l.lockId)))
    const locks = await prisma.lock.findMany({
      where: { id: { in: lockIds } },
      select: { id: true, address: { select: { cityId: true } } }
    })
    const lockCityMap = new Map(locks.map((l: { id: string; address?: { cityId?: string | null } | null }) => [l.id, l.address?.cityId || null]))

    for (const log of logs) {
      const cityId = lockCityMap.get(log.lockId) || null
      await prisma.accessLog.update({ where: { id: log.id }, data: { cityId } })
      updated++
      if (updated % 500 === 0) console.log(`Updated ${updated} logs...`)
    }

    if (logs.length < batchSize) break
    skip += batchSize
  }

  console.log(`Backfill complete. Updated ${updated} rows.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
