import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import TenantSecurityAuditService from '../services/tenantSecurityAudit.service'
import logger from '../lib/logger'

const prisma = new PrismaClient()

/**
 * Tenant Boundary Validation Middleware
 * Ensures users can only access resources within their tenant scope
 */

export interface TenantValidationOptions {
  // Resource type being accessed
  resourceType: 'user' | 'asset' | 'project' | 'city' | 'projectCity' | 'access' | 'custom'
  // How to extract resource ID from request
  resourceIdParam?: string // e.g., 'userId', 'lockId', 'accessLogId'
  resourceIdBody?: string  // e.g., for POST requests
  // Custom validation function
  customValidator?: (req: Request, userProjectCityId: string) => Promise<boolean>
  // Allow cross-tenant read access (for admins)
  allowCrossTenantRead?: boolean
}

/**
 * Main tenant boundary validation middleware factory
 */
export function validateTenantBoundary(options: TenantValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user context
      const user = req.user
      if (!user?.projectCityId) {
        await TenantSecurityAuditService.logSecurityViolation(req, 'MISSING_TENANT_CONTEXT', {
          resourceType: options.resourceType,
          reason: 'User has no tenant context'
        })
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'User tenant context required' 
        })
      }

      const userProjectCityId = user.projectCityId

      // Handle different resource types
      let isValid = false
      let resourceId: string | undefined

      switch (options.resourceType) {
        case 'user':
          resourceId = req.params[options.resourceIdParam || 'userId'] || req.body[options.resourceIdBody || 'userId']
          if (resourceId) {
            isValid = await validateUserAccess(resourceId, userProjectCityId)
          }
          break

        case 'asset': // This maps to Lock in our schema
          resourceId = req.params[options.resourceIdParam || 'lockId'] || req.body[options.resourceIdBody || 'lockId']
          if (resourceId) {
            isValid = await validateLockAccess(resourceId, userProjectCityId)
          }
          break

        case 'access': // This maps to AccessLog in our schema
          resourceId = req.params[options.resourceIdParam || 'accessLogId'] || req.body[options.resourceIdBody || 'accessLogId']
          if (resourceId) {
            isValid = await validateAccessLogAccess(resourceId, userProjectCityId)
          }
          break

        case 'project':
          resourceId = req.params[options.resourceIdParam || 'projectId'] || req.body[options.resourceIdBody || 'projectId']
          if (resourceId) {
            isValid = await validateProjectAccess(resourceId, userProjectCityId)
          }
          break

        case 'city':
          resourceId = req.params[options.resourceIdParam || 'cityId'] || req.body[options.resourceIdBody || 'cityId']
          if (resourceId) {
            isValid = await validateCityAccess(resourceId, userProjectCityId)
          }
          break

        case 'projectCity':
          resourceId = req.params[options.resourceIdParam || 'projectCityId'] || req.body[options.resourceIdBody || 'projectCityId']
          isValid = resourceId === userProjectCityId
          break

        case 'custom':
          if (options.customValidator) {
            isValid = await options.customValidator(req, userProjectCityId)
            resourceId = 'custom_validation'
          } else {
            throw new Error('Custom validator required for custom resource type')
          }
          break

        default:
          throw new Error(`Unsupported resource type: ${options.resourceType}`)
      }

      // Log access attempt
      await TenantSecurityAuditService.logTenantAccess(req, 
        `${req.method}_${options.resourceType}`, 
        isValid, 
        {
          requestedResource: resourceId,
          userTenant: userProjectCityId,
          requestedTenant: resourceId ? await getResourceTenant(options.resourceType, resourceId) : undefined,
          denialReason: !isValid ? `Cross-tenant ${options.resourceType} access denied` : undefined
        }
      )

      if (!isValid) {
        await TenantSecurityAuditService.logSecurityViolation(req, 'CROSS_TENANT_ACCESS', {
          resourceType: options.resourceType,
          resourceId,
          userTenant: userProjectCityId,
          requestedResource: resourceId
        })

        return res.status(403).json({ 
          error: 'Access denied', 
          message: `You don't have permission to access this ${options.resourceType}` 
        })
      }

      next()

    } catch (error) {
      logger.error('Tenant boundary validation error:', error)
      await TenantSecurityAuditService.logSecurityViolation(req, 'INVALID_TENANT_SCOPE', {
        error: error instanceof Error ? error.message : 'Unknown error',
        resourceType: options.resourceType
      })
      
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Tenant validation failed' 
      })
    }
  }
}

