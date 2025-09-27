import { Router } from 'express'
import DeviceController from '../controllers/device.controller'
import { authenticateToken, requireAdmin, requireManagerOrAbove } from '../middleware/auth.middleware'
import { authenticateDevice, requireActiveDevice, deviceRateLimit, logDeviceActivity } from '../middleware/device.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()

// Validation rules
const validateDeviceRegistration = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Name is required and must be less than 200 characters')
    .trim(),
  body('deviceId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device ID is required and must be less than 100 characters')
    .trim(),
  body('deviceType')
    .optional()
    .isIn(['RFID_READER', 'LOCK_CONTROLLER', 'GATEWAY', 'SENSOR'])
    .withMessage('Invalid device type'),
  body('secretKey')
    .isLength({ min: 16 })
    .withMessage('Secret key must be at least 16 characters long'),
  body('locationId')
    .optional()
    .isUUID()
    .withMessage('Location ID must be a valid UUID'),
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('Invalid IP address'),
  body('macAddress')
    .optional()
    .isMACAddress()
    .withMessage('Invalid MAC address'),
  handleValidationErrors
]

const validateDeviceUpdate = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be less than 200 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'])
    .withMessage('Invalid status'),
  body('locationId')
    .optional()
    .isUUID()
    .withMessage('Location ID must be a valid UUID'),
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('Invalid IP address'),
  body('macAddress')
    .optional()
    .isMACAddress()
    .withMessage('Invalid MAC address'),
  body('batteryLevel')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100'),
  body('signalStrength')
    .optional()
    .isInt({ min: -100, max: 0 })
    .withMessage('Signal strength must be between -100 and 0 dBm'),
  body('pingInterval')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('Ping interval must be between 30 and 3600 seconds'),
  handleValidationErrors
]

const validateDevicePing = [
  body('batteryLevel')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100'),
  body('signalStrength')
    .optional()
    .isInt({ min: -100, max: 0 })
    .withMessage('Signal strength must be between -100 and 0 dBm'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'])
    .withMessage('Invalid status'),
  handleValidationErrors
]

const validateDeviceCommand = [
  body('command')
    .isLength({ min: 1, max: 100 })
    .withMessage('Command is required and must be less than 100 characters')
    .trim(),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  handleValidationErrors
]

const validateCommandResponse = [
  body('success')
    .isBoolean()
    .withMessage('Success must be a boolean'),
  body('response')
    .optional()
    .isObject()
    .withMessage('Response must be an object'),
  body('error')
    .optional()
    .isString()
    .withMessage('Error must be a string'),
  handleValidationErrors
]

// Admin routes (require JWT authentication)
router.use('/register', authenticateToken, requireAdmin)
router.use('/*/health', authenticateToken, requireManagerOrAbove)
router.use('/*/regenerate-key', authenticateToken, requireAdmin)

// Device registration (Admin only)
router.post('/register', validateDeviceRegistration, DeviceController.register)

// Device management (Admin/Manager)
router.get('/', authenticateToken, requireManagerOrAbove, DeviceController.list)
router.get('/:id', authenticateToken, requireManagerOrAbove, DeviceController.getById)
router.put('/:id', authenticateToken, requireAdmin, validateDeviceUpdate, DeviceController.update)
router.delete('/:id', authenticateToken, requireAdmin, DeviceController.delete)

// Device secret key management (Admin only)
router.post('/:id/regenerate-key', DeviceController.regenerateSecretKey)

// Device health metrics (Manager+)
router.get('/:deviceId/health', DeviceController.getHealthMetrics)

// Device command management (Admin/Manager)
router.post('/:deviceId/command', 
  authenticateToken, 
  requireManagerOrAbove, 
  validateDeviceCommand, 
  DeviceController.sendCommand
)

// Device-authenticated routes (for hardware devices)
router.use('/*/ping', deviceRateLimit(60000, 10)) // 10 pings per minute
router.use('/*/commands', deviceRateLimit(60000, 50)) // 50 command requests per minute
router.use('/command/*/response', deviceRateLimit(60000, 100)) // 100 responses per minute

// Device ping/heartbeat (Device authentication required)
router.post('/:deviceId/ping', 
  authenticateDevice,
  requireActiveDevice,
  logDeviceActivity,
  validateDevicePing,
  DeviceController.ping
)

// Get pending commands for device (Device authentication required)
router.get('/:deviceId/commands/pending',
  authenticateDevice,
  requireActiveDevice,
  logDeviceActivity,
  DeviceController.getPendingCommands
)

// Update command response (Device authentication required)
router.post('/command/:commandId/response',
  authenticateDevice,
  requireActiveDevice,
  logDeviceActivity,
  validateCommandResponse,
  DeviceController.updateCommandResponse
)

export default router