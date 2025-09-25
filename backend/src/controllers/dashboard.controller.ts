import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { accessLogStrictScopeWhere, addressScopeWhere, lockScopeWhere, userScopeWhere } from '../lib/scope'

class DashboardController {
  async overview(req: Request, res: Response) {
    // Scope by project-city for users
    const user = req.user

    // Build where clauses
    const userWhere: any = userScopeWhere(req) || {}
    const addressWhere: any = addressScopeWhere(req) || {}
    const lockWhere: any = lockScopeWhere(req) || {}
    const rfidKeyWhere: any = { isActive: true }
    const now = new Date()
    // active key = isActive and (no expiresAt or expiresAt > now)
    rfidKeyWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }]

    // Enforce tenant isolation for ALL users regardless of role
    // ADMIN/SUPERVISOR roles only give more permissions WITHIN their tenant, not across tenants
    if (user?.projectCityId) {
      userWhere.projectCityId = user.projectCityId
      addressWhere.projectCityId = user.projectCityId
      lockWhere.projectCityId = user.projectCityId
      rfidKeyWhere.projectCityId = user.projectCityId // Direct projectCityId filtering
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
      prisma.accessLog.count({ where: accessLogStrictScopeWhere(req) || undefined }),
      prisma.accessLog.count({
        where: accessLogStrictScopeWhere(req) ? { result: 'GRANTED', ...(accessLogStrictScopeWhere(req) as object) } : { result: 'GRANTED' },
      }),
      prisma.accessLog.findMany({
        where: accessLogStrictScopeWhere(req) || undefined,
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
        ...(accessLogStrictScopeWhere(req) || {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    })
  const usersWithActiveKeys: Array<{ userId: string }> = await prisma.rFIDKey.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        // Enforce tenant isolation for ALL users
        ...(user?.projectCityId ? { projectCityId: user.projectCityId } : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    })
    const activeUserIds = new Set<string>([
      ...recentSuccessUsers.map((u: { userId: string | null }) => u.userId!).filter(Boolean) as string[],
      ...usersWithActiveKeys.map((u: { userId: string }) => u.userId),
    ])

    // Per-location KPIs (grouped by Address)
    const addresses: Array<{
      id: string
      street: string
      number: string
      zipCode: string
      cityId: string
      locks: Array<{ id: string; isOnline: boolean; isActive: boolean }>
    }> = await prisma.address.findMany({
      where: addressWhere || undefined,
      select: {
        id: true,
        street: true,
        number: true,
        zipCode: true,
        cityId: true,
        locks: { select: { id: true, isOnline: true, isActive: true } },
      },
    })

    // Build a map lockId -> addressId for aggregations
    const lockToAddress = new Map<string, string>()
    for (const a of addresses) {
      for (const l of a.locks) lockToAddress.set(l.id, a.id)
    }

    // Aggregate access attempts per lock, then roll up to address
    const attemptsByLock = await prisma.accessLog.groupBy({
      by: ['lockId'],
      _count: { _all: true },
      where: accessLogStrictScopeWhere(req) || undefined,
    })
    const successByLock = await prisma.accessLog.groupBy({
      by: ['lockId'],
      _count: { _all: true },
      where: {
        ...(accessLogStrictScopeWhere(req) || {}),
        result: 'GRANTED',
      },
    })
    const attemptsPerAddress = new Map<string, number>()
    const successPerAddress = new Map<string, number>()
    for (const row of attemptsByLock) {
      const addrId = lockToAddress.get(row.lockId)
      if (!addrId) continue
      attemptsPerAddress.set(addrId, (attemptsPerAddress.get(addrId) || 0) + row._count._all)
    }
    for (const row of successByLock) {
      const addrId = lockToAddress.get(row.lockId)
      if (!addrId) continue
      successPerAddress.set(addrId, (successPerAddress.get(addrId) || 0) + row._count._all)
    }

    // Active users per address (recent successful access within last 15 min)
    const recentByAddress = await prisma.accessLog.findMany({
      where: {
        result: 'GRANTED',
        timestamp: { gte: fifteenMinAgo },
        ...(accessLogStrictScopeWhere(req) || {}),
      },
      select: { userId: true, lock: { select: { addressId: true } } },
    })
    const recentUsersMap = new Map<string, Set<string>>()
    for (const row of recentByAddress) {
      const addrId = row.lock.addressId
      const uid = row.userId
      if (!addrId || !uid) continue
      if (!recentUsersMap.has(addrId)) recentUsersMap.set(addrId, new Set<string>())
      recentUsersMap.get(addrId)!.add(uid)
    }

    // Active keys per address: unique users with an active key AND a current permission to any lock at that address
    const permsWithActiveKeys = await prisma.userPermission.findMany({
      where: {
        canAccess: true,
        // Enforce tenant isolation for ALL users
        ...(user?.projectCityId ? { user: { projectCityId: user.projectCityId } } : {}),
        AND: [
          { validTo: { gt: now } }, // All permissions now have expiration dates
          { validFrom: { lte: now } },
        ],
        user: {
          rfidKeys: { some: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
        },
      },
      select: { userId: true, lock: { select: { addressId: true } } },
    })
    const activeKeysMap = new Map<string, Set<string>>()
    for (const row of permsWithActiveKeys) {
      const addrId = row.lock.addressId
      const uid = row.userId
      if (!addrId || !uid) continue
      if (!activeKeysMap.has(addrId)) activeKeysMap.set(addrId, new Set<string>())
      activeKeysMap.get(addrId)!.add(uid) // Set ensures uniqueness per address
    }

    const locations = addresses.map((a: { id: string; street: string; number: string; zipCode: string; cityId: string; locks: Array<{ id: string; isOnline: boolean; isActive: boolean }> }) => {
      const total = a.locks.length
      const activeLocksAtAddr = a.locks.filter((l: { isOnline: boolean }) => l.isOnline).length
      const activeUsersAtAddr = recentUsersMap.get(a.id)?.size || 0
      const activeKeysAtAddr = activeKeysMap.get(a.id)?.size || 0
      const totalAttemptsAtAddr = attemptsPerAddress.get(a.id) || 0
      const successfulAttemptsAtAddr = successPerAddress.get(a.id) || 0
      const successRate = totalAttemptsAtAddr > 0 ? (successfulAttemptsAtAddr / totalAttemptsAtAddr) * 100 : 0
      return {
        addressId: a.id,
        name: `${a.street} ${a.number}, ${a.zipCode}`,
        cityId: a.cityId,
        totalLocks: total,
        activeLocks: activeLocksAtAddr,
        activeUsers: activeUsersAtAddr,
        activeKeys: activeKeysAtAddr,
        totalAttempts: totalAttemptsAtAddr,
        successfulAttempts: successfulAttemptsAtAddr,
        successRate,
      }
    })

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
        locations,
        scope: user?.projectCityId ? { projectCityId: user.projectCityId } : null,
      },
    })
  }
}

export default new DashboardController()
