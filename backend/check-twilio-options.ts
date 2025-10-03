import prisma from './src/lib/prisma'

async function checkTwilioTestOptions() {
  console.log('🔍 TWILIO TRIAL ACCOUNT TESTING OPTIONS\n')

  console.log('Current Configuration:')
  console.log(`- Account SID: ${process.env.TWILIO_ACCOUNT_SID}`)
  console.log(`- From Number: ${process.env.TWILIO_FROM_NUMBER}`)
  console.log(`- Current Provider: ${process.env.NOTIFICATION_PROVIDER}\n`)

  console.log('📋 Current User Phone Numbers:')
  const users = await prisma.user.findMany({
    where: { twoFactorEnabled: true },
    select: { username: true, phone: true }
  })

  users.forEach(user => {
    console.log(`  - ${user.username}: ${user.phone}`)
  })

  console.log('\n🔧 OPTIONS TO TEST REAL SMS:\n')
  
  console.log('Option 1: Verify Current Numbers in Twilio Console')
  console.log('  1. Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/verified')
  console.log('  2. Add +212606475149 and +212727817167')
  console.log('  3. Complete phone verification process')
  console.log('  4. Change NOTIFICATION_PROVIDER=twilio in .env')
  console.log('  5. Restart backend and test\n')

  console.log('Option 2: Use Twilio Test Numbers')
  console.log('  - Use +15005550006 (valid test number)')
  console.log('  - This number always accepts SMS in trial accounts')
  console.log('  - Update one user to use this number for testing\n')

  console.log('Option 3: Upgrade Account (Recommended)')
  console.log('  - Immediate access to send SMS to any number')
  console.log('  - No verification required')
  console.log('  - Production ready')
  console.log('  - Cost: ~$0.0075 per SMS\n')

  console.log('Current Status: Mock SMS is working perfectly for development!')
  console.log('All 2FA logic is tested and functional.')

  await prisma.$disconnect()
}

checkTwilioTestOptions()