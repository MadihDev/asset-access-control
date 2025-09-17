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
      // Also scope active keys by user.cityId when city filter is applied
      rfidKeyWhere.user = { cityId: effectiveCityId }
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

    // Per-location KPIs (grouped by Address)
    const addresses: Array<{
      id: string
      street: string
      number: string
      zipCode: string
      cityId: string
      locks: Array<{ id: string; isOnline: boolean; isActive: boolean }>
    }> = await prisma.address.findMany({
      where: effectiveCityId ? { cityId: effectiveCityId } : undefined,
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
      where: effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : undefined,
    })
    const successByLock = await prisma.accessLog.groupBy({
      by: ['lockId'],
      _count: { _all: true },
      where: {
        ...(effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : {}),
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
        ...(effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : {}),
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

    // Active keys per address: users with an active key AND a current permission to any lock at that address
    const permsWithActiveKeys = await prisma.userPermission.findMany({
      where: {
        canAccess: true,
        ...(effectiveCityId ? { lock: { address: { cityId: effectiveCityId } } } : {}),
        AND: [
          { OR: [{ validTo: null }, { validTo: { gt: now } }] },
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
      activeKeysMap.get(addrId)!.add(uid)
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
        scope: effectiveCityId ? { cityId: effectiveCityId } : { cityId: null },
      },
    })
  }
}

export default new DashboardController()
