import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugAvailableItems() {
  console.log('🔍 Debugging available locks and RFID cards...\n')
  
  try {
    // Check PerfectIT project and users
    console.log('1. Checking PerfectIT users...')
    const perfectitUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: 'john.smith' },
          { username: 'sarah.johnson' },
          { username: 'mike.davis' }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        projectCityId: true
      }
    })
    console.log('PerfectIT users:', perfectitUsers)
    
    if (perfectitUsers.length === 0) {
      console.log('❌ No PerfectIT users found!')
      return
    }
    
    const johnSmith = perfectitUsers.find(u => u.username === 'john.smith')
    if (!johnSmith) {
      console.log('❌ John Smith not found!')
      return
    }
    
    console.log(`\n2. Checking locks for project-city: ${johnSmith.projectCityId}`)
    const allLocks = await prisma.lock.findMany({
      where: {
        projectCityId: johnSmith.projectCityId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        deviceId: true,
        projectCityId: true
      }
    })
    console.log('All locks:', allLocks)
    
    console.log(`\n3. Checking permissions for John Smith...`)
    const johnPermissions = await prisma.userPermission.findMany({
      where: {
        userId: johnSmith.id,
        canAccess: true
      },
      select: {
        id: true,
        lockId: true,
        lock: {
          select: {
            name: true,
            deviceId: true
          }
        }
      }
    })
    console.log('John\'s permissions:', johnPermissions)
    
    console.log(`\n4. Checking available locks for John Smith...`)
    const availableLocks = await prisma.lock.findMany({
      where: {
        isActive: true,
        projectCityId: johnSmith.projectCityId,
        NOT: {
          permissions: {
            some: {
              userId: johnSmith.id,
              canAccess: true
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        deviceId: true
      }
    })
    console.log('Available locks for John:', availableLocks)
    
    console.log(`\n5. Checking all RFID cards...`)
    const allRfidCards = await prisma.rFIDKey.findMany({
      select: {
        id: true,
        cardId: true,
        userId: true,
        isActive: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true
          }
        }
      }
    })
    console.log('All RFID cards:', allRfidCards)
    
    console.log(`\n6. Checking available RFID cards...`)
    const availableRfidCards = await prisma.rFIDKey.findMany({
      where: {
        OR: [
          { userId: { equals: null } },
          { 
            AND: [
              { userId: { not: null } },
              { isActive: false }
            ]
          }
        ]
      },
      select: {
        id: true,
        cardId: true,
        userId: true,
        isActive: true
      }
    })
    console.log('Available RFID cards:', availableRfidCards)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAvailableItems()