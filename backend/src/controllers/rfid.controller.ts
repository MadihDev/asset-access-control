import { Request, Response } from 'express'
import RFIDService from '../services/rfid.service'
import AuditService from '../services/audit.service'
import { AuditAction, AssignRFIDKeyRequest, RevokeRFIDKeyRequest, CreateRFIDKeyRequest } from '../types'
import prisma from '../lib/prisma'
import { emitToProjectCity } from '../lib/ws'
import { getEffectiveProjectCityId } from '../lib/scope'

class RFIDController {
  async list(req: Request, res: Response) {
    try {
      const { userId } = req.query as any
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const keys = await RFIDService.list(userId, effectiveProjectCityId)
      res.json({ success: true, data: keys })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch RFID keys' })
    }
  }

  async available(req: Request, res: Response) {
    try {
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      
      // Get all RFID cards that are either unassigned or inactive within the tenant
      const availableCards = await prisma.rFIDKey.findMany({
        where: {
          projectCityId: effectiveProjectCityId,
          isActive: false // Only inactive cards are available for assignment
        },
        select: {
          id: true,
          cardId: true,
          name: true,
          isActive: true,
          issuedAt: true,
          expiresAt: true,
          userId: true,
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

      // Format for frontend (map fields to match frontend interface)
      const formattedCards = availableCards.map((card: any) => ({
        id: card.id,
        cardNumber: card.cardId, // Frontend expects cardNumber field
        cardId: card.cardId, // Keep cardId for backward compatibility
        name: card.name,
        isAssigned: false, // Available cards are not assigned
        isActive: card.isActive,
        issuedAt: card.issuedAt,
        expiresAt: card.expiresAt,
        userId: card.userId,
        assignedUserId: card.userId, // Frontend expects assignedUserId
        user: card.user
      }))

      res.json({ success: true, data: formattedCards })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch available RFID cards' })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const payload: CreateRFIDKeyRequest = req.body
      const actor = (req as any).user
      if (actor?.role !== 'ADMIN') {
        const targetUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { projectCityId: true } })
        if (!targetUser || (actor?.projectCityId && targetUser.projectCityId && targetUser.projectCityId !== actor.projectCityId)) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to create key for this user' })
        }
      }
      const key = await RFIDService.create(payload)
      await AuditService.log({ req, action: AuditAction.CREATE, entityType: 'RFIDKey', entityId: key.id, newValues: key as any })
      res.status(201).json({ success: true, data: key, message: 'RFID key created' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create RFID key' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const actor = (req as any).user
      if (actor?.role !== 'ADMIN') {
        const existing = await prisma.rFIDKey.findUnique({ where: { id }, include: { user: { select: { projectCityId: true } } } })
        if (!existing || (actor?.projectCityId && existing.user?.projectCityId && existing.user.projectCityId !== actor.projectCityId)) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to update this key' })
        }
      }
      const key = await RFIDService.update(id, req.body)
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: id, newValues: key as any })
      res.json({ success: true, data: key, message: 'RFID key updated' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update RFID key' })
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const payload = req.body as AssignRFIDKeyRequest
      const { cardId, userId, name } = payload
      let { expiresAt } = payload
      if (!expiresAt) {
        expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000)
      }

      // Enforce city scope for non-super-admins: user must be in actor's city
      const actor = (req as any).user
      if (actor?.role !== 'ADMIN') {
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { projectCityId: true } })
        if (!targetUser || (actor?.projectCityId && targetUser.projectCityId && targetUser.projectCityId !== actor.projectCityId)) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to assign key to this user' })
        }
      }

      // Get user's projectCityId for proper tenant scoping
      const targetUser = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { projectCityId: true } 
      })
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' })
      }

      // ENFORCE ONE CARD PER USER: Revoke any existing active cards for this user
      const existingActiveCards = await prisma.rFIDKey.findMany({
        where: {
          userId,
          isActive: true
        }
      })

      if (existingActiveCards.length > 0) {
        // Revoke all existing active cards for this user
        await prisma.rFIDKey.updateMany({
          where: {
            userId,
            isActive: true
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        })

        // Log the revocation of existing cards
        for (const existingCard of existingActiveCards) {
          await AuditService.log({ 
            req, 
            action: AuditAction.UPDATE, 
            entityType: 'RFIDKey', 
            entityId: existingCard.id, 
            newValues: { isActive: false, reason: 'Auto-revoked for new card assignment' } 
          })

          // Emit revocation event
          try {
            if (targetUser.projectCityId) {
              emitToProjectCity(targetUser.projectCityId, 'key.revoked', { 
                keyId: existingCard.id, 
                cardId: existingCard.cardId, 
                userId: existingCard.userId, 
                revokedAt: new Date().toISOString(),
                reason: 'auto-revoked-for-new-assignment'
              })
            }
          } catch {
            // ignore websocket errors
          }
        }
      }

      // Now assign the new card (either update existing or create new)
      const existingCard = await prisma.rFIDKey.findUnique({ where: { cardId } })
      let key
      
      if (existingCard) {
        // Update existing card (even if it was inactive)
        key = await prisma.rFIDKey.update({ 
          where: { id: existingCard.id }, 
          data: { 
            userId, 
            name, 
            isActive: true, 
            expiresAt,
            projectCityId: targetUser.projectCityId 
          } 
        })
      } else {
        // Create new card
        key = await prisma.rFIDKey.create({ 
          data: { 
            cardId, 
            userId, 
            name, 
            expiresAt, 
            isActive: true,
            projectCityId: targetUser.projectCityId 
          } 
        })
      }

      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { assignedTo: userId, expiresAt } })

      // Emit assignment event
      try {
        if (targetUser.projectCityId) {
          emitToProjectCity(targetUser.projectCityId, 'key.assigned', { keyId: key.id, cardId: key.cardId, userId: key.userId, expiresAt: key.expiresAt })
        }
      } catch {
        // ignore websocket errors
      }

      const message = existingActiveCards.length > 0 
        ? `RFID key assigned (${existingActiveCards.length} previous cards revoked)`
        : 'RFID key assigned'

      res.status(200).json({ success: true, data: key, message })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to assign RFID key' })
    }
  }

  async revoke(req: Request, res: Response) {
    try {
      const payload = req.body as RevokeRFIDKeyRequest
      const { id, cardId } = payload
      if (!id && !cardId) {
        return res.status(400).json({ success: false, error: 'id or cardId is required' })
      }

      const key = await prisma.rFIDKey.findFirst({ where: id ? { id } : { cardId }, include: { user: { select: { projectCityId: true } } } })
      if (!key) {
        return res.status(404).json({ success: false, error: 'RFID key not found' })
      }

      // Enforce project city scope for non-admins
      const actor = (req as any).user
      if (actor?.role !== 'ADMIN') {
        if (actor?.projectCityId && key.user?.projectCityId && key.user.projectCityId !== actor.projectCityId) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to revoke this key' })
        }
      }

      const updated = await prisma.rFIDKey.update({ where: { id: key.id }, data: { isActive: false } })
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { isActive: false } })

      // Emit WebSocket event to user's project city room (best-effort)
      try {
        const projectCityId = key.user?.projectCityId
        if (projectCityId) {
          emitToProjectCity(projectCityId, 'key.revoked', { keyId: key.id, cardId: key.cardId, userId: key.userId, revokedAt: new Date().toISOString() })
        }
      } catch {
        // ignore
      }

      res.json({ success: true, data: updated, message: 'RFID key revoked' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to revoke RFID key' })
    }
  }
}

export default new RFIDController()
