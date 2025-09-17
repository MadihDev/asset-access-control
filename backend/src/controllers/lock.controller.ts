import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getEffectiveCityId } from '../lib/scope'

class LockController {
  async list(req: Request, res: Response) {
    try {
      const effectiveCityId = getEffectiveCityId(req)
      const activeOnlyRaw = (req.query.activeOnly as string | undefined)
      const activeOnly = activeOnlyRaw === undefined ? true : !(String(activeOnlyRaw).toLowerCase() === 'false')

      const where: any = {}
      if (activeOnly) where.isActive = true
      if (effectiveCityId) {
        where.address = { cityId: effectiveCityId }
      }
      const locks = await prisma.lock.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          lockType: true,
          isActive: true,
          isOnline: true,
          lastSeen: true,
          address: {
            select: { street: true, number: true, zipCode: true, city: { select: { id: true, name: true } } }
          }
        }
      })
      res.json({ success: true, data: locks })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch locks' })
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const lock = await prisma.lock.findUnique({
        where: { id },
        include: {
          address: { include: { city: true } }
        }
      })
      if (!lock) return res.status(404).json({ success: false, error: 'Lock not found' })

      // scope enforcement: non-super-admin cannot access lock from other city
      const actor = (req as any).user
      if (actor?.role !== 'SUPER_ADMIN') {
        const actorCityId = actor?.cityId
        const lockCityId = (lock as any).address?.cityId
        if (actorCityId && lockCityId && actorCityId !== lockCityId) {
          return res.status(403).json({ success: false, error: 'Insufficient scope' })
        }
      }

      res.json({ success: true, data: lock })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch lock' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, isActive } = req.body as { name?: string; isActive?: boolean }

      const existing = await prisma.lock.findUnique({
        where: { id },
        include: { address: { select: { cityId: true } } }
      })
      if (!existing) return res.status(404).json({ success: false, error: 'Lock not found' })

      const actor = (req as any).user
      if (actor?.role !== 'SUPER_ADMIN') {
        const actorCityId = actor?.cityId
        const lockCityId = (existing as any).address?.cityId
        if (actorCityId && lockCityId && actorCityId !== lockCityId) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to update lock' })
        }
      }

      const updated = await prisma.lock.update({
        where: { id },
        data: {
          ...(typeof name === 'string' ? { name } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
        include: { address: { include: { city: true } } }
      })

      res.json({ success: true, data: updated, message: 'Lock updated' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update lock' })
    }
  }

  async ping(req: Request, res: Response) {
    try {
      const { id } = req.params
      const existing = await prisma.lock.findUnique({
        where: { id },
        include: { address: { select: { cityId: true } } }
      })
      if (!existing) return res.status(404).json({ success: false, error: 'Lock not found' })

      const actor = (req as any).user
      if (actor?.role !== 'SUPER_ADMIN') {
        const actorCityId = actor?.cityId
        const lockCityId = (existing as any).address?.cityId
        if (actorCityId && lockCityId && actorCityId !== lockCityId) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to ping lock' })
        }
      }

      const updated = await prisma.lock.update({
        where: { id },
        data: { lastSeen: new Date(), isOnline: true },
        include: { address: { include: { city: true } } }
      })
      res.json({ success: true, data: updated, message: 'Lock pinged' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to ping lock' })
    }
  }
}

export default new LockController()
