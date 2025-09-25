import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getEffectiveProjectCityId } from '../lib/scope'

class LockController {
  async list(req: Request, res: Response) {
    try {
      const activeOnlyRaw = (req.query.activeOnly as string | undefined)
      const activeOnly = activeOnlyRaw === undefined ? true : !(String(activeOnlyRaw).toLowerCase() === 'false')

      // Apply project-city scoping
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const where: any = {}
      
      if (activeOnly) where.isActive = true
      
      // Apply tenant scoping - only show locks for user's project-city
      if (effectiveProjectCityId) {
        where.projectCityId = effectiveProjectCityId
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
          projectCityId: true,
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
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      
      const where: any = { id }
      if (effectiveProjectCityId) {
        where.projectCityId = effectiveProjectCityId
      }

      const lock = await prisma.lock.findUnique({
        where,
        include: {
          address: { include: { city: true } }
        }
      })
      
      if (!lock) {
        return res.status(404).json({ success: false, error: 'Lock not found' })
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
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const where: any = { id }
      if (effectiveProjectCityId) {
        where.projectCityId = effectiveProjectCityId
      }

      const existing = await prisma.lock.findUnique({
        where,
        include: { address: { select: { cityId: true } } }
      })
      
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Lock not found' })
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
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      const where: any = { id }
      if (effectiveProjectCityId) {
        where.projectCityId = effectiveProjectCityId
      }

      const existing = await prisma.lock.findUnique({
        where,
        include: { address: { select: { cityId: true } } }
      })
      
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Lock not found' })
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

  async getAvailableForUser(req: Request, res: Response) {
    try {
      const { userId } = req.query
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, error: 'userId is required' })
      }

      // Verify the user exists and is in the same project-city (for non-admins)
      const actor = (req as any).user
      if (actor?.role !== 'ADMIN') {
        const targetUser = await prisma.user.findUnique({ 
          where: { id: userId }, 
          select: { projectCityId: true } 
        })
        if (!targetUser || (effectiveProjectCityId && targetUser.projectCityId !== effectiveProjectCityId)) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to view locks for this user' })
        }
      }

      // Get locks that the user doesn't have permissions for
      const availableLocks = await prisma.lock.findMany({
        where: {
          isActive: true,
          ...(effectiveProjectCityId ? { projectCityId: effectiveProjectCityId } : {}),
          NOT: {
            permissions: {
              some: {
                userId: userId,
                canAccess: true
              }
            }
          }
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          lockType: true,
          isActive: true,
          isOnline: true,
          address: {
            select: { 
              street: true, 
              number: true, 
              zipCode: true, 
              city: { 
                select: { id: true, name: true } 
              } 
            }
          }
        }
      })

      res.json({ success: true, data: availableLocks })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch available locks' })
    }
  }
}

export default new LockController()
