import { Request, Response } from 'express'
import UserService from '../services/user.service'
import AuditService from '../services/audit.service'
import { AuditAction, CreateUserRequest, UpdateUserRequest, UserQuery, UserRole } from '../types'
import { canManage } from '../lib/rbac'

class UserController {
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body
      const actor = (req as any).user
      if (!actor) {
        res.status(401).json({ success: false, error: 'Authentication required' })
        return
      }
      const targetRole = userData.role || UserRole.USER
      const isAllowed = actor.role === UserRole.SUPER_ADMIN || canManage(targetRole, actor.role)
      if (!isAllowed) {
        res.status(403).json({ success: false, error: 'Insufficient role to create this user' })
        return
      }
      const user = await UserService.createUser(userData)
      await AuditService.log({ req, action: AuditAction.CREATE, entityType: 'User', entityId: user.id, newValues: { ...user } })
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'User creation failed'
      })
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const user = await UserService.getUserById(id)
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      res.status(200).json({
        success: true,
        data: user,
        message: 'User retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve user'
      })
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData: UpdateUserRequest = req.body
      const actor = (req as any).user
      if (!actor) {
        res.status(401).json({ success: false, error: 'Authentication required' })
        return
      }
      const existing = await UserService.getUserById(id)
      if (!existing) {
        res.status(404).json({ success: false, error: 'User not found' })
        return
      }
      if (!(actor.id === id || actor.role === UserRole.SUPER_ADMIN || canManage(existing.role, actor.role))) {
        res.status(403).json({ success: false, error: 'Insufficient role to modify this user' })
        return
      }
      const before = existing
      const user = await UserService.updateUser(id, updateData)
      await AuditService.log({ req, action: AuditAction.UPDATE, entityType: 'User', entityId: id, oldValues: before as any, newValues: { ...user } })
      
      res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'User update failed'
      })
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const actor = (req as any).user
      if (!actor) {
        res.status(401).json({ success: false, error: 'Authentication required' })
        return
      }
      const existing = await UserService.getUserById(id)
      if (!existing) {
        res.status(404).json({ success: false, error: 'User not found' })
        return
      }
      if (!(actor.role === UserRole.SUPER_ADMIN || canManage(existing.role, actor.role))) {
        res.status(403).json({ success: false, error: 'Insufficient role to delete this user' })
        return
      }
      await UserService.deleteUser(id)
      await AuditService.log({ req, action: AuditAction.DELETE, entityType: 'User', entityId: id, oldValues: existing as any })
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'User deletion failed'
      })
    }
  }

  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: UserQuery = req.query as any
      const result = await UserService.getAllUsers(query)
      
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Users retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve users'
      })
    }
  }

  async getUsersWithPermissions(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getUsersWithPermissions()
      
      res.status(200).json({
        success: true,
        data: users,
        message: 'Users with permissions retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve users with permissions'
      })
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const stats = await UserService.getUserStats(id)
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'User statistics retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve user statistics'
      })
    }
  }

  async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: UserQuery = req.query as any
      // Export up to 10k users according to current filters/sort
      const exportQuery: UserQuery = { ...query, page: 1, limit: 10000 } as any
      const result = await UserService.getAllUsers(exportQuery)

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv')

      const headers = [
        'First Name',
        'Last Name',
        'Email',
        'Username',
        'Role',
        'Active',
        'Created At',
        'Last Login At'
      ].join(',')

      const rows = result.data.map((u: any) => [
        u.firstName || '',
        u.lastName || '',
        u.email || '',
        u.username || '',
        u.role || '',
        (u.isActive !== false ? 'true' : 'false'),
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
        u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

      const csv = [headers, ...rows].join('\n')
      res.status(200).send(csv)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export users'
      })
    }
  }
}

export default new UserController()