import { Router } from 'express'
import AuthController from '../controllers/auth.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { 
  validateLogin, 
  validatePasswordChange, 
  validatePasswordReset 
} from '../middleware/validation.middleware'

const router = Router()

// Public routes
router.post('/login', validateLogin, AuthController.login)
router.post('/refresh-token', AuthController.refreshToken)
router.post('/reset-password', validatePasswordReset, AuthController.resetPassword)

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout)
router.post('/change-password', authenticateToken, validatePasswordChange, AuthController.changePassword)
router.get('/profile', authenticateToken, AuthController.getProfile)

export default router
