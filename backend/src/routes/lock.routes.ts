import { Router } from 'express'
import AccessController from '../controllers/access.controller'
import LockController from '../controllers/lock.controller'
import { authenticateToken, requireManagerOrAbove } from '../middleware/auth.middleware'
import { 
  validateAccessAttempt,
  validateAccessLogQuery
} from '../middleware/validation.middleware'

const router = Router()

// Public endpoint for RFID devices
router.post('/access-attempt', validateAccessAttempt, AccessController.logAccessAttempt)

// Protected routes
router.use(authenticateToken)

// GET /api/lock - List locks (active)
router.get('/', LockController.list)

// GET /api/lock/access-logs - Get access logs
router.get('/access-logs', validateAccessLogQuery, AccessController.getAccessLogs)

// GET /api/lock/access-logs/export - Export access logs as CSV (Manager+ only)
router.get('/access-logs/export', requireManagerOrAbove, validateAccessLogQuery, AccessController.exportAccessLogs)

// GET /api/lock/access-stats - Get access statistics (Manager+ only)
router.get('/access-stats', requireManagerOrAbove, AccessController.getAccessStats)

export default router
