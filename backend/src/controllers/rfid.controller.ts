import { Request, Response } from 'express'
import RFIDService from '../services/rfid.service'
import AuditService from '../services/audit.service'
import { AuditAction } from '../types'
import { CreateRFIDKeyRequest } from '../types'

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
}

export default new RFIDController()