/**
 * Validate user access within tenant boundary
 */
async function validateUserAccess(userId: string, userProjectCityId: string): Promise<boolean> {
  if (!userId) return false
  
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { projectCityId: true }
  })

  return targetUser?.projectCityId === userProjectCityId
}

/**
 * Validate lock access within tenant boundary
 */
async function validateLockAccess(lockId: string, userProjectCityId: string): Promise<boolean> {
  if (!lockId) return false
  
  const lock = await prisma.lock.findUnique({
    where: { id: lockId },
    select: { projectCityId: true }
  })

  return lock?.projectCityId === userProjectCityId
}

/**
 * Validate access log access within tenant boundary
 */
async function validateAccessLogAccess(accessLogId: string, userProjectCityId: string): Promise<boolean> {
  if (!accessLogId) return false
  
  const accessLog = await prisma.accessLog.findUnique({
    where: { id: accessLogId },
    include: {
      user: { select: { projectCityId: true } },
      lock: { select: { projectCityId: true } }
    }
  })

  if (!accessLog) return false

  // Both user and lock must be in the same tenant
  return (!accessLog.user || accessLog.user.projectCityId === userProjectCityId) && 
         accessLog.lock.projectCityId === userProjectCityId
}

/**
 * Validate project access within tenant boundary
 */
async function validateProjectAccess(projectId: string, userProjectCityId: string): Promise<boolean> {
  if (!projectId) return false
  
  const projectCity = await prisma.projectCity.findUnique({
    where: { id: userProjectCityId },
    select: { projectId: true }
  })

  return projectCity?.projectId === projectId
}

/**
 * Validate city access within tenant boundary
 */
async function validateCityAccess(cityName: string, userProjectCityId: string): Promise<boolean> {
  if (!cityName) return false
  
  const projectCity = await prisma.projectCity.findUnique({
    where: { id: userProjectCityId },
    include: { city: true }
  })

  return projectCity?.city.name === cityName
}

/**
 * Get the tenant scope of a resource for logging
 */
async function getResourceTenant(resourceType: string, resourceId: string): Promise<string | undefined> {
  if (!resourceId) return undefined

  try {
    switch (resourceType) {
      case 'user': {
        const user = await prisma.user.findUnique({ 
          where: { id: resourceId }, 
          select: { projectCityId: true } 
        })
        return user?.projectCityId || undefined
      }

      case 'asset': {
        const lock = await prisma.lock.findUnique({ 
          where: { id: resourceId }, 
          select: { projectCityId: true } 
        })
        return lock?.projectCityId || undefined
      }

      case 'access': {
        const accessLog = await prisma.accessLog.findUnique({ 
          where: { id: resourceId }, 
          select: { projectCityId: true } 
        })
        return accessLog?.projectCityId || undefined
      }

      case 'projectCity':
        return resourceId

      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

// Convenience middleware functions for common scenarios
export const validateUserBoundary = validateTenantBoundary({ 
  resourceType: 'user', 
  resourceIdParam: 'userId' 
})

export const validateLockBoundary = validateTenantBoundary({ 
  resourceType: 'asset', // maps to lock
  resourceIdParam: 'lockId' 
})

export const validateAccessLogBoundary = validateTenantBoundary({ 
  resourceType: 'access', // maps to accessLog
  resourceIdParam: 'accessLogId' 
})