const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRFIDCardAccess() {
  try {
    console.log('🔍 Testing RFID Card Access')
    console.log('=' .repeat(50))
    
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
                    address: true,
                    projectCity: {
                      include: {
                        project: true,
                        city: true
                      }
                    }
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

    console.log(`👤 Card belongs to: ${rfidCard.user.firstName} ${rfidCard.user.lastName} (${rfidCard.user.email})`)
    console.log(`🏢 User Tenant: ${rfidCard.user.tenantId}`)
    console.log(`🏙️ ProjectCity ID: ${rfidCard.user.projectCityId}`)
    console.log('')

    // Define the target locks to test
    const targetLockNames = [
      'Server Room Lock',
      'Lock-PerfectIT Solutions Main St-123', 
      'Lock-PerfectIT Solutions Broadway-456'
    ]

    console.log('🔒 Testing access to target locks:')
    console.log('-'.repeat(50))

    // Find all target locks in database
    for (const lockName of targetLockNames) {
      console.log(`\n🔍 Testing: ${lockName}`)
      
      // Find the lock in database
      const lock = await prisma.lock.findFirst({
        where: { name: lockName },
        include: {
          address: true,
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })

      if (!lock) {
        console.log(`   ❌ Lock "${lockName}" not found in database`)
        continue
      }

      console.log(`   📍 Location: ${lock.address.street} ${lock.address.number} • ${lock.address.city}`)
      console.log(`   🔧 Type: ${lock.lockType}`)
      console.log(`   📡 Status: ${lock.isActive ? 'Active' : 'Inactive'} | ${lock.isOnline ? 'Online' : 'Offline'}`)
      console.log(`   🏢 Lock Tenant: ${lock.projectCity.project.name} - ${lock.projectCity.city.name}`)

      // Check if user has permission for this lock
      const userPermission = await prisma.userPermission.findFirst({
        where: {
          userId: rfidCard.user.id,
          lockId: lock.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      })

      if (userPermission) {
        console.log(`   ✅ ACCESS GRANTED`)
        console.log(`   📅 Permission granted: ${userPermission.validFrom}`)
        console.log(`   ⏰ Valid until: ${userPermission.validTo || 'No expiration'}`)
        
        // Check tenant isolation
        const sameTenant = lock.projectCityId === rfidCard.user.projectCityId
        console.log(`   🏢 Tenant isolation: ${sameTenant ? '✅ Same tenant' : '⚠️ Cross-tenant access'}`)
      } else {
        console.log(`   ❌ ACCESS DENIED - No valid permission found`)
      }
    }

    // Summary of all user permissions
    console.log('\n' + '='.repeat(50))
    console.log('📋 ALL USER PERMISSIONS SUMMARY:')
    console.log('='.repeat(50))

    const allPermissions = await prisma.userPermission.findMany({
      where: {
        userId: rfidCard.user.id,
        canAccess: true,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } }
        ]
      },
      include: {
        lock: {
          include: {
            address: true,
            projectCity: {
              include: {
                project: true,
                city: true
              }
            }
          }
        }
      }
    })

    if (allPermissions.length === 0) {
      console.log('❌ User has no active permissions assigned')
    } else {
      console.log(`📊 Total active permissions: ${allPermissions.length}`)
      
      for (const permission of allPermissions) {
        const lock = permission.lock
        const sameTenant = lock.projectCityId === rfidCard.user.projectCityId
        const tenantIcon = sameTenant ? '✅' : '⚠️'
        
        console.log(`\n🔒 ${lock.name} ${tenantIcon}`)
        console.log(`   📍 ${lock.address.street} ${lock.address.number} • ${lock.address.city}`)
        console.log(`   🔧 Type: ${lock.lockType}`)
        console.log(`   🏢 Lock Tenant: ${lock.projectCity.project.name} - ${lock.projectCity.city.name}`)
        console.log(`   📅 Valid: ${permission.validFrom} to ${permission.validTo || 'No expiration'}`)
      }
    }

    // Final access simulation
    console.log('\n' + '='.repeat(50))
    console.log('🚪 FINAL ACCESS SIMULATION:')
    console.log('='.repeat(50))

    for (const lockName of targetLockNames) {
      const lock = await prisma.lock.findFirst({
        where: { name: lockName }
      })

      if (!lock) {
        console.log(`\n🔒 ${lockName}: ❌ LOCK NOT FOUND`)
        continue
      }

      const hasPermission = await prisma.userPermission.findFirst({
        where: {
          userId: rfidCard.user.id,
          lockId: lock.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      })

      const canAccess = hasPermission && lock.isActive && lock.isOnline
      const result = canAccess ? '🟢 ACCESS GRANTED' : '🔴 ACCESS DENIED'

      console.log(`\n🔒 ${lockName}:`)
      console.log(`   Card Scan Result: ${result}`)
      
      if (!canAccess) {
        const reasons = []
        if (!hasPermission) reasons.push('No valid permission')
        if (!lock.isActive) reasons.push('Lock inactive')
        if (!lock.isOnline) reasons.push('Lock offline')
        console.log(`   Denial reason: ${reasons.join(', ')}`)
      }
    }

  } catch (error) {
    console.error('❌ Error testing RFID card access:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testRFIDCardAccess()