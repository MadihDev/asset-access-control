// Direct database query to check the actual data
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
      }
    })
    
    console.log(`Found ${addresses.length} addresses:`)
    for (const address of addresses) {
      console.log(`  📍 ${address.street} ${address.number}, ${address.city.name}`)
      console.log(`     ID: ${address.id}`)
      console.log(`     Locks count: ${address._count.locks}`)
      
      // Get users with permissions to locks at this address
      const usersWithPermissions = await prisma.user.findMany({
        where: {
          permissions: {
            some: {
              lock: {
                addressId: address.id
              },
              canAccess: true
            }
          }
        },
        include: {
          rfidKeys: {
            where: {
              isActive: true
            }
          }
        }
      })
      
      console.log(`     Users with access: ${usersWithPermissions.length}`)
      
      // Get locks at this address
      const locks = await prisma.lock.findMany({
        where: {
          addressId: address.id
        },
        include: {
          _count: {
            select: {
              permissions: true
            }
          }
        }
      })
      
      console.log(`     Actual locks: ${locks.length}`)
      
      // Get RFID keys for users with access
      const rfidKeys = await prisma.rfidKey.findMany({
        where: {
          user: {
            permissions: {
              some: {
                lock: {
                  addressId: address.id
                },
                canAccess: true
              }
            }
          },
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      
      console.log(`     RFID keys: ${rfidKeys.length}`)
      console.log()
    }
    
    // Show some sample data
    if (addresses.length > 0) {
      const firstAddress = addresses[0]
      console.log(`\n🔍 Detailed data for "${firstAddress.street} ${firstAddress.number}":`)
      
      // Users
      const users = await prisma.user.findMany({
        where: {
          permissions: {
            some: {
              lock: {
                addressId: firstAddress.id
              },
              canAccess: true
            }
          }
        },
        include: {
          rfidKeys: {
            where: {
              isActive: true
            }
          }
        }
      })
      
      console.log(`\n👥 Users (${users.length}):`)
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.rfidKeys.length} RFID keys`)
      })
      
      // Locks
      const locks = await prisma.lock.findMany({
        where: {
          addressId: firstAddress.id
        },
        include: {
          _count: {
            select: {
              permissions: true
            }
          }
        }
      })
      
      console.log(`\n🔒 Locks (${locks.length}):`)
      locks.forEach(lock => {
        console.log(`  - ${lock.name} (${lock.lockType}) - ${lock._count.permissions} permissions - Online: ${lock.isOnline}`)
      })
      
      // Keys
      const keys = await prisma.rfidKey.findMany({
        where: {
          user: {
            permissions: {
              some: {
                lock: {
                  addressId: firstAddress.id
                },
                canAccess: true
              }
            }
          },
          isActive: true
        },
        include: {
          user: true
        }
      })
      
      console.log(`\n🗝️ RFID Keys (${keys.length}):`)
      keys.forEach(key => {
        console.log(`  - ${key.cardId} - ${key.user.name} - Active: ${key.isActive}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseData()