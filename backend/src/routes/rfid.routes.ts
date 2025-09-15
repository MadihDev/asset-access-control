import { Router } from 'express'
import RFIDController from '../controllers/rfid.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { validateCreateRFIDKey, validateUpdateRFIDKey } from '../middleware/validation.middleware'

const router = Router()

router.use(authenticateToken)

// List keys (Manager+)
router.get('/', requireManagerOrAbove, RFIDController.list)

// Create new key (Admin)
router.post('/', requireAdmin, validateCreateRFIDKey, RFIDController.create)

// Update key (Admin)
router.put('/:id', requireAdmin, validateUpdateRFIDKey, RFIDController.update)

export default router
