// Simple database check using existing backend structure
import prisma from './src/lib/prisma.js'

async function checkDatabaseData() {
  try {
    console.log('🗄️ Checking database data directly...\n')
    
    // Get all addresses with counts
    console.log('1️⃣ Addresses in database:')
    const addresses = await prisma.address.findMany({
      include: {
        city: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            locks: true
          }
        }
      },
      take: 5 // Limit to first 5 for easier reading
    })
    
    console.log(`Found ${addresses.length} addresses (showing first 5):`)
    
    for (const address of addresses) {
      console.log(`\n📍 ${address.street} ${address.number}, ${address.city.name}`)
      console.log(`   ID: ${address.id}`)
      console.log(`   Locks count from _count: ${address._count.locks}`)
      
      // Get actual locks
      const actualLocks = await prisma.lock.findMany({
        where: { addressId: address.id },
        include: {
          _count: {
            select: { permissions: true }
          }
        }
      })
      console.log(`   Actual locks found: ${actualLocks.length}`)
      
      // Get users with permissions
      const usersWithAccess = await prisma.user.findMany({
        where: {
          permissions: {
            some: {
              lock: { addressId: address.id },
              canAccess: true
            }
          }
        },
        include: {
          rfidKeys: {
            where: { isActive: true }
          }
        }
      })
      console.log(`   Users with access: ${usersWithAccess.length}`)
      
      // Get RFID keys
      const rfidKeys = await prisma.rfidKey.findMany({
        where: {
          user: {
            permissions: {
              some: {
                lock: { addressId: address.id },
                canAccess: true
              }
            }
          },
          isActive: true
        }
      })
      console.log(`   Active RFID keys: ${rfidKeys.length}`)
      
      // Show lock details
      if (actualLocks.length > 0) {
        console.log(`   Lock details:`)
        actualLocks.forEach(lock => {
          console.log(`     - ${lock.name} (${lock.lockType || 'Unknown'}) - ${lock._count.permissions} permissions`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseData()