import { Request, Response, NextFunction } from 'express'
import AuthService from '../services/auth.service'
import { UserRole } from '../types'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required'
      })
      return
    }

    const user = await AuthService.validateToken(token)
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
      return
    }

    req.user = user
    next()
  } catch (_error) {
    res.status(401).json({
      success: false,
      error: 'Token validation failed'
    })
  }
}

export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
      return
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      })
      return
    }

    next()
  }
}

export const requireAdmin = requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN])
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN)
export const requireManagerOrAbove = requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR])

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (token) {
      const user = await AuthService.validateToken(token)
      req.user = user
    }

    next()
  } catch (_error) {
    // Continue without authentication for optional auth
    next()
  }
}