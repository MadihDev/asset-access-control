import prisma from './src/lib/prisma'
import { TwoFactorService } from './src/services/twoFactor.service'
import { NotificationService } from './src/services/notification.service'
import logger from './src/lib/logger'

async function debugTwoFactorChallenge() {
  console.log('🔍 Debug: 2FA Challenge Creation\n')

  try {
    // Check environment variables
    console.log('Environment variables:')
    console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing'}`)
    console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing'}`)
    console.log(`- TWILIO_FROM_NUMBER: ${process.env.TWILIO_FROM_NUMBER ? '✓ Set' : '✗ Missing'}`)
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`- NOTIFICATION_PROVIDER: ${process.env.NOTIFICATION_PROVIDER || 'Not set'}\n`)

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

    // Initialize services
    console.log('Initializing services...')
    const twoFactorService = new TwoFactorService()
    const notificationService = new NotificationService()

    // Test just the notification service first
    console.log('Testing NotificationService.send2FACode...')
    try {
      await notificationService.send2FACode(user.phone!, '123456')
      console.log('✓ NotificationService.send2FACode succeeded')
    } catch (error) {
      console.log('❌ NotificationService.send2FACode failed:', error instanceof Error ? error.message : error)
      return
    }

    console.log('\nTesting TwoFactorService.createChallenge...')
    try {
      const result = await twoFactorService.createChallenge(user.id, user.phone!)
      console.log('✓ TwoFactorService.createChallenge succeeded:', result)
    } catch (error) {
      console.log('❌ TwoFactorService.createChallenge failed:', error instanceof Error ? error.message : error)
      console.log('Full error:', error)
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugTwoFactorChallenge()