import { Router } from 'express'
import RFIDController from '../controllers/rfid.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { validateCreateRFIDKey, validateUpdateRFIDKey, validateAssignRFIDKey, validateRevokeRFIDKey } from '../middleware/validation.middleware'

const router = Router()

router.use(authenticateToken)

// List keys (Manager+)
router.get('/', requireManagerOrAbove, RFIDController.list)

// Create new key (Admin)
router.post('/', requireAdmin, validateCreateRFIDKey, RFIDController.create)

// Update key (Admin)
router.put('/:id', requireAdmin, validateUpdateRFIDKey, RFIDController.update)

// Assign key to user (Admin) - optional expiresAt defaults to now + 6h
router.post('/assign', requireAdmin, validateAssignRFIDKey, RFIDController.assign)

// Revoke key (Admin)
router.post('/revoke', requireAdmin, validateRevokeRFIDKey, RFIDController.revoke)

export default router
