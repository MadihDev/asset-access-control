import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import NotificationService from './notification.service'
import { TwoFactorChallengeResponse } from '../types'

export class TwoFactorService {
  private readonly CODE_LENGTH = 6
  private readonly DEFAULT_TTL_SEC = 300 // 5 minutes
  private readonly DEFAULT_MAX_ATTEMPTS = 5
  private readonly DEFAULT_RESEND_COOLDOWN_SEC = 30

  /**
   * Create a new 2FA challenge for a user
   */
  async createChallenge(userId: string, phone: string): Promise<TwoFactorChallengeResponse> {
    try {
      // Generate 6-digit code
      const code = this.generateCode()
      const codeHash = await bcrypt.hash(code, 10)
      
      // Clean up any existing challenges for this user
      await this.cleanupUserChallenges(userId)
      
      // Create new challenge
      const expiresAt = new Date(Date.now() + this.getTtlMs())
      const challenge = await prisma.twoFactorChallenge.create({
        data: {
          userId,
          codeHash,
          expiresAt,
          attempts: 0,
          maxAttempts: this.getMaxAttempts(),
          method: 'sms'
        }
      })

      // Send SMS
      await NotificationService.send2FACode(phone, code)

      logger.info('2FA challenge created', { 
        challengeId: challenge.id, 
        userId,
        phone: this.maskPhoneNumber(phone)
      })

      return {
        challengeId: challenge.id,
        method: 'sms',
        maskedPhone: this.maskPhoneNumber(phone),
        expiresIn: this.getTtlSec()
      }
    } catch (error) {
      logger.error('Failed to create 2FA challenge', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('Failed to create verification challenge')
    }
  }

  /**
   * Verify a 2FA code
   */
  async verifyChallenge(challengeId: string, code: string): Promise<{ success: boolean; userId?: string; attemptsRemaining?: number }> {
    try {
      const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { id: challengeId },
        include: { user: true }
      })

      if (!challenge) {
        logger.warn('2FA challenge not found', { challengeId })
        return { success: false }
      }

      // Check if expired
      if (challenge.expiresAt < new Date()) {
        logger.warn('2FA challenge expired', { challengeId })
        await this.deleteChallenge(challengeId)
        return { success: false }
      }

      // Check if locked out
      if (challenge.attempts >= challenge.maxAttempts) {
        logger.warn('2FA challenge locked out', { challengeId, attempts: challenge.attempts })
        return { success: false, attemptsRemaining: 0 }
      }

      // Verify code
      const isValid = await bcrypt.compare(code, challenge.codeHash)
      
      if (isValid) {
        // Success - cleanup challenge
        await this.deleteChallenge(challengeId)
        logger.info('2FA challenge verified successfully', { 
          challengeId, 
          userId: challenge.userId 
        })
        return { success: true, userId: challenge.userId }
      } else {
        // Increment attempts
        const updatedChallenge = await prisma.twoFactorChallenge.update({
          where: { id: challengeId },
          data: { attempts: challenge.attempts + 1 }
        })

        const attemptsRemaining = challenge.maxAttempts - updatedChallenge.attempts
        logger.warn('2FA challenge verification failed', { 
          challengeId, 
          attempts: updatedChallenge.attempts,
          attemptsRemaining
        })

        return { success: false, attemptsRemaining }
      }
    } catch (error) {
      logger.error('Error verifying 2FA challenge', { 
        challengeId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('Verification failed')
    }
  }

  /**
   * Resend verification code
   */
  async resendChallenge(challengeId: string): Promise<{ success: boolean; expiresIn?: number }> {
    try {
      const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { id: challengeId },
        include: { user: true }
      })

      if (!challenge) {
        logger.warn('2FA challenge not found for resend', { challengeId })
        return { success: false }
      }

      // Check if expired
      if (challenge.expiresAt < new Date()) {
        logger.warn('2FA challenge expired on resend', { challengeId })
        await this.deleteChallenge(challengeId)
        return { success: false }
      }

      // Check rate limiting (basic implementation)
      const recentUpdate = challenge.updatedAt.getTime() > Date.now() - (this.getResendCooldownSec() * 1000)
      if (recentUpdate) {
        logger.warn('2FA resend rate limited', { challengeId })
        return { success: false }
      }

      if (!challenge.user.phone) {
        logger.error('User has no phone number for 2FA resend', { 
          challengeId, 
          userId: challenge.userId 
        })
        return { success: false }
      }

      // Generate new code and extend expiry
      const code = this.generateCode()
      const codeHash = await bcrypt.hash(code, 10)
      const expiresAt = new Date(Date.now() + this.getTtlMs())

      await prisma.twoFactorChallenge.update({
        where: { id: challengeId },
        data: {
          codeHash,
          expiresAt,
          attempts: 0, // Reset attempts on resend
          updatedAt: new Date()
        }
      })

      // Send new SMS
      await NotificationService.send2FACode(challenge.user.phone, code)

      logger.info('2FA challenge resent', { 
        challengeId, 
        userId: challenge.userId,
        phone: this.maskPhoneNumber(challenge.user.phone)
      })

      return { success: true, expiresIn: this.getTtlSec() }
    } catch (error) {
      logger.error('Error resending 2FA challenge', { 
        challengeId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw new Error('Failed to resend verification code')
    }
  }

  /**
   * Check if 2FA is enabled for the system
   */
  is2FAEnabled(): boolean {
    return process.env.TWOFA_ENABLED === 'true'
  }

  /**
   * Check if user has 2FA enabled and phone configured
   */
  async isUser2FAReady(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, phone: true }
    })

    return Boolean(user?.twoFactorEnabled && user?.phone)
  }

  /**
   * Clean up expired challenges (called periodically)
   */
  async cleanupExpiredChallenges(): Promise<number> {
    const result = await prisma.twoFactorChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired 2FA challenges`)
    }

    return result.count
  }

  /**
   * Private helper methods
   */
  private generateCode(): string {
    // Generate cryptographically secure 6-digit code
    const buffer = crypto.randomBytes(4)
    const num = buffer.readUInt32BE(0)
    return String(num % 1000000).padStart(this.CODE_LENGTH, '0')
  }

  private async cleanupUserChallenges(userId: string): Promise<void> {
    await prisma.twoFactorChallenge.deleteMany({
      where: { userId }
    })
  }

  private async deleteChallenge(challengeId: string): Promise<void> {
    await prisma.twoFactorChallenge.delete({
      where: { id: challengeId }
    }).catch(() => {
      // Ignore errors if already deleted
    })
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone
    return `***-***-${phone.slice(-4)}`
  }

  private getTtlSec(): number {
    const envValue = process.env.TWOFA_CODE_TTL_SEC
    return envValue ? parseInt(envValue, 10) : this.DEFAULT_TTL_SEC
  }

  private getTtlMs(): number {
    return this.getTtlSec() * 1000
  }

  private getMaxAttempts(): number {
    const envValue = process.env.TWOFA_MAX_ATTEMPTS
    return envValue ? parseInt(envValue, 10) : this.DEFAULT_MAX_ATTEMPTS
  }

  private getResendCooldownSec(): number {
    const envValue = process.env.TWOFA_RESEND_COOLDOWN_SEC
    return envValue ? parseInt(envValue, 10) : this.DEFAULT_RESEND_COOLDOWN_SEC
  }
}

export default new TwoFactorService()