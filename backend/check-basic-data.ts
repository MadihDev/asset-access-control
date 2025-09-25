import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBasicData() {
  console.log('🔍 Checking basic database data...\n')
  
  try {
    // Check users
    console.log('1. Users:')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        projectCityId: true
      }
    })
    console.log(users)
    
    // Check locks  
    console.log('\n2. Locks:')
    const locks = await prisma.lock.findMany({
      select: {
        id: true,
        name: true,
        deviceId: true,
        projectCityId: true,
        isActive: true
      }
    })
    console.log(locks)
    
    // Check RFID cards
    console.log('\n3. RFID Cards:')
    const rfidCards = await prisma.rFIDKey.findMany({
      select: {
        id: true,
        cardId: true,
        isActive: true,
        userId: true
      }
    })
    console.log(rfidCards)
    
    // Count inactive RFID cards (these should be "available")
    const inactiveCards = rfidCards.filter(card => !card.isActive)
    console.log(`\n4. Available (inactive) RFID cards: ${inactiveCards.length}`)
    console.log(inactiveCards)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBasicData()