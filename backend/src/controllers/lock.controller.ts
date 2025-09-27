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
          location: {
            select: { id: true, name: true, description: true, address: { select: { street: true, number: true, zipCode: true, city: { select: { id: true, name: true } } } } }
          }
        }
      })
      res.json({ success: true, data: locks })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch locks' })
    }
  }

  async getTree(req: Request, res: Response) {
    try {
      const activeOnlyRaw = (req.query.activeOnly as string | undefined)
      const activeOnly = activeOnlyRaw === undefined ? true : !(String(activeOnlyRaw).toLowerCase() === 'false')

      // Apply project-city scoping
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      
      // Get all addresses with their locations and locks in a hierarchical structure
      const addresses = await prisma.address.findMany({
        where: {
          ...(effectiveProjectCityId ? { projectCityId: effectiveProjectCityId } : {}),
          locations: {
            some: {
              locks: {
                some: activeOnly ? { isActive: true } : {}
              }
            }
          }
        },
        orderBy: [{ street: 'asc' }, { number: 'asc' }],
        select: {
          id: true,
          street: true,
          number: true,
          zipCode: true,
          city: {
            select: { id: true, name: true }
          },
          locations: {
            where: {
              locks: {
                some: activeOnly ? { isActive: true } : {}
              }
            },
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              locks: {
                where: activeOnly ? { isActive: true } : {},
                orderBy: { name: 'asc' },
                select: {
                  id: true,
                  name: true,
                  lockType: true,
                  isActive: true,
                  isOnline: true,
                  lastSeen: true,
                  projectCityId: true
                }
              }
            }
          }
        }
      })

      // Transform data to include counts and summaries
      const treeData = addresses.map((address: any) => {
        const locations = address.locations.map((location: any) => {
          const totalLocks = location.locks.length
          const onlineLocks = location.locks.filter((lock: any) => lock.isOnline).length
          const activeLocks = location.locks.filter((lock: any) => lock.isActive).length
          
          return {
            ...location,
            counts: {
              total: totalLocks,
              online: onlineLocks,
              offline: totalLocks - onlineLocks,
              active: activeLocks,
              inactive: totalLocks - activeLocks
            }
          }
        })

        const totalLocks = locations.reduce((sum: number, loc: any) => sum + loc.counts.total, 0)
        const onlineLocks = locations.reduce((sum: number, loc: any) => sum + loc.counts.online, 0)
        const activeLocks = locations.reduce((sum: number, loc: any) => sum + loc.counts.active, 0)

        return {
          ...address,
          locations,
          counts: {
            total: totalLocks,
            online: onlineLocks,
            offline: totalLocks - onlineLocks,
            active: activeLocks,
            inactive: totalLocks - activeLocks,
            locations: locations.length
          }
        }
      })

      res.json({ success: true, data: treeData })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch lock tree' })
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
          location: { include: { address: { include: { city: true } } } }
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
        include: { location: { select: { addressId: true, address: { select: { cityId: true } } } } }
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
        include: { location: { include: { address: { include: { city: true } } } } }
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
        include: { location: { select: { addressId: true, address: { select: { cityId: true } } } } }
      })
      
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Lock not found' })
      }

      const updated = await prisma.lock.update({
        where: { id },
        data: { lastSeen: new Date(), isOnline: true },
        include: { location: { include: { address: { include: { city: true } } } } }
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
          location: {
            select: { 
              id: true,
              name: true,
              description: true,
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
          }
        }
      })

      res.json({ success: true, data: availableLocks })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch available locks' })
    }
  }

  // POST /api/lock - Create new lock
  async create(req: Request, res: Response) {
    try {
      const { name, description, deviceId, secretKey, lockType, locationId } = req.body
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // Verify location exists and is accessible
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          ...(effectiveProjectCityId ? { address: { projectCityId: effectiveProjectCityId } } : {})
        },
        include: {
          address: true
        }
      })

      if (!location) {
        return res.status(404).json({
          success: false,
          error: 'Location not found or not accessible'
        })
      }

      const lock = await prisma.lock.create({
        data: {
          name,
          description,
          deviceId: deviceId || `DEVICE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          secretKey: secretKey || Math.random().toString(36).substring(2, 32),
          lockType: lockType || 'DOOR',
          locationId,
          projectCityId: location.address.projectCityId,
          isActive: true,
          isOnline: true
        },
        include: {
          location: {
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

      return res.status(201).json({
        success: true,
        data: lock
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create lock'
      })
    }
  }
}

export default new LockController()
