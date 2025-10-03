import prisma from './src/lib/prisma'
import { TwoFactorService } from './src/services/twoFactor.service'
import { MockSmsProvider } from './src/services/notification.service'
import logger from './src/lib/logger'

async function testWithMockSms() {
  console.log('🔍 Testing 2FA with Mock SMS Provider\n')

  try {
    // Get a test user
    const user = await prisma.user.findFirst({
      where: { 
        twoFactorEnabled: true,
        phone: { not: null }
      }
    })

    if (!user) {
      console.log('❌ No user found with 2FA enabled and phone number')
      return
    }

    console.log(`Test user: ${user.username} (${user.phone})\n`)

    // Test mock SMS provider directly
    console.log('Testing MockSmsProvider...')
    const mockSms = new MockSmsProvider()
    await mockSms.send(user.phone!, 'Test message')
    console.log('✓ MockSmsProvider works\n')

    // Test 2FA service
    console.log('Testing TwoFactorService with mock SMS...')
    
    // Temporarily set environment to use mock
    const originalEnv = process.env.NOTIFICATION_PROVIDER
    process.env.NOTIFICATION_PROVIDER = 'mock'
    
    const twoFactorService = new TwoFactorService()
    const result = await twoFactorService.createChallenge(user.id, user.phone!)
    console.log('✓ TwoFactorService.createChallenge succeeded with mock SMS:', result)
    
    // Restore environment
    process.env.NOTIFICATION_PROVIDER = originalEnv

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testWithMockSms()