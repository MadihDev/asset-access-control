import * as Prisma from '@prisma/client'
import { CreatePermissionRequest, UserPermission } from '../types'

const prisma = new (Prisma as any).PrismaClient()

class PermissionService {
  async getUserProjectCity(userId: string): Promise<string | null> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { projectCityId: true } })
    return u?.projectCityId ?? null
  }

  async getLockProjectCity(lockId: string): Promise<string | null> {
    const l = await prisma.lock.findUnique({ where: { id: lockId }, select: { address: { select: { projectCityId: true } } } })
    return l?.address?.projectCityId ?? null
  }

  async getPermissionProjectCities(id: string): Promise<{ userProjectCityId: string | null; lockProjectCityId: string | null }> {
    const p = await prisma.userPermission.findUnique({
      where: { id },
      select: { user: { select: { projectCityId: true } }, lock: { select: { address: { select: { projectCityId: true } } } } }
    })
    return { userProjectCityId: p?.user?.projectCityId ?? null, lockProjectCityId: p?.lock?.address?.projectCityId ?? null }
  }
  async list(userId?: string, lockId?: string, projectCityId?: string): Promise<UserPermission[]> {
    const where: any = {}
    if (userId) where.userId = userId
    if (lockId) where.lockId = lockId
    if (projectCityId) {
      where.AND = [
        { user: { projectCityId } },
        { lock: { address: { projectCityId } } }
      ]
    }
    const items = await prisma.userPermission.findMany({
      where,
      include: { user: true, lock: { include: { address: { include: { city: true } } } } },
      orderBy: { createdAt: 'desc' }
    })
    return items as UserPermission[]
  }

  async assign(data: CreatePermissionRequest): Promise<UserPermission> {
    const { userId, lockId, validFrom, validTo, canAccess = true } = data
    
    // Calculate 12-hour expiry from now (all permissions must expire)
    const now = new Date()
    const mandatoryValidTo = new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 hours from now
    
    const existing = await prisma.userPermission.findUnique({ where: { userId_lockId: { userId, lockId } } })
    if (existing) {
      // Update existing permission - always apply 12-hour expiry
      const updated = await prisma.userPermission.update({
        where: { userId_lockId: { userId, lockId } },
        data: { 
          canAccess, 
          validFrom: validFrom ?? existing.validFrom, 
          validTo: validTo ?? mandatoryValidTo 
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
        validTo: validTo ?? mandatoryValidTo 
      }
    })
    return created as UserPermission
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
