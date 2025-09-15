import { Request, Response } from 'express'
import AccessService from '../services/access.service'
import { AccessAttemptRequest, AccessLogQuery, AuditAction } from '../types'
import AuditService from '../services/audit.service'

class AccessController {
  async logAccessAttempt(req: Request, res: Response): Promise<void> {
    try {
      const attemptData: AccessAttemptRequest = req.body
      const accessLog = await AccessService.logAccessAttempt(attemptData)
      
      res.status(200).json({
        success: true,
        data: accessLog,
        message: 'Access attempt logged successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log access attempt'
      })
    }
  }

  async getAccessLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AccessLogQuery = req.query as any
      const result = await AccessService.getAccessLogs(query)
      
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

      const stats = await AccessService.getAccessStats(selectedTimeframe)
      
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
      
      // Set a high limit for export
      const exportQuery = { ...query, limit: 10000, page: 1 }
      const result = await AccessService.getAccessLogs(exportQuery)
      
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
        `${log.lock.address.street} ${log.lock.address.number}`,
        log.lock.address.city.name,
        log.accessType,
        log.result,
        log.rfidKey?.cardId || 'Unknown'
      ].map(field => `"${field}"`).join(','))
      
  const csvContent = [csvHeaders, ...csvRows].join('\n')

  await AuditService.log({ req, action: AuditAction.ACCESS_ATTEMPT, entityType: 'AccessLog', entityId: 'export', newValues: { filters: exportQuery } })
  res.status(200).send(csvContent)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export access logs'
      })
    }
  }
}

export default new AccessController()