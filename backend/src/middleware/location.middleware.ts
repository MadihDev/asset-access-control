import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { getEffectiveProjectCityId } from '../lib/scope'

/**
 * Middleware to validate location-based access control
 */

/**
 * Ensure that the location name is unique within the address scope
 */
export const validateLocationNameUniqueness = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, addressId } = req.body
    const locationId = req.params.locationId

    if (!name || !addressId) {
      next()
      return
    }

    // Check for existing location with same name at the same address
    const existingLocation = await prisma.location.findFirst({
      where: {
        name,
        addressId,
        ...(locationId ? { NOT: { id: locationId } } : {})
      }
    })

    if (existingLocation) {
      res.status(400).json({
        success: false,
        error: 'A location with this name already exists at this address'
      })
      return
    }

    next()
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate location name uniqueness'
    })
  }
}

/**
 * Validate that locks can only be assigned to locations within the same tenant scope
 */
export const validateLockAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { locationId } = req.body
    const lockId = req.params.lockId
    const projectCityId = getEffectiveProjectCityId(req)

    if (!locationId) {
      next()
      return
    }

    // Verify location exists and belongs to user's tenant
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, projectCityId: true, address: { select: { projectCityId: true } } }
    })

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found'
      })
      return
    }

    // Check tenant isolation - location must belong to user's project-city
    if (projectCityId && location.projectCityId !== projectCityId) {
      res.status(403).json({
        success: false,
        error: 'Cannot assign lock to location outside your organization scope'
      })
      return
    }

    // For existing locks, verify current lock belongs to same tenant
    if (lockId) {
      const currentLock = await prisma.lock.findUnique({
        where: { id: lockId },
        select: { projectCityId: true }
      })

      if (currentLock && projectCityId && currentLock.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Cannot modify lock outside your organization scope'
        })
        return
      }
    }

    next()
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate lock assignment'
    })
  }
}

/**
 * Validate permission assignments follow location hierarchy
 */
export const validatePermissionAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, lockId } = req.body
    const projectCityId = getEffectiveProjectCityId(req)

    if (!userId || !lockId) {
      next()
      return
    }

    // Get user and lock with their tenant scope
    const [user, lock] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, projectCityId: true }
      }),
      prisma.lock.findUnique({
        where: { id: lockId },
        select: { 
          id: true, 
          projectCityId: true,
          location: {
            select: { 
              id: true, 
              projectCityId: true,
              address: { select: { projectCityId: true } }
            }
          }
        }
      })
    ])

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    if (!lock) {
      res.status(404).json({
        success: false,
        error: 'Lock not found'
      })
      return
    }

    // Validate tenant isolation
    if (projectCityId) {
      // User must belong to same tenant
      if (user.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Cannot assign permissions to users outside your organization scope'
        })
        return
      }

      // Lock must belong to same tenant
      if (lock.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Cannot assign permissions for locks outside your organization scope'
        })
        return
      }

      // Location must belong to same tenant
      if (lock.location.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Cannot assign permissions for locations outside your organization scope'
        })
        return
      }
    }

    next()
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate permission assignment'
    })
  }
}

/**
 * Ensure user can only access locations within their tenant scope
 */
export const requireLocationAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const locationId = req.params.locationId || req.params.id
    const projectCityId = getEffectiveProjectCityId(req)

    if (!locationId) {
      res.status(400).json({
        success: false,
        error: 'Location ID is required'
      })
      return
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, projectCityId: true }
    })

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found'
      })
      return
    }

    // Enforce tenant isolation
    if (projectCityId && location.projectCityId !== projectCityId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Location outside your organization scope'
      })
      return
    }

    next()
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate location access'
    })
  }
}

/**
 * Ensure user can only access locks within their tenant scope through location hierarchy
 */
export const requireLockAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lockId = req.params.lockId || req.params.id
    const projectCityId = getEffectiveProjectCityId(req)

    if (!lockId) {
      res.status(400).json({
        success: false,
        error: 'Lock ID is required'
      })
      return
    }

    const lock = await prisma.lock.findUnique({
      where: { id: lockId },
      select: { 
        id: true, 
        projectCityId: true,
        location: {
          select: { 
            projectCityId: true,
            address: { select: { projectCityId: true } }
          }
        }
      }
    })

    if (!lock) {
      res.status(404).json({
        success: false,
        error: 'Lock not found'
      })
      return
    }

    // Enforce tenant isolation at multiple levels
    if (projectCityId) {
      if (lock.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Lock outside your organization scope'
        })
        return
      }

      if (lock.location.projectCityId !== projectCityId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Lock location outside your organization scope'
        })
        return
      }
    }

    next()
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate lock access'
    })
  }
}