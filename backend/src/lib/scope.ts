import { Request } from 'express'
import { UserRole } from '../types'

/**
 * Get the effective project-city scope for a request.
 * All users are scoped to their project-city for perfect tenant isolation.
 */
export function getEffectiveProjectCityId(req: Request): string | undefined {
  const user = (req as any).user as { role: UserRole; projectCityId?: string } | undefined
  return user?.projectCityId || undefined
}

/**
 * Build a tenant-aware filter on AccessLog using project-city scoping.
 */
export function accessLogScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) {
    return { projectCityId }
  }
  return undefined
}

/**
 * Build a strict tenant-aware filter for AccessLog that enforces both 
 * access log projectCityId AND lock projectCityId match the user's scope.
 * This prevents cross-project data leakage.
 */
export function accessLogStrictScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) {
    return {
      AND: [
        { projectCityId }, // Access log must belong to user's project
        { lock: { projectCityId } } // Lock must also belong to user's project
      ]
    }
  }
  return undefined
}

/**
 * Build a tenant-aware filter for Address.
 */
export function addressScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) return { projectCityId }
  return undefined
}

/**
 * Build a tenant-aware filter for Lock.
 * Locks are scoped through both direct projectCityId and location hierarchy.
 */
export function lockScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) {
    return {
      OR: [
        // Direct projectCityId on lock
        { projectCityId },
        // Through location->address->projectCityId (backup)
        { location: { address: { projectCityId } } }
      ]
    }
  }
  return undefined
}

/**
 * Build a tenant-aware filter for User.
 */
export function userScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) return { projectCityId }
  return undefined
}

/**
 * Build a tenant-aware filter for Location.
 * Locations are scoped through both direct projectCityId and address hierarchy.
 */
export function locationScopeWhere(req: Request): any | undefined {
  const projectCityId = getEffectiveProjectCityId(req)
  if (projectCityId) {
    return {
      OR: [
        // Direct projectCityId on location
        { projectCityId },
        // Through address->projectCityId (backup)
        { address: { projectCityId } }
      ]
    }
  }
  return undefined
}
