import { Router } from 'express'
import * as Prisma from '@prisma/client'

const prisma = new (Prisma as any).PrismaClient()
const router = Router()

// GET /api/city - list active cities
router.get('/', async (_req, res) => {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true, country: 'Netherlands' },
      orderBy: { name: 'asc' }
    })
    res.json({ success: true, data: cities })
  } catch (_error) {
    res.status(500).json({ success: false, error: 'Failed to load cities' })
  }
})

export default router
