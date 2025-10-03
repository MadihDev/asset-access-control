import { Router, Request, Response } from 'express';
import enhancedAuthService from '../services/enhancedAuth.service';
import authService from '../services/auth.service';
import logger from '../lib/logger';

const router = Router();

/**
 * Enhanced token refresh endpoint with comprehensive security
 * POST /api/auth/refresh-enhanced
 */
router.post('/refresh-enhanced', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Validate refresh token with enhanced security
    const tokenValidation = await enhancedAuthService.validateRefreshToken(refreshToken);

    if (!tokenValidation) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Get user data (in production, this would fetch from database)
    // For now, we'll use the existing auth service to get user data
    try {
      // Create a temporary JWT to get user data through existing system
      const tempUser = await authService.validateToken(
        // This is a workaround - in production you'd fetch user directly by ID
        `temp_${tokenValidation.sub}`
      );

      if (!tempUser) {
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        });
      }

      // Create session info
      const sessionInfo = enhancedAuthService.createSessionInfo(req);
      
      // Generate new enhanced tokens
      const newAccessToken = enhancedAuthService.generateAccessToken(tempUser, sessionInfo);
      const newRefreshToken = enhancedAuthService.generateRefreshToken(tempUser, sessionInfo);

      // Log successful token refresh
      logger.info('Enhanced token refresh successful', {
        userId: tempUser.id,
        sessionId: sessionInfo.sessionId,
        ipAddress: sessionInfo.ipAddress,
        oldSessionId: tokenValidation.sessionId,
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: 3600, // 1 hour
          sessionId: sessionInfo.sessionId,
        }
      });

    } catch (userFetchError) {
      logger.error('Failed to fetch user for token refresh', {
        userId: tokenValidation.sub,
        error: userFetchError instanceof Error ? userFetchError.message : 'Unknown error'
      });

      return res.status(401).json({
        success: false,
        error: 'User validation failed',
        code: 'USER_VALIDATION_FAILED'
      });
    }

  } catch (error) {
    logger.error('Enhanced token refresh failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip,
    });

    res.status(500).json({
      success: false,
      error: 'Token refresh service error',
      code: 'REFRESH_SERVICE_ERROR'
    });
  }
});

/**
 * Enhanced login endpoint with enhanced JWT tokens
 * POST /api/auth/login-enhanced
 */
router.post('/login-enhanced', async (req: Request, res: Response) => {
  try {
    // Use existing login logic but generate enhanced tokens
    const loginResult = await authService.login(req.body);

    if (!loginResult.user) {
      return res.status(401).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_FAILED'
      });
    }

    // Create session info for enhanced tokens
    const sessionInfo = enhancedAuthService.createSessionInfo(req);

    // Generate enhanced tokens
    const enhancedAccessToken = enhancedAuthService.generateAccessToken(loginResult.user, sessionInfo);
    const enhancedRefreshToken = enhancedAuthService.generateRefreshToken(loginResult.user, sessionInfo);

    // Log successful enhanced login
    logger.info('Enhanced login successful', {
      userId: loginResult.user.id,
      sessionId: sessionInfo.sessionId,
      ipAddress: sessionInfo.ipAddress,
      userAgent: sessionInfo.userAgent,
    });

    res.json({
      success: true,
      data: {
        user: loginResult.user,
        accessToken: enhancedAccessToken,
        refreshToken: enhancedRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600, // 1 hour
        sessionId: sessionInfo.sessionId,
        enhanced: true, // Flag to indicate enhanced JWT
      }
    });

  } catch (error) {
    logger.error('Enhanced login failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip,
      username: req.body.username,
    });

    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * Token validation endpoint to test enhanced JWT functionality
 * POST /api/auth/validate-enhanced
 */
router.post('/validate-enhanced', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        code: 'TOKEN_MISSING'
      });
    }

    // Create request info
    const requestInfo = {
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      endpoint: '/api/auth/validate-enhanced',
    };

    // Validate token
    const validationResult = await enhancedAuthService.validateEnhancedToken(token, requestInfo);

    if (!validationResult) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: validationResult.user,
        permissions: validationResult.permissions,
        sessionId: validationResult.sessionId,
        tokenInfo: {
          issuer: validationResult.decoded.iss,
          audience: validationResult.decoded.aud,
          expiresAt: new Date(validationResult.decoded.exp * 1000).toISOString(),
          issuedAt: new Date(validationResult.decoded.iat * 1000).toISOString(),
          tokenId: validationResult.decoded.jti,
          tokenType: validationResult.decoded.tokenType,
        }
      }
    });

  } catch (_error) {
    res.status(500).json({
      success: false,
      error: 'Token validation service error',
      code: 'VALIDATION_SERVICE_ERROR'
    });
  }
});

export default router;