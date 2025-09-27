import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { addressScopeWhere } from '../lib/scope'

class AddressController {
  // GET /api/address - List all addresses with counts
  async list(req: Request, res: Response) {
    try {
      const { page: pageRaw, limit: limitRaw, search } = req.query as { 
        page?: string
        limit?: string
        search?: string 
      }

      const page = Math.max(parseInt(String(pageRaw || 1), 10) || 1, 1)
      const limit = Math.min(Math.max(parseInt(String(limitRaw || 50), 10) || 50, 1), 1000)
      const offset = (page - 1) * limit

      // Apply tenant scope filtering
      const scopeWhere = addressScopeWhere(req) || {}
      
      // Add search filter if provided
      const where: any = { ...scopeWhere }
      if (search) {
        where.OR = [
          { street: { contains: search, mode: 'insensitive' } },
          { number: { contains: search, mode: 'insensitive' } },
          { city: { name: { contains: search, mode: 'insensitive' } } }
        ]
      }

      // Get addresses with counts
      const [total, addresses] = await Promise.all([
        prisma.address.count({ where }),
        prisma.address.findMany({
          where,
          orderBy: [
            { city: { name: 'asc' } },
            { street: 'asc' },
            { number: 'asc' }
          ],
          skip: offset,
          take: limit,
          include: {
            city: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                locations: true
              }
            }
          }
        })
      ])

      // For now, just return addresses with basic counts to avoid SQL issues
      // TODO: Re-implement user and key counts with safer queries
      const addressesWithCounts = addresses.map((addr: any) => ({
        ...addr,
        _count: {
          ...addr._count,
          users: 0, // TODO: Implement user count
          keys: 0   // TODO: Implement key count
        }
      }))

      const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

      return res.status(200).json({
        success: true,
        data: addressesWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to list addresses' 
      })
    }
  }

  // GET /api/address/:id - Get specific address with details
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string }

      // Apply tenant scope filtering
      const scopeWhere = addressScopeWhere(req) || {}

      const address = await prisma.address.findFirst({
        where: {
          id,
          ...scopeWhere
        },
        include: {
          city: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              locations: true
            }
          }
        }
      })

      if (!address) {
        return res.status(404).json({
          success: false,
          error: 'Address not found'
        })
      }

      // Get user count for this address through permissions (via locations)
      const userCount = await prisma.$queryRaw<Array<{ userCount: number }>>`
        SELECT 
          COUNT(DISTINCT up."userId")::integer as "userCount"
        FROM "locations" loc
        LEFT JOIN "locks" l ON l."locationId" = loc.id
        LEFT JOIN "user_permissions" up ON l.id = up."lockId" AND up."canAccess" = true
        WHERE loc."addressId" = ${id}
      `

      const addressWithCounts = {
        ...address,
        _count: {
          ...address._count,
          users: userCount[0]?.userCount || 0
        }
      }

      return res.status(200).json({
        success: true,
        data: addressWithCounts
      })
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get address'
      })
    }
  }
}

export default new AddressController()