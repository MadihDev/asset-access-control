import request from 'supertest'
import express from 'express'
import authRoutes from '../../src/routes/auth.routes'
import { UserRole } from '../../src/types'

// Mock all services - using require to avoid TS issues
const TwoFactorService = require('../../src/services/twoFactor.service').default
const AuthService = require('../../src/services/auth.service').default
const AuditService = require('../../src/services/audit.service').default

jest.mock('../../src/services/twoFactor.service')
jest.mock('../../src/services/auth.service') 
jest.mock('../../src/services/audit.service')

const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Auth Controller - 2FA Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/2fa/verify', () => {
    it('should verify 2FA challenge successfully', async () => {
      const mockTokens = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.USER,
          isActive: true,
          createdAt: expect.any(String), // Dates are serialized as strings
          updatedAt: expect.any(String)
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 86400
      };

      TwoFactorService.verifyChallenge.mockResolvedValue({
        success: true,
        userId: 'user123'
      });
      AuthService.generateTokensForUser.mockResolvedValue(mockTokens);
      AuditService.log.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440000',
          code: '123456'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('2FA verification successful')
      expect(response.body.data).toMatchObject({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 86400,
        user: {
          id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          isActive: true
        }
      })
      expect(TwoFactorService.verifyChallenge).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', '123456')
      expect(AuthService.generateTokensForUser).toHaveBeenCalledWith('user123')
      expect(AuditService.log).toHaveBeenCalled()
    })

    it('should return error for invalid code', async () => {
      TwoFactorService.verifyChallenge.mockResolvedValue({
        success: false,
        attemptsRemaining: 3
      })

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440001',
          code: '123456'
        })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining: 3
      })
    })

    it('should validate challengeId and code', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: '',
          code: '12345' // Too short
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'challengeId',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'code',
            message: expect.any(String)
          })
        ])
      )
    })

    it('should handle missing challengeId', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          code: '123456'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'challengeId',
            message: expect.any(String)
          })
        ])
      )
    })

    it('should handle missing code', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440000'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'code',
            message: expect.any(String)
          })
        ])
      )
    })

    it('should handle verification service errors', async () => {
      TwoFactorService.verifyChallenge.mockRejectedValue(
        new Error('Verification failed')
      )

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440002',
          code: '123456'
        })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Verification failed'
      })
    })
  })

  describe('POST /api/auth/2fa/resend', () => {
    it('should resend 2FA code successfully', async () => {
      TwoFactorService.resendChallenge.mockResolvedValue({
        success: true,
        expiresIn: 300
      })

      const response = await request(app)
        .post('/api/auth/2fa/resend')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440003'
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        message: 'Verification code resent',
        expiresIn: 300
      })
      expect(TwoFactorService.resendChallenge).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440003')
    })

    it('should return error when resend fails', async () => {
      TwoFactorService.resendChallenge.mockResolvedValue({
        success: false
      })

      const response = await request(app)
        .post('/api/auth/2fa/resend')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440004'
        })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to resend verification code'
      })
    })

    it('should validate challengeId', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/resend')
        .send({
          challengeId: 'invalid-id'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should handle missing challengeId', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/resend')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'challengeId',
            message: expect.any(String)
          })
        ])
      )
    })

    it('should handle resend service errors', async () => {
      TwoFactorService.resendChallenge.mockRejectedValue(
        new Error('Failed to resend code')
      )

      const response = await request(app)
        .post('/api/auth/2fa/resend')
        .send({
          challengeId: '550e8400-e29b-41d4-a716-446655440005'
        })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to resend code'
      })
    })
  })
})