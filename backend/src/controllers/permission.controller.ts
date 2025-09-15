import { Request, Response } from 'express'
import PermissionService from '../services/permission.service'
import AuditService from '../services/audit.service'
import { AuditAction } from '../types'
import { CreatePermissionRequest } from '../types'

class PermissionController {
  async list(req: Request, res: Response) {
    try {
      const { userId, lockId } = req.query as any
      const items = await PermissionService.list(userId, lockId)
      res.json({ success: true, data: items })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch permissions' })
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const data: CreatePermissionRequest = req.body
      const item = await PermissionService.assign(data)
      await AuditService.log({ req, action: AuditAction.PERMISSION_GRANT, entityType: 'UserPermission', entityId: item.id, newValues: item as any })
      res.status(201).json({ success: true, data: item, message: 'Permission assigned' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to assign permission' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      // We don't fetch before; rely on service to throw if not found, and log after
      const item = await PermissionService.update(id, req.body)
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'UserPermission', entityId: id, newValues: item as any })
      res.json({ success: true, data: item, message: 'Permission updated' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update permission' })
    }
  }

  async revoke(req: Request, res: Response) {
    try {
      const { id } = req.params
      await PermissionService.revoke(id)
      await AuditService.log({ req, action: AuditAction.PERMISSION_REVOKE, entityType: 'UserPermission', entityId: id })
      res.json({ success: true, message: 'Permission revoked' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to revoke permission' })
    }
  }
}

export default new PermissionController()
