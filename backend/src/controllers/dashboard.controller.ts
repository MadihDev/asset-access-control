import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { accessLogStrictScopeWhere, addressScopeWhere, locationScopeWhere, lockScopeWhere, userScopeWhere } from '../lib/scope'

class DashboardController {
  async overview(req: Request, res: Response) {
    // Scope by project-city for users
    const user = req.user

    // Build where clauses
    const userWhere: any = userScopeWhere(req) || {}
    const addressWhere: any = addressScopeWhere(req) || {}
    const locationWhere: any = locationScopeWhere(req) || {}
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
          lock: { 
            select: { 
              name: true,
              location: {
                select: {
                  id: true,
                  name: true,
                  address: {
                    select: {
                      street: true,
                      number: true,
                      city: { select: { name: true } }
                    }
                  }
                }
              }
            } 
          },
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

    // Per-location KPIs (grouped by Location)
    const locations: Array<{
      id: string
      name: string
      description: string | null
      addressId: string
      address: {
        id: string
        street: string
        number: string
        zipCode: string
        cityId: string
      }
      locks: Array<{ id: string; isOnline: boolean; isActive: boolean }>
    }> = await prisma.location.findMany({
      where: locationWhere || undefined,
      select: {
        id: true,
        name: true,
        description: true,
        addressId: true,
        address: {
          select: {
            id: true,
            street: true,
            number: true,
            zipCode: true,
            cityId: true,
          }
        },
        locks: { select: { id: true, isOnline: true, isActive: true } },
      },
    })

    // Build a map lockId -> locationId for aggregations
    const lockToLocation = new Map<string, string>()
    for (const location of locations) {
      for (const lock of location.locks) lockToLocation.set(lock.id, location.id)
    }

    // Aggregate access attempts per lock, then roll up to location
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
    const attemptsPerLocation = new Map<string, number>()
    const successPerLocation = new Map<string, number>()
    for (const row of attemptsByLock) {
      const locationId = lockToLocation.get(row.lockId)
      if (!locationId) continue
      attemptsPerLocation.set(locationId, (attemptsPerLocation.get(locationId) || 0) + row._count._all)
    }
    for (const row of successByLock) {
      const locationId = lockToLocation.get(row.lockId)
      if (!locationId) continue
      successPerLocation.set(locationId, (successPerLocation.get(locationId) || 0) + row._count._all)
    }

    // Active users per location (recent successful access within last 15 min)
    const recentByLocation = await prisma.accessLog.findMany({
      where: {
        result: 'GRANTED',
        timestamp: { gte: fifteenMinAgo },
        ...(accessLogStrictScopeWhere(req) || {}),
      },
      select: { userId: true, lock: { select: { locationId: true } } },
    })
    const recentUsersMap = new Map<string, Set<string>>()
    for (const row of recentByLocation) {
      const locationId = row.lock.locationId
      const uid = row.userId
      if (!locationId || !uid) continue
      if (!recentUsersMap.has(locationId)) recentUsersMap.set(locationId, new Set<string>())
      recentUsersMap.get(locationId)!.add(uid)
    }

    // Active keys per location: unique users with an active key AND a current permission to any lock at that location
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
      select: { userId: true, lock: { select: { locationId: true } } },
    })
    const activeKeysMap = new Map<string, Set<string>>()
    for (const row of permsWithActiveKeys) {
      const locationId = row.lock.locationId
      const uid = row.userId
      if (!locationId || !uid) continue
      if (!activeKeysMap.has(locationId)) activeKeysMap.set(locationId, new Set<string>())
      activeKeysMap.get(locationId)!.add(uid) // Set ensures uniqueness per location
    }

    const locationKPIs = locations.map((location) => {
      const total = location.locks.length
      const activeLocksAtLocation = location.locks.filter((l) => l.isOnline).length
      const activeUsersAtLocation = recentUsersMap.get(location.id)?.size || 0
      const activeKeysAtLocation = activeKeysMap.get(location.id)?.size || 0
      const totalAttemptsAtLocation = attemptsPerLocation.get(location.id) || 0
      const successfulAttemptsAtLocation = successPerLocation.get(location.id) || 0
      const successRate = totalAttemptsAtLocation > 0 ? (successfulAttemptsAtLocation / totalAttemptsAtLocation) * 100 : 0
      return {
        locationId: location.id,
        name: location.name,
        description: location.description,
        addressId: location.addressId,
        address: `${location.address.street} ${location.address.number}, ${location.address.zipCode}`,
        cityId: location.address.cityId,
        totalLocks: total,
        activeLocks: activeLocksAtLocation,
        activeUsers: activeUsersAtLocation,
        activeKeys: activeKeysAtLocation,
        totalAttempts: totalAttemptsAtLocation,
        successfulAttempts: successfulAttemptsAtLocation,
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
        locations: locationKPIs,
        scope: user?.projectCityId ? { projectCityId: user.projectCityId } : null,
      },
    })
  }

  // GET /api/dashboard/location-statistics - Location-based access statistics
  async getLocationStatistics(req: Request, res: Response) {
    try {
      // Apply tenant scope filtering
      const scopeWhere = locationScopeWhere(req) || {}

      // Get current date for today's statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      // Fetch locations with comprehensive statistics
      const locations = await prisma.location.findMany({
        where: scopeWhere,
        include: {
          address: {
            include: {
              city: {
                select: { name: true }
              }
            }
          },
          locks: {
            select: {
              id: true,
              name: true,
              isOnline: true,
              _count: {
                select: {
                  permissions: true
                }
              }
            }
          },
          _count: {
            select: {
              locks: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })

      // Get today's access logs for each location
      const locationStats = await Promise.all(
        locations.map(async (location: any) => {
          // Count today's accesses for this location
          const todayAccesses = await prisma.accessLog.count({
            where: {
              lock: {
                location: {
                  id: location.id,
                  ...scopeWhere
                }
              },
              timestamp: {
                gte: today,
                lt: tomorrow
              }
            }
          })

          // Count total accesses for this location
          const totalAccesses = await prisma.accessLog.count({
            where: {
              lock: {
                location: {
                  id: location.id,
                  ...scopeWhere
                }
              }
            }
          })

          // Count active users (users with valid permissions)
          const activeUsers = await prisma.userPermission.groupBy({
            by: ['userId'],
            where: {
              lock: {
                location: {
                  id: location.id,
                  ...scopeWhere
                }
              },
              canAccess: true,
              OR: [
                { validTo: null },
                { validTo: { gt: new Date() } }
              ]
            }
          })

          // Calculate lock statistics
          const onlineLocks = location.locks.filter((lock: any) => lock.isOnline).length
          const offlineLocks = location.locks.filter((lock: any) => !lock.isOnline).length
          const batteryAlerts = location.locks.filter((lock: any) => 
            lock.batteryLevel !== null && lock.batteryLevel < 20
          ).length

          // Calculate average response time (mock data for now)
          const averageResponseTime = Math.random() * 200 + 50 // 50-250ms

          return {
            id: location.id,
            name: location.name,
            address: {
              street: location.address.street,
              number: location.address.number,
              city: { name: location.address.city.name }
            },
            totalLocks: location._count.locks,
            onlineLocks,
            offlineLocks,
            activeUsers: activeUsers.length,
            totalAccesses,
            todayAccesses,
            averageResponseTime: Math.round(averageResponseTime),
            batteryAlerts
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: locationStats
      })
    } catch (err) {
      // Log error for debugging
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get location statistics'
      })
    }
  }
}

export default new DashboardController()
