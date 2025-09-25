import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { NotificationType } from '@prisma/client'

// Base interface for notification providers
export interface NotificationProvider {
  send(to: string, message: string, subject?: string): Promise<void>
}

// SMS Provider interface
export interface SmsProvider extends NotificationProvider {
  send(to: string, message: string): Promise<void>
}

// Email Provider interface  
export interface EmailProvider extends NotificationProvider {
  send(to: string, message: string, subject: string): Promise<void>
}

// Twilio SMS Provider implementation
export class TwilioSmsProvider implements SmsProvider {
  private client: any
  private fromNumber: string

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID || ''

    if (!accountSid || !authToken || !this.fromNumber) {
      logger.warn('Twilio credentials not configured - SMS notifications disabled')
      return
    }

    try {
      // Dynamic import to avoid errors when Twilio is not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')
      this.client = twilio(accountSid, authToken)
      logger.info('Twilio SMS provider initialized')
    } catch (_error) {
      logger.warn('Twilio package not found - install with: npm install twilio')
    }
  }

  async send(to: string, message: string): Promise<void> {
    if (!this.client) {
      logger.warn('Twilio not configured - skipping SMS send')
      return
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      })
      
      logger.info(`SMS sent successfully`, { 
        messageId: result.sid, 
        to: this.maskPhoneNumber(to) 
      })
    } catch (error) {
      logger.error('Failed to send SMS', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        to: this.maskPhoneNumber(to) 
      })
      throw new Error('SMS delivery failed')
    }
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone
    return `***-***-${phone.slice(-4)}`
  }
}

// Mock SMS Provider for development/testing
export class MockSmsProvider implements SmsProvider {
  async send(to: string, message: string): Promise<void> {
    logger.info(`[MOCK SMS] To: ${to}, Message: ${message}`)
  }
}

// Template variable replacement utility
export class TemplateEngine {
  static render(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match
    })
  }
}

// Main notification service
export class NotificationService {
  private smsProvider: SmsProvider
  private emailProvider?: EmailProvider

  constructor() {
    // Initialize SMS provider based on environment
    if (process.env.NODE_ENV === 'test' || process.env.NOTIFICATION_PROVIDER === 'mock') {
      this.smsProvider = new MockSmsProvider()
    } else {
      this.smsProvider = new TwilioSmsProvider()
    }
  }

  /**
   * Send SMS notification using template
   */
  async sendSms(to: string, templateName: string, variables: Record<string, any> = {}): Promise<void> {
    if (!this.isSmsEnabled()) {
      logger.debug('SMS notifications disabled')
      return
    }

    try {
      const template = await this.getTemplate(templateName, 'SMS')
      if (!template) {
        throw new Error(`SMS template '${templateName}' not found`)
      }

      const message = TemplateEngine.render(template.body, variables)
      await this.smsProvider.send(to, message)

      logger.info('SMS notification sent', { 
        template: templateName, 
        to: this.maskPhoneNumber(to) 
      })
    } catch (error) {
      logger.error('Failed to send SMS notification', { 
        template: templateName, 
        error: error instanceof Error ? error.message : 'Unknown error',
        to: this.maskPhoneNumber(to)
      })
      throw error
    }
  }

  /**
   * Send email notification using template (placeholder for future implementation)
   */
  async sendEmail(to: string, templateName: string, _variables: Record<string, any> = {}): Promise<void> {
    if (!this.isEmailEnabled()) {
      logger.debug('Email notifications disabled')
      return
    }

    logger.warn('Email notifications not yet implemented')
  }

  /**
   * Send 2FA verification code via SMS
   */
  async send2FACode(phone: string, code: string): Promise<void> {
    const message = `Your verification code is: ${code}. This code expires in 5 minutes.`
    await this.smsProvider.send(phone, message)
  }

  /**
   * Send access denied alert
   */
  async sendAccessDeniedAlert(phone: string, userName: string, lockName: string): Promise<void> {
    await this.sendSms(phone, 'UNAUTHORIZED_ACCESS_SMS', {
      userName,
      lockName,
      timestamp: new Date().toLocaleString()
    })
  }

  /**
   * Send card expiry warning
   */
  async sendCardExpiryWarning(email: string, cardId: string, expiryDate: string): Promise<void> {
    await this.sendEmail(email, 'CARD_EXPIRY_WARNING', {
      cardId,
      expiryDate
    })
  }

  /**
   * Get notification template from database
   */
  private async getTemplate(name: string, type: NotificationType) {
    return await prisma.notificationTemplate.findFirst({
      where: {
        name,
        type,
        isActive: true
      }
    })
  }

  /**
   * Check if SMS notifications are enabled
   */
  private isSmsEnabled(): boolean {
    return process.env.ENABLE_SMS_NOTIFICATIONS === 'true' || 
           process.env.NODE_ENV === 'development' ||
           process.env.NODE_ENV === 'test'
  }

  /**
   * Check if email notifications are enabled
   */
  private isEmailEnabled(): boolean {
    return process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone
    return `***-***-${phone.slice(-4)}`
  }
}

export default new NotificationService()