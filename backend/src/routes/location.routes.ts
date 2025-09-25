import { Router, Request, Response } from 'express'
import LocationController from '../controllers/location.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { bulkLimiter } from '../middleware/rateLimit.middleware'
import { validateAddressIdParam, validateBulkLocationKeyAssign, validateBulkLocationPermissions } from '../middleware/validation.middleware'

const router = Router()

// Protected routes
router.use(authenticateToken)

router.get('/:addressId/users', validateAddressIdParam, (req: Request, res: Response) => LocationController.listUsers(req, res))
router.get('/:addressId/locks', validateAddressIdParam, (req: Request, res: Response) => LocationController.listLocks(req, res))
router.get('/:addressId/keys', validateAddressIdParam, (req: Request, res: Response) => LocationController.listKeys(req, res))

// Manager+ for bulk operations
router.post(
	'/:addressId/permissions',
	bulkLimiter,
	requireManagerOrAbove,
	validateAddressIdParam,
	validateBulkLocationPermissions,
		(req: Request, res: Response) => LocationController.bulkPermissions(req, res),
)
router.post(
	'/:addressId/keys/assign',
	bulkLimiter,
	requireManagerOrAbove,
	validateAddressIdParam,
	validateBulkLocationKeyAssign,
		(req: Request, res: Response) => LocationController.bulkAssignKeys(req, res),
)

export default router
