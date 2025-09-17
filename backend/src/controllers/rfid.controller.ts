import { Request, Response } from 'express'
import RFIDService from '../services/rfid.service'
import AuditService from '../services/audit.service'
import { AuditAction, AssignRFIDKeyRequest, RevokeRFIDKeyRequest, CreateRFIDKeyRequest } from '../types'
import prisma from '../lib/prisma'
import { emitToCity } from '../lib/ws'
import { getEffectiveCityId } from '../lib/scope'

class RFIDController {
  async list(req: Request, res: Response) {
    try {
      const { userId } = req.query as any
      const effectiveCityId = getEffectiveCityId(req)
      const keys = await RFIDService.list(userId, effectiveCityId)
      res.json({ success: true, data: keys })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch RFID keys' })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const payload: CreateRFIDKeyRequest = req.body
      const actor = (req as any).user
      if (actor?.role !== 'SUPER_ADMIN') {
        const targetUser = await prisma.user.findUnique({ where: { id: payload.userId }, select: { cityId: true } })
        if (!targetUser || (actor?.cityId && targetUser.cityId && targetUser.cityId !== actor.cityId)) {
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
      if (actor?.role !== 'SUPER_ADMIN') {
        const existing = await prisma.rFIDKey.findUnique({ where: { id }, include: { user: { select: { cityId: true } } } })
        if (!existing || (actor?.cityId && existing.user?.cityId && existing.user.cityId !== actor.cityId)) {
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
      if (actor?.role !== 'SUPER_ADMIN') {
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { cityId: true } })
        if (!targetUser || (actor?.cityId && targetUser.cityId && targetUser.cityId !== actor.cityId)) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to assign key to this user' })
        }
      }

      // Upsert pattern: if key exists, update owner/expiry/name; else create
      const existing = await prisma.rFIDKey.findUnique({ where: { cardId } })
      let key
      if (existing) {
        key = await prisma.rFIDKey.update({ where: { id: existing.id }, data: { userId, name, isActive: true, expiresAt } })
      } else {
        key = await prisma.rFIDKey.create({ data: { cardId, userId, name, expiresAt, isActive: true } })
      }

      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { assignedTo: userId, expiresAt } })

      // Emit WebSocket event to user's city room (best-effort)
      try {
        const city = await prisma.user.findUnique({ where: { id: userId }, select: { cityId: true } })
        if (city?.cityId) {
          emitToCity(city.cityId, 'key.assigned', { keyId: key.id, cardId: key.cardId, userId: key.userId, expiresAt: key.expiresAt })
        }
      } catch {
        // ignore
      }

      res.status(200).json({ success: true, data: key, message: 'RFID key assigned' })
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

      const key = await prisma.rFIDKey.findFirst({ where: id ? { id } : { cardId }, include: { user: { select: { cityId: true } } } })
      if (!key) {
        return res.status(404).json({ success: false, error: 'RFID key not found' })
      }

      // Enforce city scope for non-super-admins
      const actor = (req as any).user
      if (actor?.role !== 'SUPER_ADMIN') {
        if (actor?.cityId && key.user?.cityId && key.user.cityId !== actor.cityId) {
          return res.status(403).json({ success: false, error: 'Insufficient scope to revoke this key' })
        }
      }

      const updated = await prisma.rFIDKey.update({ where: { id: key.id }, data: { isActive: false } })
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { isActive: false } })

      // Emit WebSocket event to user's city room (best-effort)
      try {
        const cityId = key.user?.cityId
        if (cityId) {
          emitToCity(cityId, 'key.revoked', { keyId: key.id, cardId: key.cardId, userId: key.userId, revokedAt: new Date().toISOString() })
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
