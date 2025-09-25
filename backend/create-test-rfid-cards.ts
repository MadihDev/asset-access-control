import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestRfidCards() {
  console.log('🏷️ Creating test RFID cards...\n')
  
  try {
    // Get a PerfectIT user to assign test cards to (initially)
    const testUser = await prisma.user.findFirst({
      where: { username: 'john.smith' },
      select: { id: true }
    })
    
    if (!testUser) {
      console.log('❌ No test user found!')
      return
    }
    
    // Create some test RFID cards
    const testCards = [
      'TEST001',
      'TEST002', 
      'TEST003',
      'TEST004',
      'TEST005'
    ]
    
    console.log('Creating test RFID cards...')
    for (const cardId of testCards) {
      try {
        await prisma.rFIDKey.create({
          data: {
            cardId: cardId,
            name: `Test Card ${cardId}`,
            userId: testUser.id,
            isActive: false, // Make them inactive so they appear as "available"
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          }
        })
        console.log(`✅ Created card: ${cardId}`)
      } catch (error) {
        console.log(`⚠️ Card ${cardId} might already exist`)
      }
    }
    
    console.log('\n🔍 Checking available cards...')
    const availableCards = await prisma.rFIDKey.findMany({
      where: {
        isActive: false
      },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    console.log('Available RFID cards:', availableCards)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestRfidCards()