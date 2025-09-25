const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCurrentTimeAndPermissions() {
  try {
    const cardNumber = 'TEST_SINGLE_CARD_1758603770664_3'
    const now = new Date()
    
    console.log('🕒 CURRENT TIME ANALYSIS')
    console.log('=' .repeat(60))
    console.log(`Current time: ${now}`)
    console.log(`Current timestamp: ${now.getTime()}`)
    
    // Find the RFID card
    const rfidKey = await prisma.rFIDKey.findUnique({
      where: { cardId: cardNumber },
      include: { user: true }
    })
    
    console.log(`\n👤 User: ${rfidKey.user.email}`)
    
    // Get all user permissions with detailed time analysis
    const allPermissions = await prisma.userPermission.findMany({
      where: { userId: rfidKey.user.id },
      include: {
        lock: {
          include: { address: true }
        }
      }
    })
    
    console.log('\n🔍 DETAILED PERMISSION TIME ANALYSIS:')
    console.log('=' .repeat(60))
    
    const targetLocks = [
      'Server Room Lock',
      'Lock-PerfectIT Solutions Main St-123', 
      'Lock-PerfectIT Solutions Broadway-456'
    ]
    
    for (const perm of allPermissions) {
      const isTarget = targetLocks.includes(perm.lock.name)
      const marker = isTarget ? '🎯' : '📋'
      
      console.log(`\n${marker} ${perm.lock.name}`)
      console.log(`   Can Access: ${perm.canAccess}`)
      console.log(`   Valid From: ${perm.validFrom}`)
      console.log(`   Valid To: ${perm.validTo || 'No expiration'}`)
      
      if (perm.validTo) {
        const isExpired = perm.validTo < now
        const timeLeft = perm.validTo.getTime() - now.getTime()
        const minutesLeft = Math.round(timeLeft / (1000 * 60))
        
        console.log(`   🕒 Time Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`)
        if (!isExpired) {
          console.log(`   ⏰ Time remaining: ${minutesLeft} minutes`)
        } else {
          console.log(`   ⏰ Expired ${Math.abs(minutesLeft)} minutes ago`)
        }
      }
      
      // Calculate final access status
      const hasValidTime = !perm.validTo || perm.validTo >= now
      const finalAccess = perm.canAccess && hasValidTime && perm.lock.isActive && perm.lock.isOnline
      
      console.log(`   🚪 Final Access: ${finalAccess ? '🟢 GRANTED' : '🔴 DENIED'}`)
      
      if (isTarget) {
        console.log(`   >>> TARGET LOCK ANALYSIS <<<`)
        console.log(`       Can Access: ${perm.canAccess}`)
        console.log(`       Time Valid: ${hasValidTime}`)
        console.log(`       Lock Active: ${perm.lock.isActive}`)
        console.log(`       Lock Online: ${perm.lock.isOnline}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentTimeAndPermissions()