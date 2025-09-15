import { Router } from 'express'
import UserController from '../controllers/user.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { 
  validateCreateUser, 
  validateUpdateUser, 
  validateUUID,
  validatePaginationQuery 
} from '../middleware/validation.middleware'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// GET /api/users - List all users (Manager+ only)
router.get('/', requireManagerOrAbove, validatePaginationQuery, UserController.getAllUsers)

// GET /api/user/export - Export users as CSV (Manager+ only)
router.get('/export', requireManagerOrAbove, UserController.exportUsers)

// GET /api/users/with-permissions - Get users with their permission counts (Manager+ only)
router.get('/with-permissions', requireManagerOrAbove, UserController.getUsersWithPermissions)

// POST /api/users - Create new user (Admin only)
router.post('/', requireAdmin, validateCreateUser, UserController.createUser)

// GET /api/users/:id - Get user by ID
router.get('/:id', validateUUID, UserController.getUserById)

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', requireAdmin, validateUUID, validateUpdateUser, UserController.updateUser)

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireAdmin, validateUUID, UserController.deleteUser)

// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats', validateUUID, UserController.getUserStats)

export default router
