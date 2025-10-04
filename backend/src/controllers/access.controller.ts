import { Request, Response } from 'express'
import AccessService from '../services/access.service'
import AuditService from '../services/audit.service'
import { AccessAttemptRequest, AccessLogQuery, AuditAction } from '../types'
import { getEffectiveProjectCityId } from '../lib/scope'

class AccessController {
  async logAccessAttempt(req: Request, res: Response): Promise<void> {
    try {
      const attemptData: AccessAttemptRequest = req.body
      
      // Add device information if authenticated device made the request
      if (req.device) {
        attemptData.deviceInfo = {
          ...attemptData.deviceInfo,
          deviceId: req.device.deviceId,
          deviceType: req.device.deviceType,
          firmwareVersion: req.device.firmwareVersion,
          batteryLevel: req.device.batteryLevel,
          signalStrength: req.device.signalStrength
        }
      }

      const accessLog = await AccessService.logAccessAttempt(attemptData)

      // Return device-friendly response
      const response = {
        success: true,
        data: {
          id: accessLog.id,
          result: accessLog.result,
          timestamp: accessLog.timestamp,
          // Device-specific information
          accessGranted: accessLog.result === 'GRANTED',
          lockAction: accessLog.result === 'GRANTED' ? 'UNLOCK' : 'DENY',
          message: this.getAccessResultMessage(accessLog.result)
        }
      }

      res.status(200).json(response)
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log access attempt'
      })
    }
  }

  private getAccessResultMessage(result: string): string {
    const messages: Record<string, string> = {
      'GRANTED': 'Access granted',
      'DENIED_INVALID_CARD': 'Invalid card',
      'DENIED_EXPIRED_CARD': 'Card expired',
      'DENIED_NO_PERMISSION': 'No permission',
      'DENIED_INACTIVE_USER': 'User inactive',
      'DENIED_INACTIVE_LOCK': 'Lock inactive',
      'DENIED_TIME_RESTRICTION': 'Outside allowed time',
      'ERROR_DEVICE_OFFLINE': 'Device offline',
      'ERROR_SYSTEM_FAILURE': 'System error'
    }
    return messages[result] || 'Access denied'
  }

  async getAccessLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AccessLogQuery = req.query as any
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const result = await AccessService.getAccessLogs({ ...query, projectCityId: effectiveProjectCityId ?? query.projectCityId })

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Access logs retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve access logs'
      })
    }
  }

  async getAccessStats(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe } = req.query
      const validTimeframes = ['day', 'week', 'month']
      const selectedTimeframe = validTimeframes.includes(timeframe as string) 
        ? (timeframe as 'day' | 'week' | 'month') 
        : 'week'

      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const stats = await AccessService.getAccessStats(selectedTimeframe, effectiveProjectCityId)

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Access statistics retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve access statistics'
      })
    }
  }

  async exportAccessLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AccessLogQuery = req.query as any
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      
      // Set a high limit for export
      const exportQuery = { ...query, limit: 10000, page: 1, projectCityId: effectiveProjectCityId ?? query.projectCityId }
      const result = await AccessService.getAccessLogs(exportQuery)
      
      if (!result.data || result.data.length === 0) {
        res.status(200).json({
          success: true,
          data: [],
          message: 'No access logs found for export'
        })
        return
      }

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=access-logs.csv')
      
      // Generate CSV content
      const csvHeaders = [
        'Timestamp',
        'User Name',
        'User Email',
        'Lock Name',
        'Address',
        'City',
        'Access Type',
        'Result',
        'RFID Card'
      ].join(',')
      
      const csvRows = result.data.map((log: any) => [
        log.timestamp.toISOString(),
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
        log.user?.email || 'Unknown',
        log.lock.name,
        `${log.lock.location?.address?.street || ''} ${log.lock.location?.address?.number || ''}`.trim() || 'N/A',
        log.lock.location?.address?.city?.name || 'N/A',
        log.accessType,
        log.result,
        log.rfidKey?.cardId || 'Unknown'
      ].map(field => `"${field}"`).join(','))
      
      const csvContent = [csvHeaders, ...csvRows].join('\n')

      await AuditService.log({ 
        req, 
        action: AuditAction.ACCESS_ATTEMPT, 
        entityType: 'AccessLog', 
        entityId: 'export', 
        newValues: { filters: exportQuery } 
      })
      
      res.status(200).send(csvContent)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export access logs'
      })
    }
  }

  async simulateAccessAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { accessType, result } = req.body
      const user = (req as any).user
      const effectiveProjectCityId = getEffectiveProjectCityId(req)

      // For simulation, we need a specific project-city context
      // If user is ADMIN, use their assigned projectCityId
      // If user has normal scoping, use the effective scoped projectCityId
      let targetProjectCityId = effectiveProjectCityId

      if (!targetProjectCityId && user?.role === 'ADMIN') {
        // ADMIN can simulate in their own assigned project-city
        targetProjectCityId = user.projectCityId
      }

      if (!targetProjectCityId) {
        res.status(400).json({
          success: false,
          error: 'No project city context available for simulation',
          debug: {
            userId: user?.id,
            userRole: user?.role,
            userProjectCityId: user?.projectCityId,
            effectiveProjectCityId,
            suggestion: 'User needs a projectCityId assignment for simulation'
          }
        })
        return
      }

      // Create a simulated access attempt
      const simulatedLog = await AccessService.simulateAccessAttempt({
        accessType: accessType || 'RFID_CARD',
        result: result || 'GRANTED',
        userId: user.id,
        projectCityId: targetProjectCityId
      })

      await AuditService.log({ 
        req, 
        action: AuditAction.ACCESS_ATTEMPT, 
        entityType: 'AccessLog', 
        entityId: simulatedLog.id, 
        newValues: { simulated: true, accessType, result } 
      })

      res.status(200).json({
        success: true,
        data: simulatedLog,
        message: 'Access attempt simulated successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to simulate access attempt',
        details: error instanceof Error ? error.stack : undefined
      })
    }
  }
}

export default new AccessController()