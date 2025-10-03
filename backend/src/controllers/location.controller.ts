import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { emitToProjectCity } from '../lib/ws'
import { UserRole } from '../types'
import { getEffectiveProjectCityId } from '../lib/scope'

class LocationController {
  // GET /api/location/:addressId/users
  async listUsers(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const { status, page: pageRaw, limit: limitRaw } = req.query as { status?: string; page?: string; limit?: string }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 1000)
      const offset = (page - 1) * limit

      // Verify address exists and (optionally) belongs to effective project-city scope
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, projectCityId: true } })
      if (!address) {
        return res.status(404).json({ success: false, error: 'Address not found' })
      }
      if (effectiveProjectCityId && address.projectCityId !== effectiveProjectCityId) {
        // Enforce project-city scope: address must be inside effective project-city when scoped
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      const now = new Date()
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)

      // 1) Users with valid permission to any lock at this address
      const eligible: Array<{ userId: string }> = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validFrom: { lte: now },
          validTo: { gt: now }, // All permissions now have expiration dates
          lock: { location: { addressId } },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const eligibleUserIds = new Set(eligible.map((e) => e.userId))

      // 2) HYBRID APPROACH: Also get users with active RFID keys within the same tenant scope
      const addressTenantScope = await prisma.address.findUnique({
        where: { id: addressId },
        select: { projectCityId: true }
      })
      
      const rfidKeyUsers: Array<{ userId: string }> = await prisma.rFIDKey.findMany({
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          projectCityId: addressTenantScope?.projectCityId || undefined,
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const rfidKeyUserIds = new Set(rfidKeyUsers.map((r) => r.userId))

      // Combine both sets: users with permissions OR users with active RFID keys in same tenant scope
      const allRelevantUserIds = new Set([...eligibleUserIds, ...rfidKeyUserIds])

      if (allRelevantUserIds.size === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: page > 1 },
        })
      }

      // 3) Users with recent successful access at this address
      const recentSuccess: Array<{ userId: string | null }> = await prisma.accessLog.findMany({
        where: {
          result: 'GRANTED',
          timestamp: { gte: fifteenMinAgo },
          lock: { location: { addressId } },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const recentSuccessUserIds = new Set((recentSuccess.map((r) => r.userId).filter(Boolean) as string[]))

      // 4) Compute active set (users with permissions OR active keys OR recent access)
      const activeSet = new Set<string>()
      for (const uid of allRelevantUserIds) {
        if (eligibleUserIds.has(uid) || rfidKeyUserIds.has(uid) || recentSuccessUserIds.has(uid)) {
          activeSet.add(uid)
        }
      }

      let selectedIds: string[] = Array.from(allRelevantUserIds)
      if (status === 'active') selectedIds = selectedIds.filter((id) => activeSet.has(id))
      if (status === 'inactive') selectedIds = selectedIds.filter((id) => !activeSet.has(id))

      const total = selectedIds.length
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
      const pageIds = selectedIds.slice(offset, offset + limit)

      type SlimUser = { id: string; firstName: string; lastName: string; email: string; role: UserRole; rfidKeys: any[] }
      const usersFromDb = pageIds.length
        ? await prisma.user.findMany({
            where: { id: { in: pageIds } },
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              role: true,
              rfidKeys: {
                where: { isActive: true },
                select: {
                  id: true,
                  cardId: true,
                  isActive: true
                }
              }
            },
          })
        : []

      // Map users to cast role type properly
      const users: SlimUser[] = usersFromDb.map(user => ({
        ...user,
        role: user.role as unknown as UserRole
      }))

      // Sort by lastName, firstName ascending for readability
      users.sort((a: SlimUser, b: SlimUser) => {
        const ln = (a.lastName || '').localeCompare(b.lastName || '')
        if (ln !== 0) return ln
        return (a.firstName || '').localeCompare(b.firstName || '')
      })

      const data = users.map((u: SlimUser) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: activeSet.has(u.id),
        accessType: {
          hasPermissions: eligibleUserIds.has(u.id),
          hasActiveRfidKey: rfidKeyUserIds.has(u.id),
          hasRecentAccess: recentSuccessUserIds.has(u.id)
        },
        rfidKeys: u.rfidKeys || []
      }))

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list users for location' })
    }
  }

  // GET /api/location/:addressId/locks
  async listLocks(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const { status, page: pageRaw, limit: limitRaw } = req.query as { status?: string; page?: string; limit?: string }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 1000)
      const offset = (page - 1) * limit

      // Scope enforcement: address must exist and be within effective project-city if applicable
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, projectCityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveProjectCityId && address.projectCityId !== effectiveProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      // Filters mapping
      const where: any = { addressId }
      if (status === 'active') where.isActive = true
      if (status === 'inactive') where.isActive = false
      if (status === 'online') where.isOnline = true
      if (status === 'offline') where.isOnline = false

      const [total, items] = await Promise.all([
        prisma.lock.count({ where }),
        prisma.lock.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: offset,
          take: limit,
          include: {
            _count: {
              select: {
                permissions: true
              }
            }
          }
        }),
      ])
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

      return res.status(200).json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list locks for location' })
    }
  }

  // GET /api/location/:addressId/keys
  async listKeys(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const { status, page: pageRaw, limit: limitRaw } = req.query as { status?: string; page?: string; limit?: string }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 1000)
      const offset = (page - 1) * limit

      // Enforce project-city scope with address
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, projectCityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveProjectCityId && address.projectCityId !== effectiveProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      // Find users who have permission for any lock at this address
      const now = new Date()
      const perms: Array<{ userId: string }> = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validFrom: { lte: now },
          validTo: { gt: now }, // All permissions now have expiration dates
          lock: { location: { addressId } },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const userIds = perms.map((p: { userId: string }) => p.userId)
      if (userIds.length === 0) {
        return res.status(200).json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: page > 1 } })
      }

      // IMPROVED LOGIC: Show only address-relevant keys
      let keys: any[] = []
      let total = 0
      
      if (status === 'all') {
        // Show all active keys for users with access to this address
        const where: any = { 
          userId: { in: userIds },
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        }
        
        const [totalCount, allKeys] = await Promise.all([
          prisma.rFIDKey.count({ where }),
          prisma.rFIDKey.findMany({
            where,
            orderBy: [
              { issuedAt: 'desc' },
              { cardId: 'asc' },
            ],
            skip: offset,
            take: limit,
            select: {
              id: true,
              cardId: true,
              name: true,
              isActive: true,
              issuedAt: true,
              expiresAt: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          })
        ])
        total = totalCount
        keys = allKeys
        
      } else {
        // Default behavior: Show most recent active key per user
        // This gives a cleaner, more logical view for the address
        const recentKeysPerUser = await Promise.all(
          userIds.map(async (userId) => {
            const userKey = await prisma.rFIDKey.findFirst({
              where: {
                userId,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
              },
              orderBy: {
                issuedAt: 'desc' // Most recent key
              },
              select: {
                id: true,
                cardId: true,
                name: true,
                isActive: true,
                issuedAt: true,
                expiresAt: true,
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            })
            return userKey
          })
        )
        
        // Filter out null results and apply pagination
        const validKeys = recentKeysPerUser.filter(key => key !== null)
        total = validKeys.length
        
        // Apply pagination to the filtered results
        keys = validKeys.slice(offset, offset + limit)
      }
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

      return res.status(200).json({
        success: true,
        data: keys,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to list keys for location' })
    }
  }

  // POST /api/location/:addressId/permissions (bulk)
  async bulkPermissions(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Ensure address exists and is in scope
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, projectCityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveProjectCityId && address.projectCityId !== effectiveProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      // Validate payload
      const body = req.body as {
        grants?: Array<{ userId: string; lockId: string; validFrom?: string; validTo?: string }>
        revokes?: Array<{ userId: string; lockId: string }>
      }
      const grants = Array.isArray(body?.grants) ? body.grants : []
      const revokes = Array.isArray(body?.revokes) ? body.revokes : []

      if (grants.length === 0 && revokes.length === 0) {
        return res.status(400).json({ success: false, error: 'Provide at least one grant or revoke item' })
      }

      // Enforce bulk size limits
      const MAX_BULK = Number(process.env.MAX_LOCATION_BULK_ITEMS ?? 500)
      const totalItems = grants.length + revokes.length
      if (totalItems > MAX_BULK) {
        return res.status(413).json({ success: false, error: `Too many items (${totalItems}). Max allowed: ${MAX_BULK}` })
      }

      // Basic field validation and date coherence
      for (const g of grants) {
        if (!g.userId || !g.lockId) {
          return res.status(400).json({ success: false, error: 'Each grant requires userId and lockId' })
        }
        if (g.validFrom && isNaN(new Date(g.validFrom).getTime())) {
          return res.status(400).json({ success: false, error: `Invalid validFrom for user ${g.userId} & lock ${g.lockId}` })
        }
        if (g.validTo && isNaN(new Date(g.validTo).getTime())) {
          return res.status(400).json({ success: false, error: `Invalid validTo for user ${g.userId} & lock ${g.lockId}` })
        }
        if (g.validFrom && g.validTo) {
          const from = new Date(g.validFrom)
          const to = new Date(g.validTo)
          if (from.getTime() > to.getTime()) {
            return res.status(400).json({ success: false, error: `validFrom must be <= validTo for user ${g.userId} & lock ${g.lockId}` })
          }
        }
      }
      for (const r of revokes) {
        if (!r.userId || !r.lockId) {
          return res.status(400).json({ success: false, error: 'Each revoke requires userId and lockId' })
        }
      }

      // Compute all lockIds and ensure they belong to the same address
      const lockIds = Array.from(new Set([...grants.map(g => g.lockId), ...revokes.map(r => r.lockId)]))
      const locks: Array<{ id: string; location: { addressId: string } }> = await prisma.lock.findMany({ 
        where: { id: { in: lockIds } }, 
        select: { id: true, location: { select: { addressId: true } } } 
      })
      const lockMap = new Map<string, string>(locks.map((l: { id: string; location: { addressId: string } }) => [l.id, l.location.addressId]))
      for (const lid of lockIds) {
        const addr = lockMap.get(lid)
        if (addr !== addressId) {
          return res.status(400).json({ success: false, error: `Lock ${lid} does not belong to this address` })
        }
      }

      // Optional: project-city scope on users (if effectiveProjectCityId is set, user.projectCityId must match)
      const userIds: string[] = Array.from(new Set<string>([...grants.map((g) => g.userId), ...revokes.map((r) => r.userId)]))
      if (effectiveProjectCityId) {
        const scopedUsers: Array<{ id: string }> = await prisma.user.findMany({ where: { id: { in: userIds }, projectCityId: effectiveProjectCityId }, select: { id: true } })
        const scopedSet = new Set<string>(scopedUsers.map((u: { id: string }) => u.id))
        const outOfScope = userIds.filter(id => !scopedSet.has(id))
        if (outOfScope.length) {
          return res.status(403).json({ success: false, error: `Some users are out of city scope: ${outOfScope.join(', ')}` })
        }
      }

      const now = new Date()
      const results = { granted: 0, updated: 0, revoked: 0 }

      // Dedupe grant/revoke pairs to avoid duplicate DB operations
      const uniqGrantKeys = new Set<string>()
      const uniqGrants = grants.filter((g) => {
        const key = `${g.userId}::${g.lockId}`
        if (uniqGrantKeys.has(key)) return false
        uniqGrantKeys.add(key)
        return true
      })
      const uniqRevokeKeys = new Set<string>()
      const uniqRevokes = revokes.filter((r) => {
        const key = `${r.userId}::${r.lockId}`
        if (uniqRevokeKeys.has(key)) return false
        uniqRevokeKeys.add(key)
        return true
      })

      await prisma.$transaction(async (tx) => {
        // Process grants (upsert/update semantics on userId+lockId)
        for (const g of uniqGrants) {
          const validFrom = g.validFrom ? new Date(g.validFrom) : now
          
          // All permissions must expire after 12 hours (no permanent permissions)
          const validTo = g.validTo ? new Date(g.validTo) : new Date(now.getTime() + 12 * 60 * 60 * 1000)
          
          const existing = await tx.userPermission.findUnique({ where: { userId_lockId: { userId: g.userId, lockId: g.lockId } } })
          if (existing) {
            await tx.userPermission.update({
              where: { userId_lockId: { userId: g.userId, lockId: g.lockId } },
              data: { canAccess: true, validFrom, validTo },
            })
            results.updated += 1
          } else {
            await tx.userPermission.create({ data: { userId: g.userId, lockId: g.lockId, canAccess: true, validFrom, validTo } })
            results.granted += 1
          }
        }

        // Process revokes (delete if exists)
        for (const r of uniqRevokes) {
          const existing = await tx.userPermission.findUnique({ where: { userId_lockId: { userId: r.userId, lockId: r.lockId } } })
          if (existing) {
            await tx.userPermission.delete({ where: { id: existing.id } })
            results.revoked += 1
          }
        }
      })

      // Emit realtime event to project-city listeners
      if (address.projectCityId) {
        emitToProjectCity(address.projectCityId, 'location:permissions:changed', {
          addressId,
          counts: results,
          ts: new Date().toISOString(),
        })
      }

      return res.status(200).json({ success: true, data: results })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to process bulk permissions' })
    }
  }

  // POST /api/location/:addressId/keys/assign (bulk)
  async bulkAssignKeys(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Ensure address exists and is in scope
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, projectCityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveProjectCityId && address.projectCityId !== effectiveProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      // Validate payload
      const body = req.body as {
        items?: Array<{ cardId: string; userId: string; name?: string; expiresAt?: string; isActive?: boolean }>
      }
      const items: Array<{ cardId: string; userId: string; name?: string; expiresAt?: string; isActive?: boolean }> =
        Array.isArray(body?.items) ? body!.items! : []

      if (!items.length) {
        return res.status(400).json({ success: false, error: 'Provide at least one item to assign' })
      }

      // Enforce bulk size limits
      const MAX_BULK = Number(process.env.MAX_LOCATION_BULK_ITEMS ?? 500)
      if (items.length > MAX_BULK) {
        return res.status(413).json({ success: false, error: `Too many items (${items.length}). Max allowed: ${MAX_BULK}` })
      }

      // Basic item validation
      for (const it of items) {
        if (!it.cardId || !it.userId) {
          return res.status(400).json({ success: false, error: 'Each item requires cardId and userId' })
        }
        if (it.expiresAt) {
          const d = new Date(it.expiresAt)
          if (isNaN(d.getTime())) {
            return res.status(400).json({ success: false, error: `Invalid expiresAt date for cardId ${it.cardId}` })
          }
        }
      }

      // Project-city scoping for users
      const userIds = Array.from(new Set<string>(items.map((i) => i.userId)))
      if (effectiveProjectCityId) {
        const scopedUsers: Array<{ id: string }> = await prisma.user.findMany({ where: { id: { in: userIds }, projectCityId: effectiveProjectCityId }, select: { id: true } })
        const scopedSet = new Set<string>(scopedUsers.map((u) => u.id))
        const outOfScope = userIds.filter((id) => !scopedSet.has(id))
        if (outOfScope.length) {
          return res.status(403).json({ success: false, error: `Some users are out of city scope: ${outOfScope.join(', ')}` })
        }
      }

      const summary = { created: 0, reassigned: 0, updated: 0 }

      await prisma.$transaction(async (tx) => {
        // Dedupe by cardId to avoid double-processing
        const seen = new Set<string>()
        for (const it of items) {
          if (seen.has(it.cardId)) continue
          seen.add(it.cardId)
          const expiresAt = it.expiresAt ? new Date(it.expiresAt) : null
          const isActive = it.isActive === undefined ? true : !!it.isActive
          const existing = await tx.rFIDKey.findUnique({ where: { cardId: it.cardId }, select: { id: true, userId: true, expiresAt: true, name: true, isActive: true } })
          if (existing) {
            const reassigned = existing.userId !== it.userId
            await tx.rFIDKey.update({
              where: { cardId: it.cardId },
              data: {
                userId: it.userId,
                name: it.name ?? existing.name ?? undefined,
                isActive,
                expiresAt: expiresAt ?? existing.expiresAt ?? null,
              },
            })
            if (reassigned) summary.reassigned += 1
            else summary.updated += 1
          } else {
            await tx.rFIDKey.create({
              data: {
                cardId: it.cardId,
                userId: it.userId,
                name: it.name ?? undefined,
                isActive,
                expiresAt: expiresAt ?? undefined,
              },
            })
            summary.created += 1
          }
        }
      })

      // Emit realtime event to project-city listeners
      if (address.projectCityId) {
        emitToProjectCity(address.projectCityId, 'location:keys:changed', {
          addressId,
          counts: summary,
          ts: new Date().toISOString(),
        })
      }

      return res.status(200).json({ success: true, data: summary })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to assign keys in bulk' })
    }
  }

  // GET /api/location - List locations
  async list(req: Request, res: Response) {
    try {
      const { page: pageRaw, limit: limitRaw, search } = req.query as { 
        page?: string
        limit?: string
        search?: string
      }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 100)
      const offset = (page - 1) * limit

      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const where: any = {}
      
      if (effectiveProjectCityId) {
        where.address = { projectCityId: effectiveProjectCityId }
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      }

      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where,
          include: {
            address: {
              include: {
                city: true
              }
            },
            _count: {
              select: {
                locks: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip: offset,
          take: limit,
        }),
        prisma.location.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return res.status(200).json({
        success: true,
        data: locations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch locations'
      })
    }
  }

  // POST /api/location - Create location
  async create(req: Request, res: Response) {
    try {
      const { name, description, addressId } = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Verify address exists and is accessible
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          ...(effectiveProjectCityId ? { projectCityId: effectiveProjectCityId } : {})
        }
      })

      if (!address) {
        return res.status(404).json({
          success: false,
          error: 'Address not found or not accessible'
        })
      }

      const location = await prisma.location.create({
        data: {
          name,
          description,
          addressId,
          projectCityId: address.projectCityId
        },
        include: {
          address: {
            include: {
              city: true
            }
          }
        }
      })

      return res.status(201).json({
        success: true,
        data: location
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create location'
      })
    }
  }

  // PUT /api/location/:locationId - Update location
  async update(req: Request, res: Response) {
    try {
      const { locationId } = req.params
      const { name, description } = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Verify location exists and is accessible
      const existingLocation = await prisma.location.findFirst({
        where: {
          id: locationId,
          ...(effectiveProjectCityId ? { address: { projectCityId: effectiveProjectCityId } } : {})
        }
      })

      if (!existingLocation) {
        return res.status(404).json({
          success: false,
          error: 'Location not found or not accessible'
        })
      }

      const location = await prisma.location.update({
        where: { id: locationId },
        data: {
          name,
          description,
          updatedAt: new Date()
        },
        include: {
          address: {
            include: {
              city: true
            }
          }
        }
      })

      return res.status(200).json({
        success: true,
        data: location
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update location'
      })
    }
  }

  // GET /api/location/:locationId/locks - Get locks for location
  async getLocks(req: Request, res: Response) {
    try {
      const { locationId } = req.params
      const { page: pageRaw, limit: limitRaw } = req.query as { 
        page?: string
        limit?: string
      }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 100)
      const offset = (page - 1) * limit

      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Verify location exists and is accessible
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          ...(effectiveProjectCityId ? { address: { projectCityId: effectiveProjectCityId } } : {})
        }
      })

      if (!location) {
        return res.status(404).json({
          success: false,
          error: 'Location not found or not accessible'
        })
      }

      const [locks, total] = await Promise.all([
        prisma.lock.findMany({
          where: { locationId },
          include: {
            _count: {
              select: {
                permissions: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip: offset,
          take: limit,
        }),
        prisma.lock.count({ where: { locationId } })
      ])

      const totalPages = Math.ceil(total / limit)

      return res.status(200).json({
        success: true,
        data: locks,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch location locks'
      })
    }
  }

  // POST /api/location/bulk - Bulk operations on locations
  async bulkUpdate(req: Request, res: Response) {
    try {
      const { operation, locationIds } = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      if (!Array.isArray(locationIds) || locationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'locationIds must be a non-empty array'
        })
      }

      // Verify all locations exist and are accessible
      const locations = await prisma.location.findMany({
        where: {
          id: { in: locationIds },
          ...(effectiveProjectCityId ? { address: { projectCityId: effectiveProjectCityId } } : {})
        }
      })

      if (locations.length !== locationIds.length) {
        return res.status(404).json({
          success: false,
          error: 'Some locations not found or not accessible'
        })
      }

      let processed = 0

      switch (operation) {
        case 'activate':
          // For now, just mark as processed (locations don't have isActive field in this schema)
          processed = locations.length
          break
        case 'deactivate':
          processed = locations.length
          break
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid operation. Supported operations: activate, deactivate'
          })
      }

      return res.status(200).json({
        success: true,
        data: {
          operation,
          processed,
          total: locationIds.length
        }
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to perform bulk operation'
      })
    }
  }

  // DELETE /api/location/:locationId - Delete location
  async delete(req: Request, res: Response) {
    try {
      const { locationId } = req.params
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Find the location and verify access
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          ...(effectiveProjectCityId ? { projectCityId: effectiveProjectCityId } : {})
        },
        include: {
          _count: {
            select: {
              locks: true
            }
          }
        }
      })

      if (!location) {
        return res.status(404).json({
          success: false,
          error: 'Location not found or not accessible'
        })
      }

      // Check if location has locks
      if (location._count.locks > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete location with existing locks. Please remove all locks first.'
        })
      }

      // Delete the location
      await prisma.location.delete({
        where: { id: locationId }
      })

      return res.status(200).json({
        success: true,
        message: 'Location deleted successfully'
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete location'
      })
    }
  }
}

export default new LocationController()
