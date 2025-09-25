import { NotificationService, TwilioSmsProvider, MockSmsProvider, TemplateEngine } from '../../src/services/notification.service'
import prisma from '../../src/lib/prisma'
import logger from '../../src/lib/logger'

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
  notificationTemplate: {
    findFirst: jest.fn()
  }
}))

jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}))

// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn()
    }
  }))
})

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_FROM_NUMBER
    delete process.env.ENABLE_SMS_NOTIFICATIONS
  })

  describe('TemplateEngine', () => {
    it('should replace template variables correctly', () => {
      const template = 'Hello {{name}}, your code is {{code}}'
      const variables = { name: 'John', code: '123456' }
      const result = TemplateEngine.render(template, variables)
      expect(result).toBe('Hello John, your code is 123456')
    })

    it('should leave unreplaced variables as-is', () => {
      const template = 'Hello {{name}}, your {{unknown}} code is {{code}}'
      const variables = { name: 'John', code: '123456' }
      const result = TemplateEngine.render(template, variables)
      expect(result).toBe('Hello John, your {{unknown}} code is 123456')
    })
  })

  describe('MockSmsProvider', () => {
    it('should log SMS sending without errors', async () => {
      const provider = new MockSmsProvider()
      await provider.send('+1234567890', 'Test message')
      expect(logger.info).toHaveBeenCalledWith('[MOCK SMS] To: +1234567890, Message: Test message')
    })
  })

  describe('TwilioSmsProvider', () => {
    it('should warn when Twilio is not configured', () => {
      new TwilioSmsProvider()
      expect(logger.warn).toHaveBeenCalledWith('Twilio credentials not configured - SMS notifications disabled')
    })

    it('should initialize when properly configured', () => {
      process.env.TWILIO_ACCOUNT_SID = 'test_sid'
      process.env.TWILIO_AUTH_TOKEN = 'test_token'
      process.env.TWILIO_FROM_NUMBER = '+1234567890'

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')
      const mockClient = {
        messages: {
          create: jest.fn().mockResolvedValue({ sid: 'mock_message_id' })
        }
      }
      twilio.mockReturnValue(mockClient)

      const _provider = new TwilioSmsProvider()
      expect(logger.info).toHaveBeenCalledWith('Twilio SMS provider initialized')
    })
  })

  describe('NotificationService', () => {
    let service: NotificationService

    beforeEach(() => {
      // Force test environment to use MockSmsProvider
      process.env.NODE_ENV = 'test'
      service = new NotificationService()
    })

    it('should send SMS using template', async () => {
      const mockTemplate = {
        id: '1',
        name: 'TEST_SMS',
        type: 'SMS' as const,
        body: 'Hello {{name}}, your code is {{code}}',
        isActive: true
      };

      (prisma.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate)

      await service.sendSms('+1234567890', 'TEST_SMS', { name: 'John', code: '123456' })

      expect(prisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'TEST_SMS',
          type: 'SMS',
          isActive: true
        }
      })
      expect(logger.info).toHaveBeenCalledWith('[MOCK SMS] To: +1234567890, Message: Hello John, your code is 123456')
    })

    it('should throw error when template not found', async () => {
      (prisma.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(service.sendSms('+1234567890', 'NONEXISTENT', {}))
        .rejects.toThrow("SMS template 'NONEXISTENT' not found")
    })

    it('should send 2FA code correctly', async () => {
      await service.send2FACode('+1234567890', '123456')
      
      expect(logger.info).toHaveBeenCalledWith(
        '[MOCK SMS] To: +1234567890, Message: Your verification code is: 123456. This code expires in 5 minutes.'
      )
    })

    it('should send access denied alert', async () => {
      const mockTemplate = {
        id: '1',
        name: 'UNAUTHORIZED_ACCESS_SMS',
        type: 'SMS' as const,
        body: 'ALERT: Unauthorized access attempt at {{lockName}} - {{timestamp}}',
        isActive: true
      };

      (prisma.notificationTemplate.findFirst as jest.Mock).mockResolvedValue(mockTemplate)

      await service.sendAccessDeniedAlert('+1234567890', 'John Doe', 'Main Door')

      expect(logger.info).toHaveBeenCalledWith('SMS notification sent', {
        template: 'UNAUTHORIZED_ACCESS_SMS',
        to: '***-***-7890'
      })
    })

    it('should respect SMS disabled setting', async () => {
      process.env.NODE_ENV = 'production'
      process.env.ENABLE_SMS_NOTIFICATIONS = 'false'
      
      const prodService = new NotificationService()
      await prodService.sendSms('+1234567890', 'TEST_SMS', {})

      expect(logger.debug).toHaveBeenCalledWith('SMS notifications disabled')
    })

    it('should warn about unimplemented email notifications', async () => {
      process.env.ENABLE_EMAIL_NOTIFICATIONS = 'true'
      
      await service.sendEmail('test@example.com', 'TEST_EMAIL', {})
      
      expect(logger.warn).toHaveBeenCalledWith('Email notifications not yet implemented')
    })
  })
})