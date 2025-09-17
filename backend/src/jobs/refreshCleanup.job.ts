import prisma from '../lib/prisma'

let timer: NodeJS.Timeout | null = null

export async function runRefreshCleanupOnce(): Promise<{ deleted: number }> {
  const now = new Date()
  const res = await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } })
  return { deleted: res.count }
}

export function startRefreshCleanupJob(intervalMs?: number): void {
  // Default: run every 24 hours
  const envInterval = Number(process.env.REFRESH_CLEANUP_INTERVAL_MS)
  const effectiveInterval = Number.isFinite(envInterval) && envInterval > 0 ? envInterval : (intervalMs && intervalMs > 0 ? intervalMs : 24 * 60 * 60 * 1000)

  // Run immediately (non-blocking)
  runRefreshCleanupOnce().catch(() => undefined)

  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    runRefreshCleanupOnce().catch(() => undefined)
  }, effectiveInterval)
}

export function stopRefreshCleanupJob(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
