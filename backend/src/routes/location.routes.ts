import { Router, Request, Response } from 'express'
import LocationController from '../controllers/location.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { validateAddressIdParam } from '../middleware/validation.middleware'

const router = Router()

// Protected routes
router.use(authenticateToken)

// New hierarchy routes (specific routes first)
router.get('/', (req: Request, res: Response) => LocationController.list(req, res))
router.post('/', requireManagerOrAbove, (req: Request, res: Response) => LocationController.create(req, res))
router.post('/bulk', requireManagerOrAbove, (req: Request, res: Response) => LocationController.bulkUpdate(req, res))
router.put('/:locationId', requireManagerOrAbove, (req: Request, res: Response) => LocationController.update(req, res))
router.delete('/:locationId', requireManagerOrAbove, (req: Request, res: Response) => LocationController.delete(req, res))
router.get('/:locationId/locks', (req: Request, res: Response) => LocationController.getLocks(req, res))

// Legacy routes (backwards compatibility) - keep parameterized routes at the end
router.get('/:addressId/users', validateAddressIdParam, (req: Request, res: Response) => LocationController.listUsers(req, res))
router.get('/:addressId/locks-legacy', validateAddressIdParam, (req: Request, res: Response) => LocationController.listLocks(req, res))
router.get('/:addressId/keys', validateAddressIdParam, (req: Request, res: Response) => LocationController.listKeys(req, res))

export default router