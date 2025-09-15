import { Request, Response } from 'express'
import prisma from '../lib/prisma'

class DashboardController {
  async overview(_req: Request, res: Response) {
    const [totalUsers, totalLocks, totalAccessAttempts, successfulAccess, recentAccessLogs] = await Promise.all([
      prisma.user.count(),
      prisma.lock.count(),
      prisma.accessLog.count(),
      prisma.accessLog.count({ where: { result: 'GRANTED' } }),
      prisma.accessLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          user: { select: { firstName: true, lastName: true } },
          lock: { select: { name: true } },
        },
      }),
    ])

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalLocks,
        totalAccessAttempts,
        successfulAccess,
        onlineLocks: await prisma.lock.count({ where: { isOnline: true } }),
        recentAccessLogs,
      },
    })
  }
}

export default new DashboardController()
