import prisma from '../lib/prisma'
import { AuditAction } from '../types'
import type { Request } from 'express'

class AuditService {
  async log(params: {
    req?: Request
    action: AuditAction
    entityType: string
    entityId: string
    userId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
  }): Promise<void> {
    const { req, action, entityType, entityId, userId, oldValues, newValues } = params
    const ipAddress = req?.ip
    const userAgent = req?.headers?.['user-agent']
    const resolvedUserId = userId ?? (req as any)?.user?.id

    // Simple dedupe: if an identical action for same entity/user was logged within last 2 seconds, skip
    const now = new Date()
    const twoSecondsAgo = new Date(now.getTime() - 2000)
    const recent = await prisma.auditLog.findFirst({
      where: {
        action,
        entityType,
        entityId,
        userId: resolvedUserId,
        timestamp: { gte: twoSecondsAgo }
      },
      orderBy: { timestamp: 'desc' }
    })

    if (recent) {
      return
    }

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId: resolvedUserId,
        oldValues,
        newValues,
        ipAddress: ipAddress || undefined,
        userAgent: typeof userAgent === 'string' ? userAgent : undefined
      }
    })
  }
}

export default new AuditService()
