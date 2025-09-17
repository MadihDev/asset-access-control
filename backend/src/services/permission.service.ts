import * as Prisma from '@prisma/client'
import { CreatePermissionRequest, UserPermission } from '../types'

const prisma = new (Prisma as any).PrismaClient()

class PermissionService {
  async getUserCity(userId: string): Promise<string | null> {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { cityId: true } })
    return u?.cityId ?? null
  }

  async getLockCity(lockId: string): Promise<string | null> {
    const l = await prisma.lock.findUnique({ where: { id: lockId }, select: { address: { select: { cityId: true } } } })
    return l?.address?.cityId ?? null
  }

  async getPermissionCities(id: string): Promise<{ userCityId: string | null; lockCityId: string | null }> {
    const p = await prisma.userPermission.findUnique({
      where: { id },
      select: { user: { select: { cityId: true } }, lock: { select: { address: { select: { cityId: true } } } } }
    })
    return { userCityId: p?.user?.cityId ?? null, lockCityId: p?.lock?.address?.cityId ?? null }
  }
  async list(userId?: string, lockId?: string, cityId?: string): Promise<UserPermission[]> {
    const where: any = {}
    if (userId) where.userId = userId
    if (lockId) where.lockId = lockId
    if (cityId) {
      where.AND = [
        { user: { cityId } },
        { lock: { address: { cityId } } }
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
    const existing = await prisma.userPermission.findUnique({ where: { userId_lockId: { userId, lockId } } })
    if (existing) {
      // Update existing link
      const updated = await prisma.userPermission.update({
        where: { userId_lockId: { userId, lockId } },
        data: { canAccess, validFrom: validFrom ?? existing.validFrom, validTo: validTo ?? existing.validTo }
      })
      return updated as UserPermission
    }
    const created = await prisma.userPermission.create({
      data: { userId, lockId, canAccess, validFrom: validFrom ?? new Date(), validTo }
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
