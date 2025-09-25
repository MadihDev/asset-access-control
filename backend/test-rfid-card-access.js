const { PrismaClient } = require('@prisma/client')

async function testRFIDCardAccess() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing RFID Card Access')
    console.log('=' .repeat(50))
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    const cardNumber = 'TEST_SINGLE_CARD_1758603770664_3'
    console.log(`📱 RFID Card: ${cardNumber}`)
    
    // Find the RFID card
    const rfidCard = await prisma.rFIDCard.findUnique({
      where: { cardNumber },
      include: {
        user: {
          include: {
            permissions: {
              include: {
                lock: {
                  include: {
                    address: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!rfidCard) {
      console.log('❌ RFID Card not found in database')
      return
    }

    console.log(`👤 Card belongs to: ${rfidCard.user.name} (${rfidCard.user.email})`)
    console.log(`🏢 Tenant: ${rfidCard.user.tenantId}`)
    console.log('')

    // Define the target locks to test
    const targetLocks = [
      'Server Room Lock',
      'Lock-PerfectIT Solutions Main St-123', 
      'Lock-PerfectIT Solutions Broadway-456'
    ]

    console.log('🔒 Testing access to target locks:')
    console.log('-'.repeat(50))

    // Get all user permissions
    const userPermissions = rfidCard.user.permissions

    for (const lockName of targetLocks) {
      console.log(`\n🔍 Testing: ${lockName}`)
      
      // Find the lock in database
      const lock = await prisma.lock.findFirst({
        where: { name: lockName },
        include: {
          address: true
        }
      })

      if (!lock) {
        console.log(`   ❌ Lock "${lockName}" not found in database`)
        continue
      }

      console.log(`   📍 Location: ${lock.address.street} ${lock.address.number} • ${lock.address.city}`)
      console.log(`   🔧 Type: ${lock.lockType}`)
      console.log(`   📡 Status: ${lock.isActive ? 'Active' : 'Inactive'} | ${lock.isOnline ? 'Online' : 'Offline'}`)

      // Check if user has permission for this lock
      const hasPermission = userPermissions.some(permission => 
        permission.lockId === lock.id && permission.isActive
      )

      const userPermission = userPermissions.find(permission => permission.lockId === lock.id)

      if (hasPermission) {
        console.log(`   ✅ ACCESS GRANTED`)
        if (userPermission) {
          console.log(`   📅 Permission granted: ${userPermission.createdAt}`)
          console.log(`   ⏰ Valid until: ${userPermission.expiresAt || 'No expiration'}`)
        }
      } else {
        console.log(`   ❌ ACCESS DENIED - No permission found`)
      }
    }

    // Summary of all user permissions
    console.log('\n' + '='.repeat(50))
    console.log('📋 ALL USER PERMISSIONS SUMMARY:')
    console.log('='.repeat(50))

    if (userPermissions.length === 0) {
      console.log('❌ User has no permissions assigned')
    } else {
      for (const permission of userPermissions) {
        const lock = permission.lock
        console.log(`\n🔒 ${lock.name}`)
        console.log(`   📍 ${lock.address.street} ${lock.address.number} • ${lock.address.city}`)
        console.log(`   🔧 Type: ${lock.lockType}`)
        console.log(`   ✅ Status: ${permission.isActive ? 'Active' : 'Inactive'}`)
        console.log(`   📅 Granted: ${permission.createdAt}`)
        console.log(`   ⏰ Expires: ${permission.expiresAt || 'No expiration'}`)
      }
    }

    // Test actual access simulation
    console.log('\n' + '='.repeat(50))
    console.log('🚪 ACCESS SIMULATION RESULTS:')
    console.log('='.repeat(50))

    for (const lockName of targetLocks) {
      const lock = await prisma.lock.findFirst({
        where: { name: lockName }
      })

      if (!lock) continue

      const hasPermission = userPermissions.some(permission => 
        permission.lockId === lock.id && 
        permission.isActive &&
        (!permission.expiresAt || permission.expiresAt > new Date())
      )

      const accessResult = hasPermission && lock.isActive && lock.isOnline

      console.log(`\n🔒 ${lockName}:`)
      console.log(`   Card Scan Result: ${accessResult ? '🟢 ACCESS GRANTED' : '🔴 ACCESS DENIED'}`)
      
      if (!accessResult) {
        const reasons = []
        if (!hasPermission) reasons.push('No valid permission')
        if (!lock.isActive) reasons.push('Lock inactive')
        if (!lock.isOnline) reasons.push('Lock offline')
        console.log(`   Reason: ${reasons.join(', ')}`)
      }
    }

  } catch (error) {
    console.error('❌ Error testing RFID card access:', error.message)
    if (error.code) {
      console.error(`Error code: ${error.code}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRFIDCardAccess()
}

module.exports = { testRFIDCardAccess }