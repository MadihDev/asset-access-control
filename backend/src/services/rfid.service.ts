import prisma from '../lib/prisma'
import { CreateRFIDKeyRequest, RFIDKey } from '../types'

class RFIDService {
  async list(userId?: string, projectCityId?: string): Promise<RFIDKey[]> {
    const where: any = {}
    if (userId) where.userId = userId
    if (projectCityId) {
      // Direct projectCityId filtering - much more efficient than user joins
      where.projectCityId = projectCityId
    }
    const keys = await prisma.rFIDKey.findMany({ 
      where, 
      include: { 
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }, 
      orderBy: { issuedAt: 'desc' } 
    })
    return keys as unknown as RFIDKey[]
  }

  async create(data: CreateRFIDKeyRequest): Promise<RFIDKey> {
    const { cardId, name, userId, expiresAt } = data
    const existing = await prisma.rFIDKey.findUnique({ where: { cardId } })
    if (existing) {
      throw new Error('RFID card ID already exists')
    }
    
    // Get user's projectCityId for proper tenant scoping
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { projectCityId: true } 
    })
    if (!user) {
      throw new Error('User not found')
    }
    
    // ENFORCE ONE CARD PER USER: Check if user already has an active card
    const existingActiveCard = await prisma.rFIDKey.findFirst({
      where: {
        userId,
        isActive: true
      }
    })
    
    if (existingActiveCard) {
      throw new Error(`User already has an active RFID card (${existingActiveCard.cardId}). Please revoke the existing card first or use the assign endpoint to replace it.`)
    }
    
    const created = await prisma.rFIDKey.create({ 
      data: { 
        cardId, 
        name, 
        userId, 
        expiresAt,
        projectCityId: user.projectCityId 
      } 
    })
    return created as unknown as RFIDKey
  }

  async update(id: string, patch: Partial<Pick<RFIDKey, 'name' | 'isActive' | 'expiresAt'>>): Promise<RFIDKey> {
    const updated = await prisma.rFIDKey.update({ where: { id }, data: patch })
    return updated as unknown as RFIDKey
  }
}

export default new RFIDService()
