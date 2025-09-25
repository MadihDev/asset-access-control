import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUserPermissions() {
  console.log('🔍 Testing user permissions count...\n')
  
  try {
    // Test the exact query from getAllUsers with permissions count
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        projectCityId: 'cmfuzr81u0008qfgkk5hxzzdu' // PerfectIT project-city
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        rfidKeys: {
          where: { isActive: true },
          select: {
            cardId: true,
            issuedAt: true
          }
        },
        _count: {
          select: {
            permissions: {
              where: { canAccess: true }
            }
          }
        }
      }
    })

    console.log('Users with permissions count:')
    users.forEach(user => {
      console.log(`\n${user.firstName} ${user.lastName} (@${user.username})`)
      console.log(`  Role: ${user.role}`)
      console.log(`  RFID Cards: ${user.rfidKeys.length}`)
      if (user.rfidKeys.length > 0) {
        console.log(`    - ${user.rfidKeys[0].cardId}`)
      }
      console.log(`  Permissions: ${user._count.permissions}`)
    })

    // Let's also check Mike's permissions specifically
    console.log('\n📋 Mike Davis detailed permissions:')
    const mike = await prisma.user.findUnique({
      where: { username: 'mike.davis' },
      include: {
        permissions: {
          where: { canAccess: true },
          include: {
            lock: {
              select: {
                name: true,
                deviceId: true
              }
            }
          }
        }
      }
    })

    if (mike) {
      console.log(`Mike has ${mike.permissions.length} permissions:`)
      mike.permissions.forEach(perm => {
        console.log(`  - ${perm.lock.name} (${perm.lock.deviceId})`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testUserPermissions()