const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addPerfectITLocks() {
  try {
    console.log('🔍 Finding PerfectIT Solutions Broadway 456 address...')
    
    // Find the PerfectIT address
    const address = await prisma.address.findFirst({
      where: {
        street: 'Broadway',
        number: '456',
        city: {
          name: 'New York'
        }
      },
      include: {
        city: {
          include: {
            projectCity: true
          }
        },
        locks: true
      }
    })

    if (!address) {
      console.log('❌ Address not found. Let me check what addresses exist...')
      
      const addresses = await prisma.address.findMany({
        include: {
          city: true
        }
      })
      
      console.log('📍 Available addresses:')
      addresses.forEach(addr => {
        console.log(`   - ${addr.street} ${addr.number}, ${addr.city.name}`)
      })
      return
    }

    console.log(`✅ Found address: ${address.street} ${address.number}, ${address.city.name}`)
    console.log(`📊 Current locks at this address: ${address.locks.length}`)
    
    if (address.locks.length > 0) {
      console.log('🔒 Existing locks:')
      address.locks.forEach(lock => {
        console.log(`   - ${lock.name} (${lock.lockType})`)
      })
    }

    const projectCityId = address.city.projectCity.id
    console.log(`🏢 Project City ID: ${projectCityId}`)

    // Create 3 new locks
    const newLocks = [
      {
        name: 'Main Entrance Lock',
        description: 'Primary entrance security lock for PerfectIT Broadway office',
        lockType: 'MAGNETIC',
        isOnline: true,
        isActive: true,
        batteryLevel: 95,
        addressId: address.id,
        projectCityId: projectCityId
      },
      {
        name: 'Server Room Lock',
        description: 'High-security lock for server room access',
        lockType: 'SMART_CARD',
        isOnline: true,
        isActive: true,
        batteryLevel: 88,
        addressId: address.id,
        projectCityId: projectCityId
      },
      {
        name: 'Conference Room Lock',
        description: 'Conference room access control lock',
        lockType: 'RFID',
        isOnline: true,
        isActive: true,
        batteryLevel: 92,
        addressId: address.id,
        projectCityId: projectCityId
      }
    ]

    console.log('\n🔧 Creating new locks...')
    
    for (const lockData of newLocks) {
      const lock = await prisma.lock.create({
        data: lockData
      })
      console.log(`✅ Created: ${lock.name} (ID: ${lock.id})`)
    }

    // Verify the locks were created
    const updatedAddress = await prisma.address.findUnique({
      where: { id: address.id },
      include: {
        locks: true,
        _count: {
          select: {
            locks: true
          }
        }
      }
    })

    console.log(`\n📊 Total locks at ${address.street} ${address.number}: ${updatedAddress._count.locks}`)
    console.log('\n🔒 All locks at this address:')
    updatedAddress.locks.forEach((lock, index) => {
      console.log(`   ${index + 1}. ${lock.name} (${lock.lockType}) - ${lock.isActive ? 'Active' : 'Inactive'}`)
    })

    console.log('\n✅ Successfully added 3 new locks to PerfectIT Solutions Broadway 456!')

  } catch (error) {
    console.error('❌ Error adding locks:', error.message)
    if (error.code) {
      console.error(`Error code: ${error.code}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  addPerfectITLocks()
}

module.exports = { addPerfectITLocks }