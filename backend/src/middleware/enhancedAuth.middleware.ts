import { Request, Response, NextFunction } from 'express';
import enhancedAuthService, { TokenValidationResult } from '../services/enhancedAuth.service';
import logger from '../lib/logger';

// Extend Express Request to include enhanced authentication data
declare global {
  namespace Express {
    interface Request {
      enhancedAuth?: {
        user: any;
        permissions: string[];
        sessionId: string;
        tokenInfo: TokenValidationResult;
      };
    }
  }
}

/**
 * Enhanced JWT authentication middleware with RFC 7519 compliance
 * and comprehensive security features
 */
export const enhancedAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create request info for security validation
    const requestInfo = {
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
    };

    // Validate token with enhanced security checks
    const validationResult = await enhancedAuthService.validateEnhancedToken(token, requestInfo);

    if (!validationResult) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
        code: 'TOKEN_INVALID'
      });
      return;
    }

    // Attach enhanced authentication data to request
    req.enhancedAuth = {
      user: validationResult.user,
      permissions: validationResult.permissions,
      sessionId: validationResult.sessionId,
      tokenInfo: validationResult,
    };

    // Log successful authentication for security monitoring
    logger.debug('Enhanced authentication successful', {
      userId: validationResult.user.id,
      sessionId: validationResult.sessionId,
      endpoint: req.path,
      permissions: validationResult.permissions.length,
      ipAddress: requestInfo.ipAddress,
    });

    next();
  } catch (error) {
    logger.error('Enhanced authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.path,
      ipAddress: req.ip,
    });

    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Enhanced authorization middleware for role-based access control
 */
export const enhancedAuthorizationMiddleware = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.enhancedAuth) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const userPermissions = req.enhancedAuth.permissions;
    
    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(permission => {
      // Exact match
      if (userPermissions.includes(permission)) {
        return true;
      }
      
      // Wildcard match (e.g., 'read:all' covers 'read:tenant')
      if (permission.includes(':')) {
        const [action] = permission.split(':');
        return userPermissions.includes(`${action}:all`);
      }
      
      return false;
    });

    if (!hasPermission) {
      logger.warn('Enhanced authorization failed', {
        userId: req.enhancedAuth.user.id,
        requiredPermissions,
        userPermissions,
        endpoint: req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        available: userPermissions,
      });
      return;
    }

    next();
  };
};

/**
 * Enhanced admin-only middleware
 */
export const enhancedAdminOnly = enhancedAuthorizationMiddleware([
  'access:admin',
  'manage:system'
]);

/**
 * Enhanced supervisor or admin middleware
 */
export const enhancedSupervisorOrAdmin = enhancedAuthorizationMiddleware([
  'access:admin',
  'access:supervisor',
  'manage:system',
  'manage:users:tenant'
]);

/**
 * Middleware to validate IP address for high-security operations
 */
export const enhancedIPValidationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.enhancedAuth) {
    res.status(401).json({
      success: false,
      error: 'Authentication required for IP validation',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const tokenInfo = req.enhancedAuth.tokenInfo;
  const currentIP = req.ip || req.connection.remoteAddress || 'unknown';

  // Check if token has IP information and if it matches
  if (tokenInfo.decoded.ipAddress && tokenInfo.decoded.ipAddress !== currentIP) {
    logger.error('IP address validation failed for high-security operation', {
      userId: req.enhancedAuth.user.id,
      tokenIP: tokenInfo.decoded.ipAddress,
      requestIP: currentIP,
      endpoint: req.path,
      sessionId: req.enhancedAuth.sessionId,
    });

    res.status(403).json({
      success: false,
      error: 'IP address validation failed for security-critical operation',
      code: 'IP_VALIDATION_FAILED'
    });
    return;
  }

  next();
};

/**
 * Helper function to check if user has specific permission
 */
export const hasPermission = (req: Request, permission: string): boolean => {
  if (!req.enhancedAuth) {
    return false;
  }

  const userPermissions = req.enhancedAuth.permissions;
  
  // Exact match
  if (userPermissions.includes(permission)) {
    return true;
  }
  
  // Wildcard match (e.g., 'read:all' covers 'read:tenant')
  if (permission.includes(':')) {
    const [action] = permission.split(':');
    return userPermissions.includes(`${action}:all`);
  }
  
  return false;
};

/**
 * Helper function to get current user from enhanced auth
 */
export const getCurrentUser = (req: Request): any | null => {
  return req.enhancedAuth?.user || null;
};

/**
 * Helper function to get user permissions
 */
export const getUserPermissions = (req: Request): string[] => {
  return req.enhancedAuth?.permissions || [];
};

/**
 * Helper function to get session ID
 */
export const getSessionId = (req: Request): string | null => {
  return req.enhancedAuth?.sessionId || null;
};