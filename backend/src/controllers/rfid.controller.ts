import { Request, Response } from 'express'
import RFIDService from '../services/rfid.service'
import AuditService from '../services/audit.service'
import { AuditAction, AssignRFIDKeyRequest, RevokeRFIDKeyRequest, CreateRFIDKeyRequest } from '../types'
import prisma from '../lib/prisma'

class RFIDController {
  async list(req: Request, res: Response) {
    try {
      const { userId } = req.query as any
      const keys = await RFIDService.list(userId)
      res.json({ success: true, data: keys })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch RFID keys' })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const payload: CreateRFIDKeyRequest = req.body
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

      // Upsert pattern: if key exists, update owner/expiry/name; else create
      const existing = await prisma.rFIDKey.findUnique({ where: { cardId } })
      let key
      if (existing) {
        key = await prisma.rFIDKey.update({ where: { id: existing.id }, data: { userId, name, isActive: true, expiresAt } })
      } else {
        key = await prisma.rFIDKey.create({ data: { cardId, userId, name, expiresAt, isActive: true } })
      }

      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { assignedTo: userId, expiresAt } })
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

      const key = await prisma.rFIDKey.findFirst({ where: id ? { id } : { cardId } })
      if (!key) {
        return res.status(404).json({ success: false, error: 'RFID key not found' })
      }

      const updated = await prisma.rFIDKey.update({ where: { id: key.id }, data: { isActive: false } })
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'RFIDKey', entityId: key.id, newValues: { isActive: false } })
      res.json({ success: true, data: updated, message: 'RFID key revoked' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to revoke RFID key' })
    }
  }
}

export default new RFIDController()
