import { Router, Request, Response, NextFunction } from 'express'
import LockController from '../controllers/lock.controller'
import AccessController from '../controllers/access.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { authenticateDevice, requireActiveDevice, deviceRateLimit, logDeviceActivity } from '../middleware/device.middleware'
import { 
  validateAccessAttempt,
  validateAccessLogQuery
} from '../middleware/validation.middleware'
import { 
  validateLockAssignment,
  requireLockAccess
} from '../middleware/location.middleware'

const router = Router()

// Enhanced access attempt endpoint - supports both device authentication and legacy public access
// Device authentication is preferred but not required for backward compatibility
router.post('/access-attempt', 
  deviceRateLimit(60000, 200), // 200 attempts per minute for devices
  // Optional device authentication - if headers are present, authenticate
  (req: Request, res: Response, next: NextFunction) => {
    const deviceId = req.headers['x-device-id']
    const secretKey = req.headers['x-device-secret']
    
    if (deviceId && secretKey) {
      // Device authentication provided - use device middleware
      return authenticateDevice(req, res, (err) => {
        if (err) return next(err)
        return requireActiveDevice(req, res, (err2) => {
          if (err2) return next(err2)
          return logDeviceActivity(req, res, next)
        })
      })
    } else {
      // No device authentication - proceed with legacy public access
      next()
    }
  },
  validateAccessAttempt, 
  AccessController.logAccessAttempt
)

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
