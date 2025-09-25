import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAPILogic() {
  console.log('🧪 Testing API endpoint logic...\n')
  
  try {
    // Get PerfectIT Administrator details
    const perfectitAdmin = await prisma.user.findUnique({
      where: { username: 'perfectitadmin' },
      select: {
        id: true,
        username: true,
        role: true,
        projectCityId: true
      }
    })
    
    console.log('1. PerfectIT Administrator:', perfectitAdmin)
    
    if (!perfectitAdmin) {
      console.log('❌ Admin not found!')
      return
    }
    
    // Get Mike Davis details
    const mikeDavis = await prisma.user.findUnique({
      where: { username: 'mike.davis' },
      select: {
        id: true,
        username: true,
        projectCityId: true
      }
    })
    
    console.log('2. Mike Davis:', mikeDavis)
    
    if (!mikeDavis) {
      console.log('❌ Mike not found!')
      return
    }
    
    // Test the exact query from getAvailableForUser (for locks)
    console.log('\n3. Testing available locks query for Mike...')
    const availableLocks = await prisma.lock.findMany({
      where: {
        isActive: true,
        projectCityId: perfectitAdmin.projectCityId,
        NOT: {
          permissions: {
            some: {
              userId: mikeDavis.id,
              canAccess: true
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        lockType: true,
        isActive: true,
        isOnline: true,
        address: {
          select: { 
            street: true, 
            number: true, 
            zipCode: true, 
            city: { 
              select: { id: true, name: true } 
            } 
          }
        }
      }
    })
    console.log(`Available locks for Mike: ${availableLocks.length}`)
    console.log(JSON.stringify(availableLocks, null, 2))
    
    // Test the exact query from getAvailableCards (for RFID)
    console.log('\n4. Testing available RFID cards query...')
    const availableCards = await prisma.rFIDKey.findMany({
      where: {
        isActive: false, // Only inactive cards are available for reassignment
        user: { projectCityId: perfectitAdmin.projectCityId }
      },
      orderBy: { cardId: 'asc' },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        issuedAt: true,
        expiresAt: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true
          }
        }
      }
    })
      orderBy: { cardId: 'asc' },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        issuedAt: true,
        expiresAt: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true
          }
        }
      }
    })
    console.log(`Available RFID cards: ${availableCards.length}`)
    console.log(JSON.stringify(availableCards, null, 2))
    
    // Test middleware role check
    console.log('\n5. Testing role permissions...')
    console.log(`Admin role: ${perfectitAdmin.role}`)
    console.log(`Is ADMIN or above: ${['ADMIN', 'SUPER_ADMIN'].includes(perfectitAdmin.role)}`)
    console.log(`requireManagerOrAbove allows: ${['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(perfectitAdmin.role)}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPILogic()