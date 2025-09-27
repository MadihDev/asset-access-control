import { Request, Response, NextFunction } from 'express'
import DeviceService from '../services/device.service'
import { Device } from '../types'

// Extend Request type to include device
declare module 'express' {
  interface Request {
    device?: Device
  }
}

/**
 * Middleware to authenticate devices using deviceId and secretKey
 */
export const authenticateDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.headers['x-device-id'] as string
    const secretKey = req.headers['x-device-secret'] as string

    if (!deviceId || !secretKey) {
      return res.status(401).json({
        success: false,
        error: 'Device authentication required. Provide x-device-id and x-device-secret headers'
      })
    }

    const device = await DeviceService.authenticate(deviceId, secretKey)

    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Invalid device credentials'
      })
    }

    // Attach device to request
    req.device = device

    next()
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Device authentication failed'
    })
  }
}

/**
 * Middleware to check if device is online and active
 */
export const requireActiveDevice = (req: Request, res: Response, next: NextFunction) => {
  if (!req.device) {
    return res.status(401).json({
      success: false,
      error: 'Device authentication required'
    })
  }

  if (req.device.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: `Device is ${req.device.status.toLowerCase()}. Only active devices can perform this action`
    })
  }

  next()
}

/**
 * Middleware to validate device type for specific operations
 */
export const requireDeviceType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.device) {
      return res.status(401).json({
        success: false,
        error: 'Device authentication required'
      })
    }

    if (!allowedTypes.includes(req.device.deviceType)) {
      return res.status(403).json({
        success: false,
        error: `Device type ${req.device.deviceType} is not authorized for this operation`
      })
    }

    next()
  }
}

/**
 * Rate limiting middleware for device endpoints
 */
export const deviceRateLimit = (windowMs: number = 60000, maxRequests: number = 100) => {
  const deviceRequestCounts = new Map<string, { count: number; windowStart: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    const deviceId = req.headers['x-device-id'] as string

    if (!deviceId) {
      return next() // Let authenticateDevice handle missing deviceId
    }

    const now = Date.now()
    const deviceData = deviceRequestCounts.get(deviceId)

    if (!deviceData || now - deviceData.windowStart > windowMs) {
      // New window or first request
      deviceRequestCounts.set(deviceId, { count: 1, windowStart: now })
      return next()
    }

    if (deviceData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Too many requests from this device'
      })
    }

    // Increment count
    deviceData.count++
    deviceRequestCounts.set(deviceId, deviceData)

    next()
  }
}

/**
 * Middleware to log device activity
 */
export const logDeviceActivity = (req: Request, res: Response, next: NextFunction) => {
  if (req.device) {
    // Update last seen timestamp
    DeviceService.ping(req.device.deviceId, {
      deviceId: req.device.deviceId
    }).catch(error => {
      console.error('Failed to update device last seen:', error)
    })
  }

  next()
}