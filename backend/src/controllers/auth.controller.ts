import { Request, Response } from 'express'
import AuthService from '../services/auth.service'
import AuditService from '../services/audit.service'
import TwoFactorService from '../services/twoFactor.service'
import { AuditAction } from '../types'
import { LoginRequest, TwoFactorVerifyRequest } from '../types'

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

  /**
   * Verify 2FA challenge code
   */
  async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, code }: TwoFactorVerifyRequest = req.body

      if (!challengeId || !code) {
        res.status(400).json({
          success: false,
          error: 'Challenge ID and code are required'
        })
        return
      }

      const result = await TwoFactorService.verifyChallenge(challengeId, code)

      if (result.success && result.userId) {
        // Generate tokens for successful 2FA verification
        const tokens = await AuthService.generateTokensForUser(result.userId)
        
        await AuditService.log({ 
          req, 
          action: AuditAction.LOGIN, 
          entityType: 'User', 
          entityId: result.userId, 
          userId: result.userId
        })

        res.status(200).json({
          success: true,
          data: tokens,
          message: '2FA verification successful'
        })
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code',
          attemptsRemaining: result.attemptsRemaining
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '2FA verification failed'
      })
    }
  }

  /**
   * Resend 2FA verification code
   */
  async resend2FA(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId } = req.body

      if (!challengeId) {
        res.status(400).json({
          success: false,
          error: 'Challenge ID is required'
        })
        return
      }

      const result = await TwoFactorService.resendChallenge(challengeId)

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Verification code resent',
          expiresIn: result.expiresIn
        })
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to resend verification code'
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend code'
      })
    }
  }
}

export default new AuthController()