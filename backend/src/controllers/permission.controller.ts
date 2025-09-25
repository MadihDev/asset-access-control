import { Request, Response } from 'express'
import PermissionService from '../services/permission.service'
import AuditService from '../services/audit.service'
import { AuditAction } from '../types'
import { CreatePermissionRequest } from '../types'
import { getEffectiveProjectCityId } from '../lib/scope'

class PermissionController {
  async list(req: Request, res: Response) {
    try {
      const { userId, lockId } = req.query as any
      const effectiveProjectCityId = getEffectiveProjectCityId(req)
      const items = await PermissionService.list(userId, lockId, effectiveProjectCityId)
      res.json({ success: true, data: items })
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch permissions' })
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const data: CreatePermissionRequest = req.body
      // CRITICAL: Enforce project-city scope for ALL users, including ADMIN
      // This ensures perfect tenant isolation
      const actor = (req as any).user
      const [targetUser, targetLock] = await Promise.all([
        PermissionService.getUserProjectCity(data.userId),
        PermissionService.getLockProjectCity(data.lockId)
      ])
      
      // Verify tenant isolation: user, lock, and actor must all be in the same project-city
      if (!targetUser || !targetLock || !actor?.projectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to assign permissions' })
      }
      
      if (targetUser !== actor.projectCityId || targetLock !== actor.projectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to assign permissions' })
      }
      
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
      // CRITICAL: Enforce project-city scope for ALL users, including ADMIN
      const actor = (req as any).user
      const { userProjectCityId, lockProjectCityId } = await PermissionService.getPermissionProjectCities(id)
      
      // Verify tenant isolation: permission user and lock must be in actor's project-city
      if (!actor?.projectCityId || !userProjectCityId || !lockProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to update permission' })
      }
      
      if (userProjectCityId !== actor.projectCityId || lockProjectCityId !== actor.projectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to update permission' })
      }
      
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
      // CRITICAL: Enforce project-city scope for ALL users, including ADMIN
      const actor = (req as any).user
      const { userProjectCityId, lockProjectCityId } = await PermissionService.getPermissionProjectCities(id)
      
      // Verify tenant isolation: permission user and lock must be in actor's project-city
      if (!actor?.projectCityId || !userProjectCityId || !lockProjectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to revoke permission' })
      }
      
      if (userProjectCityId !== actor.projectCityId || lockProjectCityId !== actor.projectCityId) {
        return res.status(403).json({ success: false, error: 'Insufficient scope to revoke permission' })
      }
      
      await PermissionService.revoke(id)
      await AuditService.log({ req, action: AuditAction.PERMISSION_REVOKE, entityType: 'UserPermission', entityId: id })
      res.json({ success: true, message: 'Permission revoked' })
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to revoke permission' })
    }
  }
}

export default new PermissionController()
