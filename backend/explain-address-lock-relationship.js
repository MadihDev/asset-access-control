const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function explainAddressLocationLockRelationship() {
  try {
    console.log('🏢 EXPLAINING ADDRESSES, LOCATIONS, AND LOCKS RELATIONSHIP')
    console.log('=' .repeat(70))
    
    // First, let's examine the schema relationships
    console.log('📊 DATABASE SCHEMA RELATIONSHIPS:')
    console.log('-' .repeat(50))
    console.log('🏠 ADDRESS → Contains multiple LOCKS')
    console.log('🔒 LOCK → Belongs to one ADDRESS')
    console.log('🏙️ ADDRESS → Belongs to one CITY')
    console.log('🏢 ADDRESS → Connected to PROJECT through ProjectCity')
    console.log('')
    
    // Get sample data to show relationships
    console.log('📋 ACTUAL DATA EXAMPLE - PerfectIT Solutions:')
    console.log('=' .repeat(70))
    
    // Find PerfectIT addresses
    const perfectITAddresses = await prisma.address.findMany({
      where: {
        street: {
          contains: 'PerfectIT'
        }
      },
      include: {
        locks: {
          select: {
            id: true,
            name: true,
            lockType: true,
            isActive: true,
            isOnline: true
          }
        },
        city: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      },
      orderBy: {
        street: 'asc'
      }
    })
    
    console.log(`🏠 Found ${perfectITAddresses.length} PerfectIT addresses:\n`)
    
    for (const address of perfectITAddresses) {
      console.log(`🏢 ADDRESS: ${address.street} ${address.number}`)
      console.log(`   📍 City: ${address.city.name}`)
      console.log(`   🆔 Address ID: ${address.id}`)
      
      // Show project connection
      if (address.projectCity) {
        console.log(`   🏢 Project: ${address.projectCity.project.name}`)
        console.log(`   🏙️ Project-City: ${address.projectCity.project.name} - ${address.projectCity.city.name}`)
        console.log(`   🆔 ProjectCity ID: ${address.projectCity.id}`)
      }
      
      console.log(`   🔒 LOCKS at this address (${address.locks.length} total):`)
      
      if (address.locks.length === 0) {
        console.log(`      ❌ No locks found`)
      } else {
        address.locks.forEach((lock, index) => {
          const status = lock.isActive ? '✅' : '❌'
          const online = lock.isOnline ? '🟢' : '🔴'
          console.log(`      ${index + 1}. ${lock.name}`)
          console.log(`         🔧 Type: ${lock.lockType}`)
          console.log(`         📡 Status: ${status} Active | ${online} Online`)
          console.log(`         🆔 Lock ID: ${lock.id}`)
        })
      }
      console.log('')
    }
    
    // Show relationship breakdown
    console.log('🔍 RELATIONSHIP BREAKDOWN:')
    console.log('=' .repeat(70))
    
    // Count locks per address
    const addressLockCounts = await prisma.address.findMany({
      where: {
        street: {
          contains: 'PerfectIT'
        }
      },
      include: {
        _count: {
          select: {
            locks: true
          }
        }
      }
    })
    
    console.log('📊 LOCKS PER ADDRESS:')
    addressLockCounts.forEach(addr => {
      console.log(`   🏠 ${addr.street} ${addr.number}: ${addr._count.locks} locks`)
    })
    
    // Total statistics
    const totalAddresses = await prisma.address.count({
      where: {
        street: {
          contains: 'PerfectIT'
        }
      }
    })
    
    const totalLocks = await prisma.lock.count({
      where: {
        address: {
          street: {
            contains: 'PerfectIT'
          }
        }
      }
    })
    
    console.log(`\n📈 SUMMARY STATISTICS:`)
    console.log(`   🏠 Total PerfectIT Addresses: ${totalAddresses}`)
    console.log(`   🔒 Total Locks across all addresses: ${totalLocks}`)
    console.log(`   📊 Average locks per address: ${(totalLocks / totalAddresses).toFixed(1)}`)
    
    // Show lock types distribution
    const lockTypeDistribution = await prisma.lock.groupBy({
      by: ['lockType'],
      where: {
        address: {
          street: {
            contains: 'PerfectIT'
          }
        }
      },
      _count: {
        lockType: true
      }
    })
    
    console.log(`\n🔧 LOCK TYPES DISTRIBUTION:`)
    lockTypeDistribution.forEach(type => {
      console.log(`   ${type.lockType}: ${type._count.lockType} locks`)
    })
    
    // Explain the practical implications
    console.log('\n💡 PRACTICAL IMPLICATIONS:')
    console.log('=' .repeat(70))
    console.log('🏠 ADDRESSES represent physical building locations')
    console.log('   • Each address has a street, number, and city')
    console.log('   • Addresses belong to a specific tenant (Project-City)')
    console.log('   • Example: "PerfectIT Solutions Broadway 456, Amsterdam"')
    console.log('')
    console.log('🔒 LOCKS are physical security devices at addresses')
    console.log('   • Each lock belongs to exactly ONE address')
    console.log('   • Locks have types: DOOR, ROOM, CABINET, GATE')
    console.log('   • Locks can be online/offline, active/inactive')
    console.log('   • Example: "Main Entrance Lock" at Broadway 456')
    console.log('')
    console.log('👥 USERS get permissions to specific LOCKS, not addresses')
    console.log('   • Users need individual permission for each lock')
    console.log('   • Same address can have multiple locks with different access')
    console.log('   • Example: Access to "Conference Room" but not "Server Room"')
    console.log('')
    console.log('🏢 TENANT ISOLATION ensures users only see their organization\'s data')
    console.log('   • Addresses belong to Projects (organizations)')
    console.log('   • Users belong to ProjectCities (org + location)')
    console.log('   • Cross-tenant access is prevented')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

explainAddressLocationLockRelationship()