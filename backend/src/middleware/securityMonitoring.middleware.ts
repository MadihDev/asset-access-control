import { Request, Response, NextFunction } from 'express';
import securityMonitoringService from '../services/securityMonitoring.service';
import { SecurityEventType } from '../types/securityEvents';

/**
 * Security event middleware to capture security-relevant events
 */
export const securityEventMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Capture response to log security events
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    // Log security-relevant responses
    if (res.statusCode === 401) {
      securityMonitoringService.logSecurityEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        timestamp: new Date(),
        severity: 'MEDIUM',
        userId: (req as any).user?.id,
        sessionId: (req as any).user?.sessionId || (req as any).enhancedAuth?.sessionId,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          body: typeof data === 'string' ? JSON.parse(data || '{}') : data,
        },
        metadata: {
          endpoint: req.path,
          requestId: req.get('X-Request-ID'),
        },
      });
    }

    if (res.statusCode === 403) {
      securityMonitoringService.logSecurityEvent({
        eventType: SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
        timestamp: new Date(),
        severity: 'HIGH',
        userId: (req as any).user?.id || (req as any).enhancedAuth?.user?.id,
        sessionId: (req as any).user?.sessionId || (req as any).enhancedAuth?.sessionId,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          userRole: (req as any).user?.role || (req as any).enhancedAuth?.user?.role,
          requestedPermissions: (req as any).requiredPermissions,
          userPermissions: (req as any).enhancedAuth?.permissions,
        },
        metadata: {
          endpoint: req.path,
          requestId: req.get('X-Request-ID'),
        },
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Rate limit monitoring middleware
 */
export const rateLimitMonitoring = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      securityMonitoringService.logSecurityEvent({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        timestamp: new Date(),
        severity: 'MEDIUM',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          method: req.method,
          rateLimitType: res.get('X-RateLimit-Policy') || 'unknown',
          remainingAttempts: res.get('X-RateLimit-Remaining'),
          resetTime: res.get('X-RateLimit-Reset'),
        },
        metadata: {
          endpoint: req.path,
          requestId: req.get('X-Request-ID'),
        },
      });
    }
  });
  next();
};

/**
 * Authentication event monitoring
 */
export const authEventMonitoring = {
  /**
   * Log successful login
   */
  logLoginSuccess: (userId: string, req: Request, additionalDetails: any = {}) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      timestamp: new Date(),
      severity: 'LOW',
      userId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        ...additionalDetails,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },

  /**
   * Log failed login attempt
   */
  logLoginFailure: (req: Request, reason: string, attemptedUsername?: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.LOGIN_FAILURE,
      timestamp: new Date(),
      severity: 'MEDIUM',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        reason,
        attemptedUsername,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },

  /**
   * Log token refresh
   */
  logTokenRefresh: (userId: string, req: Request, sessionId?: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.TOKEN_REFRESH,
      timestamp: new Date(),
      severity: 'LOW',
      userId,
      sessionId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },

  /**
   * Log token validation failure
   */
  logTokenValidationFailure: (req: Request, reason: string, tokenType?: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.TOKEN_VALIDATION_FAILURE,
      timestamp: new Date(),
      severity: 'MEDIUM',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        reason,
        tokenType,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },
};

/**
 * JWT security event monitoring
 */
export const jwtSecurityMonitoring = {
  /**
   * Log JWT token manipulation attempt
   */
  logTokenManipulation: (req: Request, userId: string, details: any) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.JWT_TOKEN_MANIPULATION,
      timestamp: new Date(),
      severity: 'CRITICAL',
      userId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        ...details,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },

  /**
   * Log IP address mismatch
   */
  logIPMismatch: (req: Request, userId: string, tokenIP: string, requestIP: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.JWT_IP_MISMATCH,
      timestamp: new Date(),
      severity: 'HIGH',
      userId,
      ipAddress: requestIP,
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        tokenIP,
        requestIP,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },
};

/**
 * RFID security event monitoring
 */
