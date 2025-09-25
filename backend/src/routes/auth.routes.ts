import { Router } from 'express'
import AuthController from '../controllers/auth.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { 
  validateLogin, 
  validatePasswordChange, 
  validatePasswordReset,
  validate2FAVerify,
  validate2FAResend
} from '../middleware/validation.middleware'

const router = Router()

// Public routes
router.post('/login', validateLogin, AuthController.login)
router.post('/refresh-token', AuthController.refreshToken)
router.post('/reset-password', validatePasswordReset, AuthController.resetPassword)

// Two-Factor Authentication routes
router.post('/2fa/verify', validate2FAVerify, AuthController.verify2FA)
router.post('/2fa/resend', validate2FAResend, AuthController.resend2FA)

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout)
router.post('/change-password', authenticateToken, validatePasswordChange, AuthController.changePassword)
router.get('/profile', authenticateToken, AuthController.getProfile)

export default router
