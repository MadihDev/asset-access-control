import { Router } from 'express'
import LocationController from '../controllers/location.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { bulkLimiter } from '../middleware/rateLimit.middleware'

const router = Router()

// Protected routes
router.use(authenticateToken)

router.get('/:addressId/users', (req, res) => LocationController.listUsers(req, res))
router.get('/:addressId/locks', (req, res) => LocationController.listLocks(req, res))
router.get('/:addressId/keys', (req, res) => LocationController.listKeys(req, res))

// Manager+ for bulk operations
router.post('/:addressId/permissions', bulkLimiter, requireManagerOrAbove, (req, res) => LocationController.bulkPermissions(req, res))
router.post('/:addressId/keys/assign', bulkLimiter, requireManagerOrAbove, (req, res) => LocationController.bulkAssignKeys(req, res))

export default router
