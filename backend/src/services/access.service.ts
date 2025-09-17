import prisma from '../lib/prisma'
import { AccessAttemptRequest, AccessLog, AccessLogQuery, PaginatedResponse, AccessResult, AuditAction, AccessType } from '../types'

class AccessService {
  async logAccessAttempt(attemptData: AccessAttemptRequest): Promise<AccessLog> {
    const { cardId, lockId, accessType = AccessType.RFID_CARD, deviceInfo, metadata } = attemptData

    // Find RFID key and associated user
    const rfidKey = await prisma.rFIDKey.findUnique({
      where: { cardId },
      include: { user: true }
    })

    // Find lock
    const lock = await prisma.lock.findUnique({
      where: { id: lockId },
      include: {
        address: {
          include: {
            city: true
          }
        }
      }
    })

    if (!lock) {
      throw new Error('Lock not found')
    }

    if (!lock.isActive) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_INACTIVE_LOCK,
        lockId,
        userId: rfidKey?.userId,
        rfidKeyId: rfidKey?.id,
        deviceInfo,
        metadata
      })
    }

    if (!lock.isOnline) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.ERROR_DEVICE_OFFLINE,
        lockId,
        userId: rfidKey?.userId,
        rfidKeyId: rfidKey?.id,
        deviceInfo,
        metadata
      })
    }

    if (!rfidKey) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_INVALID_CARD,
        lockId,
        deviceInfo,
        metadata
      })
    }

    if (!rfidKey.isActive) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_INVALID_CARD,
        lockId,
        userId: rfidKey.userId,
        rfidKeyId: rfidKey.id,
        deviceInfo,
        metadata
      })
    }

    if (rfidKey.expiresAt && rfidKey.expiresAt < new Date()) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_EXPIRED_CARD,
        lockId,
        userId: rfidKey.userId,
        rfidKeyId: rfidKey.id,
        deviceInfo,
        metadata
      })
    }

    if (!rfidKey.user.isActive) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_INACTIVE_USER,
        lockId,
        userId: rfidKey.userId,
        rfidKeyId: rfidKey.id,
        deviceInfo,
        metadata
      })
    }

    // Check user permissions
    const permission = await prisma.userPermission.findUnique({
      where: {
        userId_lockId: {
          userId: rfidKey.userId,
          lockId
        }
      }
    })

    if (!permission || !permission.canAccess) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_NO_PERMISSION,
        lockId,
        userId: rfidKey.userId,
        rfidKeyId: rfidKey.id,
        deviceInfo,
        metadata
      })
    }

    // Check permission validity
    const now = new Date()
    if (permission.validFrom > now || (permission.validTo && permission.validTo < now)) {
      return this.createAccessLog({
        accessType,
        result: AccessResult.DENIED_TIME_RESTRICTION,
        lockId,
        userId: rfidKey.userId,
        rfidKeyId: rfidKey.id,
        deviceInfo,
        metadata
      })
    }

    // Access granted
    const accessLog = await this.createAccessLog({
      accessType,
      result: AccessResult.GRANTED,
      lockId,
      userId: rfidKey.userId,
      rfidKeyId: rfidKey.id,
      deviceInfo,
      metadata
    })

    // Update lock last seen
    await prisma.lock.update({
      where: { id: lockId },
      data: { lastSeen: new Date() }
    })

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.ACCESS_ATTEMPT,
      entityType: 'AccessLog',
      entityId: accessLog.id,
      userId: rfidKey.userId,
      newValues: {
        result: AccessResult.GRANTED,
        lockName: lock.name,
        userName: `${rfidKey.user.firstName} ${rfidKey.user.lastName}`
      }
    })

    return accessLog
  }

  async getAccessLogs(query: AccessLogQuery): Promise<PaginatedResponse<AccessLog>> {
    const allowedSortFields = new Set(['timestamp', 'result', 'accessType'])
    const allowedSortOrders = new Set(['asc', 'desc'])

    const pageNum = (() => {
      const p = typeof query.page === 'string' ? parseInt(query.page, 10) : (typeof query.page === 'number' ? query.page : 1)
      return Number.isFinite(p) && p > 0 ? p : 1
    })()
    const limitNum = (() => {
      const l = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (typeof query.limit === 'number' ? query.limit : 50)
      const n = Number.isFinite(l) && l > 0 ? l : 50
      return Math.min(n, 1000)
    })()
    const sortField = (typeof query.sortBy === 'string' && allowedSortFields.has(query.sortBy)) ? query.sortBy : 'timestamp'
    const sortDir: 'asc' | 'desc' = (typeof query.sortOrder === 'string' && allowedSortOrders.has(query.sortOrder)) ? (query.sortOrder as 'asc' | 'desc') : 'desc'

  const skip = (pageNum - 1) * limitNum
      const { userId, lockId, result, accessType, startDate, endDate, cityId } = query
  const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (lockId) {
      where.lockId = lockId
    }
    if (query.addressId) {
      where.lock = { ...(where.lock || {}), addressId: query.addressId }
    }

    if (result) {
      where.result = result
    }

    if (accessType) {
      where.accessType = accessType
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

      if (cityId) {
        where.cityId = cityId
      }

    const [accessLogs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortDir },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              username: true,
              role: true
            }
          },
          rfidKey: {
            select: {
              id: true,
              cardId: true,
              name: true
            }
          },
          lock: {
            include: {
              address: {
                include: {
                  city: true
                }
              }
            }
          }
        }
      }),
      prisma.accessLog.count({ where })
    ])

    return {
      data: accessLogs as AccessLog[],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }
  }

  async getAccessStats(timeframe: 'day' | 'week' | 'month' = 'week', cityId?: string): Promise<{
    totalAttempts: number
    successfulAttempts: number
    failedAttempts: number
    successRate: number
    topUsers: Array<{ user: any; attempts: number }>
    topLocks: Array<{ lock: any; attempts: number }>
    trendData: Array<{ date: string; successful: number; failed: number }>
  }> {
    const now = new Date()
    let startDate: Date

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    const accessLogs = await prisma.accessLog.findMany({
      where: {
        timestamp: {
          gte: startDate
        },
        ...(cityId ? { cityId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        lock: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const totalAttempts = accessLogs.length
  const successfulAttempts = accessLogs.filter((log: any) => log.result === AccessResult.GRANTED).length
    const failedAttempts = totalAttempts - successfulAttempts
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0

    // Top users by access attempts
    const userStats = accessLogs.reduce((acc: Record<string, { user: any; attempts: number }>, log: any) => {
      if (log.user) {
        const userId = log.user.id
        acc[userId] = acc[userId] || { user: log.user, attempts: 0 }
        acc[userId].attempts++
      }
      return acc
    }, {})

    const topUsers = (Object.values(userStats) as Array<{ user: any; attempts: number }>)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10)

    // Top locks by access attempts
    const lockStats = accessLogs.reduce((acc: Record<string, { lock: any; attempts: number }>, log: any) => {
      const lockId = log.lock.id
      acc[lockId] = acc[lockId] || { lock: log.lock, attempts: 0 }
      acc[lockId].attempts++
      return acc
    }, {})

    const topLocks = (Object.values(lockStats) as Array<{ lock: any; attempts: number }>)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10)

    // Trend data (daily breakdown)
    const trendData = this.generateTrendData(accessLogs, startDate, now)

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate,
      topUsers,
      topLocks,
      trendData
    }
  }

  private async createAccessLog(data: {
    accessType: string
    result: AccessResult
    lockId: string
    userId?: string
    rfidKeyId?: string
    deviceInfo?: Record<string, any>
    metadata?: Record<string, any>
  }): Promise<AccessLog> {
      // Derive cityId from lock->address for denormalization
      const lockCity = await prisma.lock.findUnique({
        where: { id: data.lockId },
        select: { address: { select: { cityId: true } } }
      })
      const accessLog = await prisma.accessLog.create({
        data: { ...data, cityId: lockCity?.address?.cityId },
      include: {
        user: true,
        rfidKey: true,
        lock: {
          include: {
            address: {
              include: {
                city: true
              }
            }
          }
        }
      }
    })

    // Emit WebSocket events to the city's room, if city is known
    try {
      const cityId = accessLog.lock?.address?.city?.id
      if (typeof cityId === 'string' && cityId.length > 0) {
        const { id, result, accessType, timestamp, userId, rfidKeyId, lockId } = accessLog as any
        const payload = { id, result, accessType, timestamp, userId, rfidKeyId, lockId }
        const { emitToCity } = await import('../lib/ws')
        emitToCity(cityId, 'access.created', payload)
        emitToCity(cityId, 'kpi:update', { reason: 'access.created' })
      }
    } catch (_err) {
      // best-effort only
    }

    return accessLog as AccessLog
  }

  private async createAuditLog(data: {
    action: AuditAction
    entityType: string
    entityId: string
    userId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
  }): Promise<void> {
    const now = new Date()
    const twoSecondsAgo = new Date(now.getTime() - 2000)
    const found = await prisma.auditLog.findFirst({
      where: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        timestamp: { gte: twoSecondsAgo }
      },
      orderBy: { timestamp: 'desc' }
    })
    if (found) return
    await prisma.auditLog.create({ data })
  }

  private generateTrendData(accessLogs: any[], startDate: Date, endDate: Date): Array<{ date: string; successful: number; failed: number }> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    const trendData = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayLogs = accessLogs.filter((log: any) => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0]
        return logDate === dateStr
      })

      const successful = dayLogs.filter((log: any) => log.result === 'GRANTED').length
      const failed = dayLogs.length - successful

      trendData.push({
        date: dateStr,
        successful,
        failed
      })
    }

    return trendData
  }
}

export default new AccessService()