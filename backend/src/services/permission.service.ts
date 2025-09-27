import * as Prisma from '@prisma/client'
import { CreatePermissionRequest, UserPermission } from '../types'

const prisma = new (Prisma as any).PrismaClient()

class PermissionService {
  async getUserProjectCity(userId: string): Promise<string | null> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { projectCityId: true } })
    return u?.projectCityId ?? null
  }

  async getLockProjectCity(lockId: string): Promise<string | null> {
    const l = await prisma.lock.findUnique({ where: { id: lockId }, select: { location: { select: { address: { select: { projectCityId: true } } } } } })
    return l?.location?.address?.projectCityId ?? null
  }

  async getPermissionProjectCities(id: string): Promise<{ userProjectCityId: string | null; lockProjectCityId: string | null }> {
    const p = await prisma.userPermission.findUnique({
      where: { id },
      select: { user: { select: { projectCityId: true } }, lock: { select: { location: { select: { address: { select: { projectCityId: true } } } } } } }
    })
    return { userProjectCityId: p?.user?.projectCityId ?? null, lockProjectCityId: p?.lock?.location?.address?.projectCityId ?? null }
  }
  async list(userId?: string, lockId?: string, projectCityId?: string): Promise<UserPermission[]> {
    const where: any = {}
    if (userId) where.userId = userId
    if (lockId) where.lockId = lockId
    if (projectCityId) {
      where.AND = [
        { user: { projectCityId } },
        { lock: { location: { address: { projectCityId } } } }
      ]
    }
    const items = await prisma.userPermission.findMany({
      where,
      include: { user: true, lock: { include: { location: { include: { address: { include: { city: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    })
    return items as UserPermission[]
  }

  async assign(data: CreatePermissionRequest): Promise<UserPermission> {
    const { userId, lockId, validFrom, validTo, canAccess = true } = data
    
    // Validate tenant isolation before assignment
    await this.validateTenantIsolation(userId, lockId)
    
    // Calculate 12-hour expiry from now (all permissions must expire)
    const now = new Date()
    const mandatoryValidTo = new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 hours from now
    
    // Get user's projectCityId for setting on permission
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { projectCityId: true }
    })
    
    const existing = await prisma.userPermission.findUnique({ where: { userId_lockId: { userId, lockId } } })
    if (existing) {
      // Update existing permission - always apply 12-hour expiry
      const updated = await prisma.userPermission.update({
        where: { userId_lockId: { userId, lockId } },
        data: { 
          canAccess, 
          validFrom: validFrom ?? existing.validFrom, 
          validTo: validTo ?? mandatoryValidTo,
          projectCityId: user?.projectCityId
        }
      })
      return updated as UserPermission
    }
    
    // Create new permission - always with 12-hour expiry
    const created = await prisma.userPermission.create({
      data: { 
        userId, 
        lockId, 
        canAccess, 
        validFrom: validFrom ?? now, 
        validTo: validTo ?? mandatoryValidTo,
        projectCityId: user?.projectCityId
      }
    })
    return created as UserPermission
  }

  private async validateTenantIsolation(userId: string, lockId: string): Promise<void> {
    // Get user and lock with their tenant scope
    const [user, lock] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, projectCityId: true }
      }),
      prisma.lock.findUnique({
        where: { id: lockId },
        select: { 
          id: true, 
          projectCityId: true,
          location: {
            select: { 
              id: true, 
              projectCityId: true,
              address: { select: { projectCityId: true } }
            }
          }
        }
      })
    ])

    if (!user) {
      throw new Error('User not found')
    }

    if (!lock) {
      throw new Error('Lock not found')
    }

    // Validate that user and lock belong to same tenant
    if (user.projectCityId && lock.projectCityId && user.projectCityId !== lock.projectCityId) {
      throw new Error('Cannot assign permissions across different organization scopes')
    }

    // Also validate location hierarchy
    if (user.projectCityId && lock.location.projectCityId && user.projectCityId !== lock.location.projectCityId) {
      throw new Error('Cannot assign permissions for locks in locations outside your organization scope')
    }
  }

  async update(id: string, patch: Partial<Pick<UserPermission, 'canAccess' | 'validFrom' | 'validTo'>>): Promise<UserPermission> {
    const updated = await prisma.userPermission.update({ where: { id }, data: patch })
    return updated as UserPermission
  }

  async revoke(id: string): Promise<void> {
    await prisma.userPermission.delete({ where: { id } })
  }
}

export default new PermissionService()
