import { Request } from 'express'
import AuditService from './audit.service'
import logger from '../lib/logger'
import { AuditAction } from '../types'

/**
 * Tenant Security Audit Service
 * Specialized audit logging for multi-tenant security operations
 */
class TenantSecurityAuditService {
  /**
   * Log tenant access attempt
   */
  async logTenantAccess(
    req: Request,
    operation: string,
    success: boolean,
    details: {
      requestedResource?: string
      userTenant?: string
      requestedTenant?: string
      denialReason?: string
    }
  ): Promise<void> {
    try {
      const userId = req.user?.id
      const userAgent = req.get('User-Agent')
      const ipAddress = req.ip

      // Log to standard audit system
      await AuditService.log({
        req,
        action: success ? AuditAction.ACCESS_ATTEMPT : AuditAction.ACCESS_ATTEMPT,
        entityType: 'TenantResource',
        entityId: details.requestedResource || 'unknown',
        userId,
        oldValues: undefined,
        newValues: {
          operation,
          success,
          userTenant: details.userTenant,
          requestedTenant: details.requestedTenant,
          denialReason: details.denialReason,
          userAgent,
          ipAddress
        }
      })

      // Enhanced logging for security analysis
      const logData = {
        timestamp: new Date().toISOString(),
        userId,
        userAgent,
        ipAddress,
        operation,
        success,
        resource: details.requestedResource,
        userTenant: details.userTenant,
        requestedTenant: details.requestedTenant,
        crossTenantAttempt: details.userTenant !== details.requestedTenant,
        denialReason: details.denialReason
      }

      if (success) {
        logger.info('Tenant access granted', logData)
      } else {
        logger.warn('Tenant access denied', logData)
      }

      // Flag suspicious cross-tenant access attempts
      if (details.userTenant && details.requestedTenant && 
          details.userTenant !== details.requestedTenant) {
        logger.error('🚨 SECURITY ALERT: Cross-tenant access attempt detected', {
          ...logData,
          severity: 'HIGH',
          alertType: 'CROSS_TENANT_ACCESS_ATTEMPT'
        })
      }

    } catch (error) {
      logger.error('Failed to log tenant access attempt:', error)
    }
  }

  /**
   * Log tenant data enumeration attempt
   */
  async logTenantEnumeration(
    req: Request,
    operation: string,
    userTenant: string,
    resourcesAccessed: number,
    filteredBySecurity: boolean
  ): Promise<void> {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        operation,
        userTenant,
        resourcesAccessed,
        filteredBySecurity,
        tenantIsolationActive: true
      }

      logger.info('Tenant data enumeration', logData)

      // Log to audit system
      await AuditService.log({
        req,
        action: AuditAction.ACCESS_ATTEMPT,
        entityType: 'TenantData',
        entityId: operation,
        userId: req.user?.id,
        newValues: logData
      })

    } catch (error) {
      logger.error('Failed to log tenant enumeration:', error)
    }
  }

  /**
   * Log tenant validation attempt
   */
  async logTenantValidation(
    req: Request,
    projectId: string,
    cityName: string,
    userTenant: string,
    validationResult: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        operation: 'tenant_validation',
        requestedProject: projectId,
        requestedCity: cityName,
        userTenant,
        validationResult,
        reason
      }

      if (validationResult) {
        logger.info('Tenant validation successful', logData)
      } else {
        logger.warn('Tenant validation failed', logData)
      }

      // Log to audit system
      await AuditService.log({
        req,
        action: AuditAction.ACCESS_ATTEMPT,
        entityType: 'TenantValidation',
        entityId: `${projectId}/${cityName}`,
        userId: req.user?.id,
        newValues: logData
      })

    } catch (error) {
      logger.error('Failed to log tenant validation:', error)
    }
  }

  /**
   * Log security policy violation
   */
  async logSecurityViolation(
    req: Request,
    violationType: 'CROSS_TENANT_ACCESS' | 'UNAUTHORIZED_ENUMERATION' | 'INVALID_TENANT_SCOPE' | 'MISSING_TENANT_CONTEXT',
    details: Record<string, any>
  ): Promise<void> {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        violationType,
        severity: 'CRITICAL',
        ...details
      }

      logger.error('🚨 SECURITY POLICY VIOLATION', logData)

      // Log to audit system with high priority
      await AuditService.log({
        req,
        action: AuditAction.ACCESS_ATTEMPT,
        entityType: 'SecurityViolation',
        entityId: violationType,
        userId: req.user?.id,
        newValues: logData
      })

    } catch (error) {
      logger.error('Failed to log security violation:', error)
    }
  }
}

export default new TenantSecurityAuditService()