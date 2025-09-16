import prisma from '../lib/prisma'
import { CreateRFIDKeyRequest, RFIDKey } from '../types'

class RFIDService {
  async list(userId?: string): Promise<RFIDKey[]> {
    const where: any = {}
    if (userId) where.userId = userId
    const keys = await prisma.rFIDKey.findMany({ where, include: { user: true }, orderBy: { issuedAt: 'desc' } })
    return keys as RFIDKey[]
  }

  async create(data: CreateRFIDKeyRequest): Promise<RFIDKey> {
    const { cardId, name, userId, expiresAt } = data
    const existing = await prisma.rFIDKey.findUnique({ where: { cardId } })
    if (existing) {
      throw new Error('RFID card ID already exists')
    }
    const created = await prisma.rFIDKey.create({ data: { cardId, name, userId, expiresAt } })
    return created as RFIDKey
  }

  async update(id: string, patch: Partial<Pick<RFIDKey, 'name' | 'isActive' | 'expiresAt'>>): Promise<RFIDKey> {
    const updated = await prisma.rFIDKey.update({ where: { id }, data: patch })
    return updated as RFIDKey
  }
}

export default new RFIDService()
