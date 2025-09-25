import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { AuditAction } from '../types'

class AuditController {
  async list(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, action, userId, entityType, startDate, endDate, sortBy = 'timestamp', sortOrder = 'desc' } = req.query as any
      const user = (req as any).user

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1)
      const limitNum = Math.min(1000, Math.max(1, parseInt(String(limit), 10) || 50))
      const skip = (pageNum - 1) * limitNum

      const where: any = {}
      if (action) where.action = action as AuditAction
      if (userId) where.userId = String(userId)
      if (entityType) where.entityType = String(entityType)
      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) where.timestamp.gte = new Date(String(startDate))
        if (endDate) where.timestamp.lte = new Date(String(endDate))
      }

      // Enforce tenant isolation: only show audit logs from users in the same project
      // Since AuditLog doesn't have projectCityId, we filter through user.projectCityId
      where.user = {
        projectCityId: user.projectCityId
      }

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({ 
          where, 
          skip, 
          take: limitNum, 
          orderBy: { [String(sortBy)]: (String(sortOrder) === 'asc' ? 'asc' : 'desc') },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                projectCityId: true
              }
            }
          }
        }),
        prisma.auditLog.count({ where })
      ])

      res.json({
        success: true,
        data: items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch audit logs' })
    }
  }
}

export default new AuditController()
