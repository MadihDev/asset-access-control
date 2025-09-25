import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRfidAssignment() {
  console.log('🔍 Testing RFID assignment and user data...\n')
  
  try {
    // Get Mike Davis and check his current RFID card
    console.log('1. Mike Davis before RFID assignment:')
    const mikeBefore = await prisma.user.findUnique({
      where: { username: 'mike.davis' },
      include: {
        rfidKeys: {
          where: { isActive: true },
          select: {
            id: true,
            cardId: true,
            name: true,
            isActive: true,
            issuedAt: true,
            expiresAt: true
          }
        }
      }
    })
    console.log(JSON.stringify(mikeBefore, null, 2))
    
    // Check for any active RFID cards for Mike
    console.log('\n2. All RFID cards for Mike (active and inactive):')
    const mikeCards = await prisma.rFIDKey.findMany({
      where: { userId: mikeBefore?.id },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        issuedAt: true,
        expiresAt: true
      }
    })
    console.log(JSON.stringify(mikeCards, null, 2))
    
    // Check available cards
    console.log('\n3. Available RFID cards (inactive):')
    const availableCards = await prisma.rFIDKey.findMany({
      where: { 
        isActive: false,
        user: { projectCityId: mikeBefore?.projectCityId }
      },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        userId: true
      }
    })
    console.log(JSON.stringify(availableCards, null, 2))
    
    // Simulate RFID assignment (assign TEST001 to Mike)
    if (availableCards.length > 0) {
      console.log('\n4. Simulating RFID assignment...')
      const cardToAssign = availableCards[0]
      const assignedCard = await prisma.rFIDKey.update({
        where: { id: cardToAssign.id },
        data: {
          userId: mikeBefore?.id,
          name: `Card for ${mikeBefore?.firstName} ${mikeBefore?.lastName}`,
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      })
      console.log('Assigned card:', JSON.stringify(assignedCard, null, 2))
      
      // Check Mike's data after assignment
      console.log('\n5. Mike Davis after RFID assignment:')
      const mikeAfter = await prisma.user.findUnique({
        where: { username: 'mike.davis' },
        include: {
          rfidKeys: {
            where: { isActive: true },
            select: {
              id: true,
              cardId: true,
              name: true,
              isActive: true,
              issuedAt: true,
              expiresAt: true
            }
          }
        }
      })
      console.log(JSON.stringify(mikeAfter, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRfidAssignment()