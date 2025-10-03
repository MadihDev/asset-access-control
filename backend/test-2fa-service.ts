import prisma from './src/lib/prisma'
import { TwoFactorService } from './src/services/twoFactor.service'

async function testTwoFactorServiceWithTwilio() {
  console.log('🔍 Testing TwoFactorService with Twilio...\n')

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

    console.log(`Test user: ${user.username} (${user.phone})`)
    console.log(`Environment: NOTIFICATION_PROVIDER=${process.env.NOTIFICATION_PROVIDER}\n`)

    // Test TwoFactorService
    const twoFactorService = new TwoFactorService()
    console.log('Creating 2FA challenge...')
    
    const result = await twoFactorService.createChallenge(user.id, user.phone!)
    
    console.log('✅ 2FA Challenge created successfully!')
    console.log('Challenge details:', result)
    console.log('\n📱 If using Twilio, check your phone for SMS!')
    console.log(`Phone: ${user.phone}`)

  } catch (error) {
    console.error('❌ TwoFactorService test failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testTwoFactorServiceWithTwilio()