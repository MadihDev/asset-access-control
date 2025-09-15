import * as Prisma from '@prisma/client'
import { User, CreateUserRequest, UpdateUserRequest, UserQuery, PaginatedResponse } from '../types'
import bcrypt from 'bcryptjs'

const prisma = new (Prisma as any).PrismaClient()

class UserService {
  async createUser(userData: CreateUserRequest): Promise<User> {
    const { email, username, password, ...rest } = userData

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      throw new Error('User with this email or username already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'))

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        ...rest
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        rfidKeys: true,
        permissions: {
          include: {
            lock: {
              include: {
                address: {
                  include: {
                    city: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return null
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return null
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }

  async updateUser(id: string, updateData: UpdateUserRequest): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if email or username is being changed and already exists
    if (updateData.email || updateData.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateData.email ? { email: updateData.email } : {},
                updateData.username ? { username: updateData.username } : {}
              ]
            }
          ]
        }
      })

      if (existingUser) {
        throw new Error('User with this email or username already exists')
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    })

    const { password: _, ...userWithoutPassword } = updatedUser
    return userWithoutPassword as User
  }

  async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // In a production system, you might want to soft delete
    // For now, we'll set isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })
  }

  async getAllUsers(query: UserQuery): Promise<PaginatedResponse<User>> {
    const allowedSortFields = new Set(['createdAt', 'firstName', 'lastName', 'email', 'username', 'role'])
    const allowedSortOrders = new Set(['asc', 'desc'])

    const pageNum = (() => {
      const p = typeof query.page === 'string' ? parseInt(query.page, 10) : (typeof query.page === 'number' ? query.page : 1)
      return Number.isFinite(p) && p > 0 ? p : 1
    })()

    const limitNum = (() => {
      const l = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (typeof query.limit === 'number' ? query.limit : 10)
      const n = Number.isFinite(l) && l > 0 ? l : 10
      return Math.min(n, 1000)
    })()

    const sortField = (typeof query.sortBy === 'string' && allowedSortFields.has(query.sortBy)) ? query.sortBy : 'createdAt'
    const sortDir: 'asc' | 'desc' = (typeof query.sortOrder === 'string' && allowedSortOrders.has(query.sortOrder)) ? (query.sortOrder as 'asc' | 'desc') : 'desc'

    const { role, search } = query
    let isActiveParsed: boolean | undefined
    const rawIsActive = (query as any).isActive as unknown
    if (typeof rawIsActive === 'boolean') {
      isActiveParsed = rawIsActive
    } else if (typeof rawIsActive === 'string') {
      const v = rawIsActive.toLowerCase()
      if (v === 'true' || v === '1') isActiveParsed = true
      else if (v === 'false' || v === '0') isActiveParsed = false
    }

    const skip = (pageNum - 1) * limitNum
    const where: any = {}

    if (role) {
      where.role = role
    }

    if (isActiveParsed !== undefined) {
      where.isActive = isActiveParsed
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortDir },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      }),
      prisma.user.count({ where })
    ])

    return {
      data: users as User[],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }
  }

  async getUsersWithPermissions(): Promise<Array<User & { permissionCount: number }>> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          where: {
            canAccess: true,
            OR: [
              { validTo: null },
              { validTo: { gte: new Date() } }
            ]
          }
        }
      },
      orderBy: { firstName: 'asc' }
    })

  return users.map((user: any) => {
      const { password: _, permissions, ...userWithoutPassword } = user
      return {
        ...userWithoutPassword,
        permissionCount: permissions.length
      } as User & { permissionCount: number }
    })
  }

  async getUserStats(userId: string): Promise<{
    totalAccessAttempts: number
    successfulAccess: number
    failedAccess: number
    activePermissions: number
    lastAccess?: Date
  }> {
  const [accessLogs, permissions] = await Promise.all([
      prisma.accessLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.userPermission.count({
        where: {
          userId,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      })
    ])

  const successfulAccess = accessLogs.filter((log: any) => log.result === 'GRANTED').length
    const failedAccess = accessLogs.length - successfulAccess
    const lastAccess = accessLogs.length > 0 ? accessLogs[0].timestamp : undefined

    return {
      totalAccessAttempts: accessLogs.length,
      successfulAccess,
      failedAccess,
      activePermissions: permissions,
      lastAccess
    }
  }
}

export default new UserService()