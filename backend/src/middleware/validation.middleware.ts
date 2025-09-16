import { Request, Response, NextFunction } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole, LockType, AccessType, AccessResult } from '../types'

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg
      }))
    })
    return
  }
  
  next()
}

// Accept either UUID (v4) or Prisma CUID
const isId = (value: string): boolean => {
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  // CUID2 starts with 'c' and has 24+ chars; legacy cuid starts with 'c' and 25 chars
  const cuidLike = /^c[a-z0-9]{24,}$/i
  return uuidV4.test(value) || cuidLike.test(value)
}

// Auth validation rules
export const validateLogin = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('cityId')
    .notEmpty()
    .withMessage('City is required'),
  handleValidationErrors
]

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  handleValidationErrors
]

export const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors
]

// User validation rules
export const validateCreateUser = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('firstName')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters')
    .trim(),
  body('lastName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters')
    .trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  handleValidationErrors
]

export const validateUpdateUser = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be less than 100 characters')
    .trim(),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be less than 100 characters')
    .trim(),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid user role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors
]

// Lock validation rules
export const validateCreateLock = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Lock name is required and must be less than 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim(),
  body('deviceId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device ID is required and must be less than 100 characters')
    .trim(),
  body('lockType')
    .isIn(Object.values(LockType))
    .withMessage('Invalid lock type'),
  body('addressId')
    .custom((v) => isId(v))
    .withMessage('Valid address ID is required'),
  handleValidationErrors
]

export const validateUpdateLock = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Lock name must be less than 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim(),
  body('lockType')
    .optional()
    .isIn(Object.values(LockType))
    .withMessage('Invalid lock type'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('addressId')
    .optional()
    .custom((v) => isId(v))
    .withMessage('Valid address ID is required'),
  handleValidationErrors
]

// Access attempt validation rules
export const validateAccessAttempt = [
  body('cardId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Card ID is required and must be less than 100 characters')
    .trim(),
  body('lockId')
    .custom((v) => isId(v))
    .withMessage('Valid lock ID is required'),
  body('accessType')
    .optional()
    .isIn(Object.values(AccessType))
    .withMessage('Invalid access type'),
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  handleValidationErrors
]

// RFID Key validation rules
export const validateCreateRFIDKey = [
  body('cardId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Card ID is required and must be less than 100 characters')
    .trim(),
  body('name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Name must be less than 200 characters')
    .trim(),
  body('userId')
    .custom((v) => isId(v))
    .withMessage('Valid user ID is required'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  handleValidationErrors
]

export const validateUpdateRFIDKey = [
  body('name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Name must be less than 200 characters')
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  handleValidationErrors
]

// Permission validation rules
export const validateCreatePermission = [
  body('userId')
    .custom((v) => isId(v))
    .withMessage('Valid user ID is required'),
  body('lockId')
    .custom((v) => isId(v))
    .withMessage('Valid lock ID is required'),
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('Valid from date must be a valid ISO 8601 date'),
  body('validTo')
    .optional()
    .isISO8601()
    .withMessage('Valid to date must be a valid ISO 8601 date'),
  body('canAccess')
    .optional()
    .isBoolean()
    .withMessage('canAccess must be a boolean'),
  handleValidationErrors
]

export const validateUpdatePermission = [
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('Valid from date must be a valid ISO 8601 date'),
  body('validTo')
    .optional()
    .isISO8601()
    .withMessage('Valid to date must be a valid ISO 8601 date'),
  body('canAccess')
    .optional()
    .isBoolean()
    .withMessage('canAccess must be a boolean'),
  handleValidationErrors
]

// Parameter validation
export const validateUUID = [
  param('id')
    .custom((v) => isId(v))
    .withMessage('Invalid ID format'),
  handleValidationErrors
]

// Query validation
export const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('sortBy')
    .optional()
    .isString()
    .withMessage('Sort by must be a string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  handleValidationErrors
]

export const validateAccessLogQuery = [
  ...validatePaginationQuery.slice(0, -1), // Exclude handleValidationErrors
  query('userId')
    .optional()
    .custom((v) => isId(v))
    .withMessage('User ID must be a valid ID'),
  query('lockId')
    .optional()
    .custom((v) => isId(v))
    .withMessage('Lock ID must be a valid ID'),
  query('result')
    .optional()
    .isIn(Object.values(AccessResult))
    .withMessage('Invalid access result'),
  query('accessType')
    .optional()
    .isIn(Object.values(AccessType))
    .withMessage('Invalid access type'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  handleValidationErrors
]

// Audit log query validation
const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'PERMISSION_GRANT',
  'PERMISSION_REVOKE',
  'ACCESS_ATTEMPT'
] as const

export const validateAuditQuery = [
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
    .toInt(),
  query('sortBy')
    .optional({ values: 'falsy' })
    .isIn(['timestamp', 'action', 'entityType'])
    .withMessage('sortBy must be one of timestamp, action, entityType'),
  query('sortOrder')
    .optional({ values: 'falsy' })
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  query('action')
    .optional({ values: 'falsy' })
    .isIn(AUDIT_ACTIONS as unknown as string[])
    .withMessage('Invalid audit action'),
  query('userId')
    .optional({ values: 'falsy' })
    .custom((v) => isId(v))
    .withMessage('User ID must be a valid ID'),
  query('entityType')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Entity type must be a non-empty string up to 100 chars')
    .trim(),
  query('startDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  // Custom check: startDate <= endDate when both present
  (req: Request, res: Response, next: NextFunction) => {
    const { startDate, endDate } = req.query as Record<string, string>
    if (startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() > e.getTime()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: [{ field: 'dateRange', message: 'startDate cannot be after endDate' }] })
      }
    }
    return next()
  },
  handleValidationErrors
]