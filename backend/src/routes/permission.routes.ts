import { Router } from 'express'
import PermissionController from '../controllers/permission.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { validateCreatePermission, validateUpdatePermission } from '../middleware/validation.middleware'

const router = Router()

router.use(authenticateToken, requireManagerOrAbove)

// List permissions (filter by userId or lockId optional)
router.get('/', PermissionController.list)

// Assign or upsert permission
router.post('/', validateCreatePermission, PermissionController.assign)

// Update permission by id
router.put('/:id', validateUpdatePermission, PermissionController.update)

// Revoke permission by id
router.delete('/:id', PermissionController.revoke)

export default router
