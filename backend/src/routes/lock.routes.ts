import { Router } from 'express'
import AccessController from '../controllers/access.controller'
import LockController from '../controllers/lock.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { 
  validateAccessAttempt,
  validateAccessLogQuery
} from '../middleware/validation.middleware'

const router = Router()

// Public endpoint for RFID devices
router.post('/access-attempt', validateAccessAttempt, AccessController.logAccessAttempt)

// Protected routes
router.use(authenticateToken)

// GET /api/lock/access-logs - Get access logs
router.get('/access-logs', validateAccessLogQuery, AccessController.getAccessLogs)

// GET /api/lock/access-logs/export - Export access logs as CSV (Manager+ only)
router.get('/access-logs/export', requireManagerOrAbove, validateAccessLogQuery, AccessController.exportAccessLogs)

// GET /api/lock/access-stats - Get access statistics (Manager+ only)
router.get('/access-stats', requireManagerOrAbove, AccessController.getAccessStats)

// GET /api/lock - List locks (active)
router.get('/', LockController.list)

// POST /api/lock/:id/ping - Mark lock online and update lastSeen (Manager+)
router.post('/:id/ping', requireManagerOrAbove, LockController.ping)

// PUT /api/lock/:id - Update lock (Admin+)
router.put('/:id', requireAdmin, LockController.update)

// GET /api/lock/:id - Get lock by id (keep last to avoid capturing other static routes)
router.get('/:id', LockController.getById)

export default router
