import prisma from './src/lib/prisma'

async function updateAllUsersToSingleNumber() {
  console.log('📞 UPDATING ALL USERS TO +13462127336\n')

  const newPhoneNumber = '+13462127336'

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

    console.log(`\nUpdating all users to: ${newPhoneNumber}...`)
    
    // Update all users to the new phone number
    const updateResult = await prisma.user.updateMany({
      where: { twoFactorEnabled: true },
      data: { phone: newPhoneNumber }
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

    console.log('\n📱 Phone Number Info:')
    console.log(`- Number: ${newPhoneNumber}`)
    console.log('- Type: US number (should work with Twilio trial)')
    console.log('- All 2FA SMS will be sent to this number')

    console.log('\n🔧 Next Steps:')
    console.log('1. Verify this number in Twilio Console if needed:')
    console.log('   https://console.twilio.com/us1/develop/phone-numbers/manage/verified')
    console.log('2. Change NOTIFICATION_PROVIDER=twilio in .env')
    console.log('3. Restart backend server')
    console.log('4. Test 2FA login flow')

  } catch (error) {
    console.error('❌ Error updating phone numbers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAllUsersToSingleNumber()