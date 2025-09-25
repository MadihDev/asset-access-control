import { Router } from 'express'
import AddressController from '../controllers/address.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { validateUUID, validatePaginationQuery } from '../middleware/validation.middleware'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// GET /api/address - List addresses with pagination and search
router.get('/', validatePaginationQuery, AddressController.list)

// GET /api/address/:id - Get specific address
router.get('/:id', validateUUID, AddressController.getById)

export default router