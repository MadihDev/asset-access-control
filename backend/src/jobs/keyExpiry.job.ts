import prisma from '../lib/prisma'
import AuditService from '../services/audit.service'
import { AuditAction } from '../types'
import { emitToCity } from '../lib/ws'

let timer: NodeJS.Timeout | null = null

type ExpiredKey = { id: string; userId: string; expiresAt: Date | null; cardId: string }

export async function runKeyExpiryCheckOnce(): Promise<{ deactivatedCount: number }> {
  const now = new Date()

  const expiredActiveKeys: ExpiredKey[] = await prisma.rFIDKey.findMany({
    where: {
      isActive: true,
      expiresAt: { lte: now }
    },
    select: { id: true, userId: true, expiresAt: true, cardId: true }
  })

  if (expiredActiveKeys.length === 0) {
    return { deactivatedCount: 0 }
  }

  const ids = expiredActiveKeys.map((k) => k.id)
  await prisma.rFIDKey.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })

  // Log audits per key (best-effort, don't block on failures)
  await Promise.all(
    expiredActiveKeys.map((k) =>
      AuditService.log({
        action: AuditAction.UPDATE,
        entityType: 'RFIDKey',
        entityId: k.id,
        userId: k.userId,
        newValues: { isActive: false, expiredAt: k.expiresAt, cardId: k.cardId }
      }).catch(() => undefined)
    )
  )

  // Emit WebSocket events grouped by city
  try {
    const users: { id: string; cityId: string | null }[] = await prisma.user.findMany({
      where: { id: { in: expiredActiveKeys.map((k) => k.userId) } },
      select: { id: true, cityId: true }
    })
    const cityByUser = new Map<string, string | null>(users.map((u: { id: string; cityId: string | null }) => [u.id, u.cityId]))
    const affectedCities = new Set<string>()
    for (const key of expiredActiveKeys) {
      const cityId = cityByUser.get(key.userId)
      if (typeof cityId === 'string' && cityId.length > 0) {
        emitToCity(cityId, 'key.expired', { keyId: key.id, cardId: key.cardId, userId: key.userId, expiredAt: key.expiresAt })
        affectedCities.add(cityId)
      }
    }
    // Ask dashboards in affected cities to refresh KPIs
    for (const cityId of affectedCities) {
      emitToCity(cityId, 'kpi:update', { reason: 'key.expired' })
    }
  } catch (_err) {
    // best-effort; ignore
  }

  return { deactivatedCount: expiredActiveKeys.length }
}

export function startKeyExpiryJob(intervalMs?: number): void {
  // Default: run every 5 minutes
  const envInterval = Number(process.env.KEY_EXPIRY_JOB_INTERVAL_MS)
  const effectiveInterval = Number.isFinite(envInterval) && envInterval > 0 ? envInterval : (intervalMs && intervalMs > 0 ? intervalMs : 5 * 60 * 1000)

  // Run immediately on startup (non-blocking)
  runKeyExpiryCheckOnce().catch(() => undefined)

  // Schedule periodic checks
  if (timer) {
    clearInterval(timer)
  }
  timer = setInterval(() => {
    runKeyExpiryCheckOnce().catch(() => undefined)
  }, effectiveInterval)
}

export function stopKeyExpiryJob(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
