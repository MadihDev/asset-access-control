import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'
import logger from '../lib/logger'

// Enhanced security testing bypass function
const shouldBypassRateLimit = (req: Request): boolean => {
  // Always bypass in development when explicitly disabled
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    return true
  }
  
  // Check if rate limiting is explicitly disabled (for development)
  if (process.env.DISABLE_RATE_LIMITING === 'true' && process.env.NODE_ENV !== 'production') {
    return true
  }
  
  // Only allow bypass in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  
  // Check for security testing headers
  const securityTestHeader = req.headers['x-security-test']
  const securityTestKey = req.headers['x-security-test-key']
  
  // Verify both header and secret key for security testing
  return securityTestHeader === 'true' && 
         securityTestKey === process.env.SECURITY_TEST_KEY
}

// Enhanced rate limiting with monitoring and security features
const createEnhancedRateLimiter = (options: any) => {
  const limiter = rateLimit({
    ...options,
    // Enhanced error handling and logging
    handler: (req: Request, res: Response) => {
      // Log rate limit exceeded events for security monitoring
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        rateLimitType: options.name || 'unknown'
      })
      
      res.status(429).json({
        success: false,
        error: options.message?.error || 'Too many requests, please try again later.',
        code: options.message?.code || 'RATE_LIMIT_EXCEEDED',
        retryAfter: options.message?.retryAfter || Math.ceil(options.windowMs / 1000)
      })
    },
    
    // Enhanced headers
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    
    // Skip function for health checks and internal requests
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/api/health') {
        return true
      }
      
      // Skip for internal requests from localhost (if needed)
      if (options.skipLocalhost && req.ip === '127.0.0.1') {
        return true
      }
      
      return false
    }
  })
  
  return (req: Request, res: Response, next: NextFunction) => {
    // DEVELOPMENT: Completely bypass rate limiting if disabled
    if (process.env.DISABLE_RATE_LIMITING === 'true' || process.env.NODE_ENV === 'development') {
      res.setHeader('X-Rate-Limit-Bypass', 'development')
      return next()
    }
    
    // Check if security testing bypass should be applied
    if (shouldBypassRateLimit(req)) {
      // Add special header to indicate bypass is active
      res.setHeader('X-Security-Test-Bypass', 'active')
      return next()
    }
    
    // Apply normal rate limiting
    return limiter(req, res, next)
  }
}

// General API rate limiter with enhanced monitoring
export const apiLimiter = createEnhancedRateLimiter({
  name: 'general_api',
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000), // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX ?? 1000), // Increased from 300 to 1000 per our checklist
  skipLocalhost: false, // Don't skip localhost for security
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000) / 1000)
  }
})

// Stricter limiter for authentication endpoints
export const authLimiter = createEnhancedRateLimiter({
  name: 'authentication',
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000), // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10), // 10 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000) / 1000)
  }
})

// RFID access rate limiting (high frequency expected)
export const rfidAccessLimit = createEnhancedRateLimiter({
  name: 'rfid_access',
  windowMs: 1 * 60 * 1000, // 1 minute
  max: Number(process.env.RFID_RATE_LIMIT_MAX ?? 100), // 100 RFID access attempts per minute
  message: {
    error: 'RFID access rate limit exceeded',
    code: 'RFID_RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  }
})

// Admin operations rate limiting
export const adminRateLimit = createEnhancedRateLimiter({
  name: 'admin_operations',
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: Number(process.env.ADMIN_RATE_LIMIT_MAX ?? 200), // 200 admin operations per 5 minutes
  message: {
    error: 'Admin operation rate limit exceeded',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 300
  }
})

// User management rate limiting
export const userManagementLimit = createEnhancedRateLimiter({
  name: 'user_management',
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: Number(process.env.USER_MGMT_RATE_LIMIT_MAX ?? 50), // 50 user operations per 10 minutes
  message: {
    error: 'User management rate limit exceeded',
    code: 'USER_MGMT_RATE_LIMIT_EXCEEDED',
    retryAfter: 600
  }
})

// Bulk operations limiter (maintained for compatibility)
export const bulkLimiter = createEnhancedRateLimiter({
  name: 'bulk_operations',
  windowMs: Number(process.env.BULK_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  max: Number(process.env.BULK_RATE_LIMIT_MAX ?? 10),
  message: {
    error: 'Too many bulk operations, please slow down.',
    code: 'BULK_RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(Number(process.env.BULK_RATE_LIMIT_WINDOW_MS ?? 60 * 1000) / 1000)
  }
})

// Rate limit info middleware to provide policy information
export const rateLimitInfo = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-RateLimit-Policy', 'General API: 1000/15min, Auth: 10/15min, RFID: 100/1min, Admin: 200/5min')
  next()
}
