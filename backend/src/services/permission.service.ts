import * as Prisma from '@prisma/client'
import { CreatePermissionRequest, UserPermission } from '../types'

const prisma = new (Prisma as any).PrismaClient()

class PermissionService {
  async list(userId?: string, lockId?: string): Promise<UserPermission[]> {
    const where: any = {}
    if (userId) where.userId = userId
    if (lockId) where.lockId = lockId
    const items = await prisma.userPermission.findMany({
      where,
      include: { user: true, lock: true },
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
