import { Request, Response } from 'express'
import * as Prisma from '@prisma/client'

const prisma = new (Prisma as any).PrismaClient()

class LockController {
  async list(req: Request, res: Response) {
    try {
      const locks = await prisma.lock.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          lockType: true,
          isActive: true,
          address: {
            select: { street: true, number: true, zipCode: true, city: { select: { name: true } } }
          }
        }
      })
      res.json({ success: true, data: locks })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch locks' })
    }
  }
}

export default new LockController()
