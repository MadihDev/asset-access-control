import { Request, Response } from 'express'
import AuthService from '../services/auth.service'
import AuditService from '../services/audit.service'
import { AuditAction } from '../types'
import { LoginRequest } from '../types'

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body
      const result = await AuthService.login(loginData)
      await AuditService.log({ req, action: AuditAction.LOGIN, entityType: 'User', entityId: result.user.id, userId: result.user.id })
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      })
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
        return
      }

  await AuthService.logout(userId)
  await AuditService.log({ req, action: AuditAction.LOGOUT, entityType: 'User', entityId: userId, userId })
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      })
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        })
        return
      }

      const result = await AuthService.refreshToken(refreshToken)
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      })
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      })
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { currentPassword, newPassword } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
        return
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        })
        return
      }

      await AuthService.changePassword(userId, currentPassword, newPassword)
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed'
      })
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
        })
        return
      }

      await AuthService.resetPassword(email)
      
      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to your email'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      })
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
        return
      }

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve profile'
      })
    }
  }
}

export default new AuthController()