import prisma from './src/lib/prisma'

async function updateToTwilioTestNumbers() {
  console.log('🔧 UPDATING TO TWILIO TEST NUMBERS\n')
  console.log('This will temporarily change phone numbers to Twilio test numbers that work with trial accounts.\n')

  // Twilio Magic Test Numbers (always work with trial accounts)
  const testNumbers = [
    '+15005550006', // Valid test number - always succeeds
    '+15005550001', // Valid test number - always succeeds  
  ]

  try {
    const users = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: { id: true, username: true, phone: true }
    })

    console.log('Current users with 2FA:')
    users.forEach(user => {
      console.log(`  - ${user.username}: ${user.phone}`)
    })

    console.log('\nUpdating to Twilio test numbers...')
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const testNumber = testNumbers[i % testNumbers.length]
      
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: testNumber }
      })
      
      console.log(`✅ Updated ${user.username}: ${user.phone} → ${testNumber}`)
    }

    console.log('\n📱 Test Numbers Info:')
    console.log('- +15005550006: Always accepts SMS (valid)')
    console.log('- +15005550001: Always accepts SMS (valid)')
    console.log('\n🔧 Next Steps:')
    console.log('1. Change NOTIFICATION_PROVIDER=twilio in .env')
    console.log('2. Restart backend server')
    console.log('3. Test 2FA flow - should receive real SMS!')
    console.log('\n⚠️  Note: These are US test numbers for development only')
    console.log('   For production, use real phone numbers with upgraded account')

  } catch (error) {
    console.error('❌ Error updating phone numbers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateToTwilioTestNumbers()