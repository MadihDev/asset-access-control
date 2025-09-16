import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { UserRole } from '../types'

class DashboardController {
  async overview(req: Request, res: Response) {
    // Scope by city if provided or if user is not admin-level
    const cityIdFromQuery = (req.query.cityId as string) || undefined
    const user = req.user

    const isManagerOrAbove = user && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR].includes(user.role)

    const effectiveCityId = cityIdFromQuery || (!isManagerOrAbove ? user?.cityId : undefined)

    // Build where clauses
    const userWhere: any = {}
    const addressWhere: any = {}
    const lockWhere: any = {}
    const rfidKeyWhere: any = { isActive: true }
    const now = new Date()
    // active key = isActive and (no expiresAt or expiresAt > now)
    rfidKeyWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }]

    if (effectiveCityId) {
      userWhere.cityId = effectiveCityId
      addressWhere.cityId = effectiveCityId
      lockWhere.address = { cityId: effectiveCityId }
    }

    const [
      totalUsers,
      totalLocks,
      onlineLocks,
      activeKeys,
      totalAccessAttempts,
      successfulAccess,
      recentAccessLogs,
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.lock.count({ where: lockWhere }),
      prisma.lock.count({ where: { ...lockWhere, isOnline: true } }),
      prisma.rFIDKey.count({ where: rfidKeyWhere }),
      prisma.accessLog.count({
        where: effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : undefined,
      }),
      prisma.accessLog.count({
        where: effectiveCityId ? { result: 'GRANTED', lock: { address: { cityId: effectiveCityId } } } : { result: 'GRANTED' },
      }),
      prisma.accessLog.findMany({
        where: effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : undefined,
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: { select: { firstName: true, lastName: true } },
          lock: { select: { name: true } },
        },
      }),
    ])

    // active users: users with an active key in scope OR recent successful access within last 15 min
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  const recentSuccessUsers: Array<{ userId: string | null }> = await prisma.accessLog.findMany({
      where: {
        result: 'GRANTED',
        timestamp: { gte: fifteenMinAgo },
        ...(effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    })
  const usersWithActiveKeys: Array<{ userId: string }> = await prisma.rFIDKey.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    })
    const activeUserIds = new Set<string>([
      ...recentSuccessUsers.map((u: { userId: string | null }) => u.userId!).filter(Boolean) as string[],
      ...usersWithActiveKeys.map((u: { userId: string }) => u.userId),
    ])

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers: activeUserIds.size,
        totalLocks,
        onlineLocks,
        activeKeys,
        totalAccessAttempts,
        successfulAccess,
        recentAccessLogs,
        scope: effectiveCityId ? { cityId: effectiveCityId } : { cityId: null },
      },
    })
  }
}

export default new DashboardController()
