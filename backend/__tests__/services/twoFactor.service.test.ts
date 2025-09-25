import TwoFactorService from '../../src/services/twoFactor.service'
import NotificationService from '../../src/services/notification.service'
import prisma from '../../src/lib/prisma'
import logger from '../../src/lib/logger'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
  twoFactorChallenge: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  }
}))

jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}))

jest.mock('../../src/services/notification.service', () => ({
  send2FACode: jest.fn()
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}))

describe('TwoFactorService', () => {
  const mockUserId = 'user123'
  const mockPhone = '+1234567890'
  const mockChallengeId = 'challenge123'
  const mockCode = '123456'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.TWOFA_ENABLED = 'true'
    process.env.TWOFA_CODE_TTL_SEC = '300'
    process.env.TWOFA_MAX_ATTEMPTS = '5'
  })

  describe('createChallenge', () => {
    it('should create a new 2FA challenge successfully', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(),
        attempts: 0,
        maxAttempts: 5,
        method: 'sms'
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      (prisma.twoFactorChallenge.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.twoFactorChallenge.create as jest.Mock).mockResolvedValue(mockChallenge);
      (NotificationService.send2FACode as jest.Mock).mockResolvedValue(undefined)

      const result = await TwoFactorService.createChallenge(mockUserId, mockPhone)

      expect(prisma.twoFactorChallenge.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId }
      })
      expect(prisma.twoFactorChallenge.create).toHaveBeenCalled()
      expect(NotificationService.send2FACode).toHaveBeenCalledWith(mockPhone, expect.any(String))
      expect(result).toEqual({
        challengeId: mockChallengeId,
        method: 'sms',
        maskedPhone: '***-***-7890',
        expiresIn: 300
      })
      expect(logger.info).toHaveBeenCalledWith('2FA challenge created', expect.any(Object))
    })

    it('should handle SMS sending failure', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      (prisma.twoFactorChallenge.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.twoFactorChallenge.create as jest.Mock).mockResolvedValue({
        id: mockChallengeId,
        userId: mockUserId
      });
      (NotificationService.send2FACode as jest.Mock).mockRejectedValue(new Error('SMS failed'))

      await expect(TwoFactorService.createChallenge(mockUserId, mockPhone))
        .rejects.toThrow('Failed to create verification challenge')

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('verifyChallenge', () => {
    it('should verify a valid challenge successfully', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(Date.now() + 300000), // 5 minutes future
        attempts: 0,
        maxAttempts: 5,
        user: { id: mockUserId }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.twoFactorChallenge.delete as jest.Mock).mockResolvedValue(mockChallenge)

      const result = await TwoFactorService.verifyChallenge(mockChallengeId, mockCode)

      expect(result).toEqual({
        success: true,
        userId: mockUserId
      })
      expect(prisma.twoFactorChallenge.delete).toHaveBeenCalledWith({
        where: { id: mockChallengeId }
      })
      expect(logger.info).toHaveBeenCalledWith('2FA challenge verified successfully', expect.any(Object))
    })

    it('should return false for invalid code', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0,
        maxAttempts: 5,
        user: { id: mockUserId }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.twoFactorChallenge.update as jest.Mock).mockResolvedValue({
        ...mockChallenge,
        attempts: 1
      })

      const result = await TwoFactorService.verifyChallenge(mockChallengeId, 'wrongcode')

      expect(result).toEqual({
        success: false,
        attemptsRemaining: 4
      })
      expect(prisma.twoFactorChallenge.update).toHaveBeenCalledWith({
        where: { id: mockChallengeId },
        data: { attempts: 1 }
      })
      expect(logger.warn).toHaveBeenCalledWith('2FA challenge verification failed', expect.any(Object))
    })

    it('should return false for non-existent challenge', async () => {
      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await TwoFactorService.verifyChallenge(mockChallengeId, mockCode)

      expect(result).toEqual({ success: false })
      expect(logger.warn).toHaveBeenCalledWith('2FA challenge not found', { challengeId: mockChallengeId })
    })

    it('should return false for expired challenge', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        attempts: 0,
        maxAttempts: 5,
        user: { id: mockUserId }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (prisma.twoFactorChallenge.delete as jest.Mock).mockResolvedValue(mockChallenge)

      const result = await TwoFactorService.verifyChallenge(mockChallengeId, mockCode)

      expect(result).toEqual({ success: false })
      expect(prisma.twoFactorChallenge.delete).toHaveBeenCalledWith({
        where: { id: mockChallengeId }
      })
      expect(logger.warn).toHaveBeenCalledWith('2FA challenge expired', { challengeId: mockChallengeId })
    })

    it('should return false for locked out challenge', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 5,
        maxAttempts: 5,
        user: { id: mockUserId }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge)

      const result = await TwoFactorService.verifyChallenge(mockChallengeId, mockCode)

      expect(result).toEqual({
        success: false,
        attemptsRemaining: 0
      })
      expect(logger.warn).toHaveBeenCalledWith('2FA challenge locked out', expect.any(Object))
    })
  })

  describe('resendChallenge', () => {
    it('should resend challenge successfully', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'oldHashedCode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 2,
        maxAttempts: 5,
        updatedAt: new Date(Date.now() - 60000), // 1 minute ago
        user: { id: mockUserId, phone: mockPhone }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedCode');
      (prisma.twoFactorChallenge.update as jest.Mock).mockResolvedValue({
        ...mockChallenge,
        attempts: 0
      });
      (NotificationService.send2FACode as jest.Mock).mockResolvedValue(undefined)

      const result = await TwoFactorService.resendChallenge(mockChallengeId)

      expect(result).toEqual({
        success: true,
        expiresIn: 300
      })
      expect(prisma.twoFactorChallenge.update).toHaveBeenCalledWith({
        where: { id: mockChallengeId },
        data: {
          codeHash: 'newHashedCode',
          expiresAt: expect.any(Date),
          attempts: 0,
          updatedAt: expect.any(Date)
        }
      })
      expect(NotificationService.send2FACode).toHaveBeenCalledWith(mockPhone, expect.any(String))
      expect(logger.info).toHaveBeenCalledWith('2FA challenge resent', expect.any(Object))
    })

    it('should return false for user without phone', async () => {
      const mockChallenge = {
        id: mockChallengeId,
        userId: mockUserId,
        codeHash: 'hashedCode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0,
        maxAttempts: 5,
        updatedAt: new Date(Date.now() - 60000),
        user: { id: mockUserId, phone: null }
      };

      (prisma.twoFactorChallenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge)

      const result = await TwoFactorService.resendChallenge(mockChallengeId)

      expect(result).toEqual({ success: false })
      expect(logger.error).toHaveBeenCalledWith('User has no phone number for 2FA resend', expect.any(Object))
    })
  })

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', () => {
      process.env.TWOFA_ENABLED = 'true'
      expect(TwoFactorService.is2FAEnabled()).toBe(true)
    })

    it('should return false when 2FA is disabled', () => {
      process.env.TWOFA_ENABLED = 'false'
      expect(TwoFactorService.is2FAEnabled()).toBe(false)
    })
  })

  describe('cleanupExpiredChallenges', () => {
    it('should clean up expired challenges', async () => {
      (prisma.twoFactorChallenge.deleteMany as jest.Mock).mockResolvedValue({ count: 3 })

      const result = await TwoFactorService.cleanupExpiredChallenges()

      expect(result).toBe(3)
      expect(prisma.twoFactorChallenge.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      })
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 3 expired 2FA challenges')
    })

    it('should not log when no challenges to clean up', async () => {
      (prisma.twoFactorChallenge.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

      const result = await TwoFactorService.cleanupExpiredChallenges()

      expect(result).toBe(0)
      expect(logger.info).not.toHaveBeenCalled()
    })
  })
})