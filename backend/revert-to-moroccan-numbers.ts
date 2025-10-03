import prisma from './src/lib/prisma'

async function revertToMoroccanNumbers() {
  console.log('🇲🇦 REVERTING TO MOROCCAN PHONE NUMBERS\n')

  const moroccanNumbers = ['+212606475149', '+212727817167']
  
  try {
    // Get all users with 2FA enabled
    const users = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: { id: true, username: true, phone: true },
      orderBy: { username: 'asc' }
    })

    console.log('Current users with 2FA:')
    users.forEach(user => {
      console.log(`  - ${user.username}: ${user.phone}`)
    })

    console.log('\nReverting to Moroccan phone numbers...')
    
    // Update users to Moroccan numbers
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const moroccanNumber = moroccanNumbers[i % moroccanNumbers.length]
      
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: moroccanNumber }
      })
      
      console.log(`✅ Updated ${user.username}: ${user.phone} → ${moroccanNumber}`)
    }

    // Verify the updates
    const updatedUsers = await prisma.user.findMany({
      where: { twoFactorEnabled: true },
      select: { username: true, phone: true },
      orderBy: { username: 'asc' }
    })

    console.log('\n📱 Updated users with Moroccan numbers:')
    updatedUsers.forEach(user => {
      console.log(`  ✅ ${user.username}: ${user.phone}`)
    })

    console.log('\n🇲🇦 Moroccan Phone Numbers Info:')
    console.log('- Primary: +212606475149')
    console.log('- Secondary: +212727817167') 
    console.log('- Country: Morocco (+212)')
    console.log('- SMS Provider: Mock (logs codes to console)')

    console.log('\n🔧 Current Configuration:')
    console.log('- NOTIFICATION_PROVIDER=mock (perfect for development)')
    console.log('- Real SMS codes logged to backend console')
    console.log('- No Twilio permissions needed')
    console.log('- Full 2FA testing capability')

    console.log('\n🧪 Ready to Test:')
    console.log('1. Start backend: npm run dev')
    console.log('2. Run: npx tsx test-2fa-login-flow.ts')
    console.log('3. Check console for SMS codes')
    console.log('4. Test frontend login with 2FA')

  } catch (error) {
    console.error('❌ Error updating phone numbers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

revertToMoroccanNumbers()