export const rfidSecurityMonitoring = {
  /**
   * Log RFID access denied
   */
  logAccessDenied: (cardId: string, lockId: string, reason: string, deviceInfo?: any) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.RFID_ACCESS_DENIED,
      timestamp: new Date(),
      severity: 'MEDIUM',
      ipAddress: deviceInfo?.ipAddress || 'device',
      details: {
        cardId,
        lockId,
        reason,
        deviceInfo,
      },
    });
  },

  /**
   * Log potential card cloning attempt
   */
  logCardCloningAttempt: (cardId: string, lockId: string, suspiciousActivity: any) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.RFID_CARD_CLONING_ATTEMPT,
      timestamp: new Date(),
      severity: 'CRITICAL',
      ipAddress: suspiciousActivity?.deviceIP || 'device',
      details: {
        cardId,
        lockId,
        suspiciousActivity,
        detectionMethod: 'rapid_sequential_attempts',
      },
    });
  },
};

/**
 * Database security monitoring
 */
export const dbSecurityMonitoring = {
  /**
   * Log database connection failure
   */
  logConnectionFailure: (error: string, connectionInfo?: any) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.DATABASE_CONNECTION_FAILURE,
      timestamp: new Date(),
      severity: 'HIGH',
      ipAddress: 'system',
      details: {
        error,
        connectionInfo,
      },
    });
  },

  /**
   * Log slow query
   */
  logSlowQuery: (query: string, duration: number, userId?: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.SLOW_QUERY_DETECTED,
      timestamp: new Date(),
      severity: 'LOW',
      userId,
      ipAddress: 'system',
      details: {
        query: query.substring(0, 200), // Limit query length
        duration,
        threshold: 1000,
      },
    });
  },

  /**
   * Log potential SQL injection attempt
   */
  logSQLInjectionAttempt: (req: Request, suspiciousInput: string, parameter: string) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.SQL_INJECTION_ATTEMPT,
      timestamp: new Date(),
      severity: 'CRITICAL',
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        endpoint: req.path,
        method: req.method,
        suspiciousInput,
        parameter,
        detectionMethod: 'pattern_matching',
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },
};

/**
 * System security monitoring
 */
export const systemSecurityMonitoring = {
  /**
   * Log configuration change
   */
  logConfigurationChange: (userId: string, configKey: string, oldValue: any, newValue: any, req?: Request) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.CONFIGURATION_CHANGE,
      timestamp: new Date(),
      severity: 'MEDIUM',
      userId,
      ipAddress: req?.ip || 'system',
      userAgent: req?.get('User-Agent'),
      details: {
        configKey,
        oldValue,
        newValue,
        endpoint: req?.path,
      },
      metadata: {
        endpoint: req?.path,
        requestId: req?.get('X-Request-ID'),
      },
    });
  },

  /**
   * Log security policy violation
   */
  logSecurityPolicyViolation: (req: Request, policyName: string, violationDetails: any) => {
    securityMonitoringService.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_POLICY_VIOLATION,
      timestamp: new Date(),
      severity: 'HIGH',
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      details: {
        policyName,
        violationDetails,
        endpoint: req.path,
        method: req.method,
      },
      metadata: {
        endpoint: req.path,
        requestId: req.get('X-Request-ID'),
      },
    });
  },
};

/**
 * Middleware to detect and log potential DoS attempts
 */
export const dosDetectionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Simple DoS detection based on request patterns
  // In production, use more sophisticated detection algorithms
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script[^>]*>.*?<\/script>/gi, // XSS attempts
    /union.*select|select.*from|insert.*into|delete.*from/gi, // SQL injection
    /\bexec\b|\beval\b|\bsystem\b/gi, // Command injection
  ];

  const requestContent = JSON.stringify({
    path: req.path,
    query: req.query,
    body: req.body,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestContent)) {
      securityMonitoringService.logSecurityEvent({
        eventType: SecurityEventType.DOS_ATTEMPT_DETECTED,
        timestamp: new Date(),
        severity: 'CRITICAL',
        userId: (req as any).user?.id,
        ipAddress,
        userAgent: req.get('User-Agent'),
        details: {
          endpoint: req.path,
          method: req.method,
          suspiciousPattern: pattern.toString(),
          detectedIn: 'request_content',
          requestContent: requestContent.substring(0, 500), // Limit content
        },
        metadata: {
          endpoint: req.path,
          requestId: req.get('X-Request-ID'),
        },
      });
      break;
    }
  }

  next();
};