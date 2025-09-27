import { Router } from 'express'
import LockController from '../controllers/lock.controller'
import AccessController from '../controllers/access.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { 
  validateAccessAttempt,
  validateAccessLogQuery
} from '../middleware/validation.middleware'
import { 
  validateLockAssignment,
  requireLockAccess
} from '../middleware/location.middleware'

const router = Router()

// Public endpoint for RFID devices
router.post('/access-attempt', validateAccessAttempt, AccessController.logAccessAttempt)

// Protected routes
router.use(authenticateToken)

// GET /api/lock/access-logs - Get access logs
router.get('/access-logs', validateAccessLogQuery, AccessController.getAccessLogs)

// POST /api/lock/access-logs/simulate - Simulate access attempt for testing (Manager+ only)
router.post('/access-logs/simulate', requireManagerOrAbove, AccessController.simulateAccessAttempt)

// GET /api/lock/access-logs/export - Export access logs as CSV (Manager+ only)
router.get('/access-logs/export', requireManagerOrAbove, validateAccessLogQuery, AccessController.exportAccessLogs)

// GET /api/lock/access-stats - Get access statistics (Manager+ only)
router.get('/access-stats', requireManagerOrAbove, AccessController.getAccessStats)

// GET /api/lock - List locks (active)
router.get('/', LockController.list)

// GET /api/lock/tree - Get locks in hierarchical tree structure
router.get('/tree', LockController.getTree)

// POST /api/lock - Create new lock (Manager+ only)
router.post('/', requireManagerOrAbove, LockController.create)

// GET /api/lock/available - Get locks available for a specific user (Manager+)
router.get('/available', requireManagerOrAbove, LockController.getAvailableForUser)

// POST /api/lock/:id/ping - Mark lock online and update lastSeen (Manager+)
router.post('/:id/ping', requireManagerOrAbove, LockController.ping)

// PUT /api/lock/:id - Update lock (Admin+)
router.put('/:id', requireAdmin, requireLockAccess, validateLockAssignment, LockController.update)

// GET /api/lock/:id - Get lock by id (keep last to avoid capturing other static routes)
router.get('/:id', requireLockAccess, LockController.getById)

export default router
