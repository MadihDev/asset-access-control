import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getEffectiveCityId } from '../lib/scope'
import { emitToCity } from '../lib/ws'
import { UserRole } from '../types'

class LocationController {
  // GET /api/location/:addressId/users
  async listUsers(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const { status, page: pageRaw, limit: limitRaw } = req.query as { status?: string; page?: string; limit?: string }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 25), 10) || 25, 1), 1000)
      const offset = (page - 1) * limit

      // Verify address exists and (optionally) belongs to effective city scope
      const effectiveCityId = getEffectiveCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, cityId: true } })
      if (!address) {
        return res.status(404).json({ success: false, error: 'Address not found' })
      }
      if (effectiveCityId && address.cityId !== effectiveCityId) {
        // Enforce city scope: address must be inside effective city when scoped
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      const now = new Date()
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)

      // 1) Users with valid permission to any lock at this address
      const eligible: Array<{ userId: string }> = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
          lock: { addressId },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const eligibleUserIds = new Set(eligible.map((e) => e.userId))

      if (eligibleUserIds.size === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: page > 1 },
        })
      }

      // 2) Users with active keys
      const activeKeyUsers: Array<{ userId: string }> = await prisma.rFIDKey.findMany({
        where: {
          userId: { in: Array.from(eligibleUserIds) },
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const activeKeyUserIds = new Set(activeKeyUsers.map((u) => u.userId))

      // 3) Users with recent successful access at this address
      const recentSuccess: Array<{ userId: string | null }> = await prisma.accessLog.findMany({
        where: {
          result: 'GRANTED',
          timestamp: { gte: fifteenMinAgo },
          lock: { addressId },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
      const recentSuccessUserIds = new Set((recentSuccess.map((r) => r.userId).filter(Boolean) as string[]))

      // 4) Compute active set
      const activeSet = new Set<string>()
      for (const uid of eligibleUserIds) {
        if (activeKeyUserIds.has(uid) || recentSuccessUserIds.has(uid)) {
          activeSet.add(uid)
        }
      }

      let selectedIds: string[] = Array.from(eligibleUserIds)
      if (status === 'active') selectedIds = selectedIds.filter((id) => activeSet.has(id))
      if (status === 'inactive') selectedIds = selectedIds.filter((id) => !activeSet.has(id))

      const total = selectedIds.length
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
      const pageIds = selectedIds.slice(offset, offset + limit)

      type SlimUser = { id: string; firstName: string; lastName: string; email: string; role: UserRole }
      const users: SlimUser[] = pageIds.length
        ? await prisma.user.findMany({
            where: { id: { in: pageIds } },
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          })
        : ([] as SlimUser[])

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
        activeAtLocation: activeSet.has(u.id),
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

      // Scope enforcement: address must exist and be within effective city if applicable
      const effectiveCityId = getEffectiveCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, cityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveCityId && address.cityId !== effectiveCityId) {
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
          select: { id: true, name: true, isActive: true, isOnline: true, lastSeen: true, lockType: true },
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

      // Enforce city scope with address
      const effectiveCityId = getEffectiveCityId(req)
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, cityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveCityId && address.cityId !== effectiveCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope for this address' })
      }

      // Find users who have permission for any lock at this address
      const now = new Date()
  const perms: Array<{ userId: string }> = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
          lock: { addressId },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
  const userIds = perms.map((p: { userId: string }) => p.userId)
      if (userIds.length === 0) {
        return res.status(200).json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: page > 1 } })
      }

      // Build key filters
      const where: any = { userId: { in: userIds } }
      if (status === 'active') {
        where.isActive = true
        where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }]
      } else if (status === 'expired') {
        // Either explicitly inactive or has expiredAt in the past
        where.OR = [
          { isActive: false },
          { AND: [{ expiresAt: { lt: now } }, { expiresAt: { not: null } }] },
        ]
      }

      const [total, keys] = await Promise.all([
        prisma.rFIDKey.count({ where }),
        prisma.rFIDKey.findMany({
          where,
          orderBy: [
            { expiresAt: 'desc' },
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
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ])
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
      const effectiveCityId = getEffectiveCityId(req)

      // Ensure address exists and is in scope
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, cityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveCityId && address.cityId !== effectiveCityId) {
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
      const locks: Array<{ id: string; addressId: string }> = await prisma.lock.findMany({ where: { id: { in: lockIds } }, select: { id: true, addressId: true } })
      const lockMap = new Map<string, string>(locks.map((l: { id: string; addressId: string }) => [l.id, l.addressId]))
      for (const lid of lockIds) {
        const addr = lockMap.get(lid)
        if (addr !== addressId) {
          return res.status(400).json({ success: false, error: `Lock ${lid} does not belong to this address` })
        }
      }

      // Optional: city scope on users (if effectiveCityId is set, user.cityId must match)
      const userIds: string[] = Array.from(new Set<string>([...grants.map((g) => g.userId), ...revokes.map((r) => r.userId)]))
      if (effectiveCityId) {
        const scopedUsers: Array<{ id: string }> = await prisma.user.findMany({ where: { id: { in: userIds }, cityId: effectiveCityId }, select: { id: true } })
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

      await prisma.$transaction(async (tx: typeof prisma) => {
        // Process grants (upsert/update semantics on userId+lockId)
        for (const g of uniqGrants) {
          const validFrom = g.validFrom ? new Date(g.validFrom) : now
          const validTo = g.validTo ? new Date(g.validTo) : null
          const existing = await tx.userPermission.findUnique({ where: { userId_lockId: { userId: g.userId, lockId: g.lockId } } })
          if (existing) {
            await tx.userPermission.update({
              where: { userId_lockId: { userId: g.userId, lockId: g.lockId } },
              data: { canAccess: true, validFrom, validTo: validTo ?? existing.validTo },
            })
            results.updated += 1
          } else {
            await tx.userPermission.create({ data: { userId: g.userId, lockId: g.lockId, canAccess: true, validFrom, validTo: validTo ?? undefined } })
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

      // Emit realtime event to city listeners
      emitToCity(address.cityId, 'location:permissions:changed', {
        addressId,
        counts: results,
        ts: new Date().toISOString(),
      })

      return res.status(200).json({ success: true, data: results })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to process bulk permissions' })
    }
  }

  // POST /api/location/:addressId/keys/assign (bulk)
  async bulkAssignKeys(req: Request, res: Response) {
    try {
      const { addressId } = req.params as { addressId: string }
      const effectiveCityId = getEffectiveCityId(req)

      // Ensure address exists and is in scope
      const address = await prisma.address.findUnique({ where: { id: addressId }, select: { id: true, cityId: true } })
      if (!address) return res.status(404).json({ success: false, error: 'Address not found' })
      if (effectiveCityId && address.cityId !== effectiveCityId) {
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

      // City scoping for users
      const userIds = Array.from(new Set<string>(items.map((i) => i.userId)))
      if (effectiveCityId) {
        const scopedUsers: Array<{ id: string }> = await prisma.user.findMany({ where: { id: { in: userIds }, cityId: effectiveCityId }, select: { id: true } })
        const scopedSet = new Set<string>(scopedUsers.map((u) => u.id))
        const outOfScope = userIds.filter((id) => !scopedSet.has(id))
        if (outOfScope.length) {
          return res.status(403).json({ success: false, error: `Some users are out of city scope: ${outOfScope.join(', ')}` })
        }
      }

      const summary = { created: 0, reassigned: 0, updated: 0 }

      await prisma.$transaction(async (tx: typeof prisma) => {
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

      // Emit realtime event to city listeners
      emitToCity(address.cityId, 'location:keys:changed', {
        addressId,
        counts: summary,
        ts: new Date().toISOString(),
      })

      return res.status(200).json({ success: true, data: summary })
    } catch (err) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to assign keys in bulk' })
    }
  }
}

export default new LocationController()
