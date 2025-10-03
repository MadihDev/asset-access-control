import jwt from 'jsonwebtoken';
import logger from '../lib/logger';
import { User, UserRole } from '../types';
import { randomUUID } from 'crypto';

// Enhanced JWT payload interface with RFC 7519 compliance
export interface EnhancedJWTPayload {
  // Standard JWT Claims (RFC 7519)
  iss: string;        // Issuer
  sub: string;        // Subject (User ID)
  aud: string;        // Audience
  exp: number;        // Expiration Time
  nbf: number;        // Not Before
  iat: number;        // Issued At
  jti: string;        // JWT ID

  // Custom Application Claims
  email: string;
  role: string;
  projectCityId?: string;

  // Security Enhancement Claims
  scope: string[];    // User permissions/scope
  tenant?: string;    // Tenant identifier
  sessionId: string;  // Session tracking
  tokenType: 'access' | 'refresh';

  // Security metadata
  ipAddress?: string;
  userAgent?: string;
}

// Session information interface
export interface SessionInfo {
  sessionId: string;
  ipAddress: string;
  userAgent?: string;
}

// Token validation result interface
export interface TokenValidationResult {
  user: User;
  decoded: EnhancedJWTPayload;
  sessionId: string;
  permissions: string[];
}

export class EnhancedAuthService {
  private readonly issuer = 'rfid-access-control-system';
  private readonly audience = 'rfid-system-clients';
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  }

  /**
   * Generate enhanced access token with RFC 7519 compliance
   */
  generateAccessToken(user: User, sessionInfo: SessionInfo): string {
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + 60 * 60; // 1 hour

    const payload: EnhancedJWTPayload = {
      // Standard claims
      iss: this.issuer,
      sub: user.id,
      aud: this.audience,
      exp: expiration,
      nbf: now,
      iat: now,
      jti: randomUUID(),

      // Application claims
      email: user.email,
      role: user.role,
      projectCityId: user.projectCityId,

      // Security claims
      scope: this.getUserPermissions(user.role),
      tenant: user.projectCityId,
      sessionId: sessionInfo.sessionId,
      tokenType: 'access',

      // Security metadata
      ipAddress: sessionInfo.ipAddress,
      userAgent: sessionInfo.userAgent?.substring(0, 200), // Limit length
    };

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate enhanced refresh token
   */
  generateRefreshToken(user: User, sessionInfo: SessionInfo): string {
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + 7 * 24 * 60 * 60; // 7 days

    const payload: Partial<EnhancedJWTPayload> = {
      iss: this.issuer,
      sub: user.id,
      aud: this.audience,
      exp: expiration,
      iat: now,
      jti: randomUUID(),
      tokenType: 'refresh',
      sessionId: sessionInfo.sessionId,
    };

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Enhanced token validation with comprehensive security checks
   */
  async validateEnhancedToken(
    token: string, 
    requestInfo: { ipAddress: string; userAgent?: string; endpoint?: string }
  ): Promise<TokenValidationResult | null> {
    try {
      // Decode and verify JWT
      const decoded = jwt.verify(token, this.jwtSecret) as EnhancedJWTPayload;

      // Validate standard claims
      const now = Math.floor(Date.now() / 1000);
      
      if (decoded.exp <= now) {
        throw new Error('Token expired');
      }

      if (decoded.nbf && decoded.nbf > now) {
        throw new Error('Token not yet valid');
      }

      if (decoded.iss !== this.issuer) {
        throw new Error('Invalid token issuer');
      }

      if (decoded.aud !== this.audience) {
        throw new Error('Invalid token audience');
      }

      if (!decoded.jti) {
        throw new Error('Missing JWT ID claim');
      }

      // Validate token type
      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type for access token validation');
      }

      // Additional security validations for high-security operations
      if (this.shouldValidateIP(decoded.scope || [])) {
        if (decoded.ipAddress && decoded.ipAddress !== requestInfo.ipAddress) {
          logger.warn('Token IP address mismatch detected', {
            tokenIP: decoded.ipAddress,
            requestIP: requestInfo.ipAddress,
            userId: decoded.sub,
            endpoint: requestInfo.endpoint,
            jti: decoded.jti,
          });
          
          // For admin operations, strictly enforce IP validation
          if (this.isAdminOperation(decoded.scope || [])) {
            throw new Error('IP address validation failed for admin operation');
          }
        }
      }

      // Track token usage for security monitoring
      await this.trackTokenUsage(decoded.jti, requestInfo);

      // Create mock user object for validation
      // In production, this would fetch from database
      const user: User = {
        id: decoded.sub,
        email: decoded.email,
        username: '', // Would be fetched from DB
        firstName: '', // Would be fetched from DB
        lastName: '', // Would be fetched from DB
        role: decoded.role as UserRole,
        isActive: true,
        projectCityId: decoded.projectCityId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        user,
        decoded,
        sessionId: decoded.sessionId,
        permissions: decoded.scope || [],
      };

    } catch (error) {
      logger.warn(`Enhanced token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Get user permissions based on role
   */
  private getUserPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      ADMIN: [
        'read:all',
        'write:all',
        'delete:all',
        'manage:users',
        'manage:system',
        'access:admin',
      ],
      SUPERVISOR: [
        'read:tenant',
        'write:tenant',
        'manage:users:tenant',
        'access:supervisor',
      ],
      USER: [
        'read:own',
        'write:own',
        'access:rfid',
        'access:user',
      ],
    };

    return permissions[role] || ['read:own'];
  }

  /**
   * Check if IP validation should be enforced for these scopes
   */
  private shouldValidateIP(scope: string[]): boolean {
    // Validate IP for admin and management operations
    return scope.some(s => 
      s.includes('manage:') || 
      s.includes('delete:') || 
      s.includes('admin')
    );
  }

  /**
   * Check if this is an admin operation requiring strict IP validation
   */
  private isAdminOperation(scope: string[]): boolean {
    return scope.some(s => 
      s.includes('manage:system') || 
      s.includes('delete:all') ||
      s === 'access:admin'
    );
  }

  /**
   * Track token usage for security monitoring
   */
  private async trackTokenUsage(
    jti: string, 
    requestInfo: { ipAddress: string; userAgent?: string; endpoint?: string }
  ): Promise<void> {
    try {
      // Log token usage for security monitoring
      logger.info('Enhanced JWT token usage tracked', {
        tokenId: jti,
        timestamp: new Date().toISOString(),
        endpoint: requestInfo.endpoint,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent?.substring(0, 100),
      });

      // In production, you might want to store this in a database
      // for security analysis and anomaly detection
    } catch (error) {
      logger.error('Failed to track token usage', {
        jti,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate session ID for tracking
   */
  generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Create session info from request
   */
  createSessionInfo(req: any): SessionInfo {
    return {
      sessionId: this.generateSessionId(),
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
    };
  }

  /**
   * Validate refresh token with enhanced checks
   */
  async validateRefreshToken(token: string): Promise<{ sub: string; sessionId: string; jti: string } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as Partial<EnhancedJWTPayload>;

      // Validate standard claims
      const now = Math.floor(Date.now() / 1000);
      
      if (!decoded.exp || decoded.exp <= now) {
        throw new Error('Refresh token expired');
      }

      if (decoded.iss !== this.issuer) {
        throw new Error('Invalid refresh token issuer');
      }

      if (decoded.aud !== this.audience) {
        throw new Error('Invalid refresh token audience');
      }

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type for refresh token validation');
      }

      if (!decoded.sub || !decoded.sessionId || !decoded.jti) {
        throw new Error('Missing required refresh token claims');
      }

      return {
        sub: decoded.sub,
        sessionId: decoded.sessionId,
        jti: decoded.jti,
      };

    } catch (error) {
      logger.warn(`Refresh token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}

// Export singleton instance
export default new EnhancedAuthService();