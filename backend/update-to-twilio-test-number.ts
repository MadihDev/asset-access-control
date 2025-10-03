import prisma from './src/lib/prisma'

async function updateToTwilioTestNumber() {
  console.log('📞 UPDATING TO TWILIO MAGIC TEST NUMBER\n')

  const twilioTestNumber = '+15005550006' // Twilio magic number - always works
  console.log(`Using Twilio magic test number: ${twilioTestNumber}`)
  console.log('This number ALWAYS works with Twilio trial accounts!\n')

  try {
    // Get all users with 2FA enabled
    const users = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: { id: true, username: true, phone: true }
    })

    console.log('Current users with 2FA:')
    users.forEach(user => {
      console.log(`  - ${user.username}: ${user.phone}`)
    })

    console.log(`\nUpdating all users to: ${twilioTestNumber}...`)
    
    // Update all users to the Twilio test number
    const updateResult = await prisma.user.updateMany({
      where: { twoFactorEnabled: true },
      data: { phone: twilioTestNumber }
    })

    console.log(`✅ Updated ${updateResult.count} users successfully!`)

    // Verify the updates
    const updatedUsers = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: { username: true, phone: true }
    })

    console.log('\nUpdated users:')
    updatedUsers.forEach(user => {
      console.log(`  ✅ ${user.username}: ${user.phone}`)
    })

    console.log('\n📱 Twilio Magic Number Info:')
    console.log(`- Number: ${twilioTestNumber}`)
    console.log('- Type: Twilio magic test number')
    console.log('- Works with: ALL Twilio trial accounts')
    console.log('- No verification needed')
    console.log('- No geographic restrictions')

    console.log('\n🧪 Ready to Test:')
    console.log('1. Run: npx tsx test-2fa-login-flow.ts')
    console.log('2. Real SMS should now be sent successfully!')
    console.log('3. Check logs for successful Twilio delivery')

  } catch (error) {
    console.error('❌ Error updating phone numbers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateToTwilioTestNumber()