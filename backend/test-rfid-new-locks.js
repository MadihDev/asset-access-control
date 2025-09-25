const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRFIDCardNewLocks() {
  try {
    const cardNumber = 'TEST_SINGLE_CARD_1758603770664_3'
    const now = new Date()
    
    console.log('🔍 Testing RFID Card Access - NEW TARGET LOCKS')
    console.log('=' .repeat(60))
    console.log(`📱 RFID Card: ${cardNumber}`)
    console.log(`🕒 Test Time: ${now}`)
    
    // Find the RFID card
    const rfidKey = await prisma.rFIDKey.findUnique({
      where: { cardId: cardNumber },
      include: { user: true }
    })
    
    if (!rfidKey) {
      console.log('❌ RFID Card not found in database')
      return
    }
    
    console.log(`👤 Card Owner: ${rfidKey.user.firstName} ${rfidKey.user.lastName} (${rfidKey.user.email})`)
    console.log(`🏢 Role: ${rfidKey.user.role}`)
    console.log(`🏙️ ProjectCity ID: ${rfidKey.user.projectCityId}`)
    console.log(`🔑 Card Status: ${rfidKey.isActive ? 'Active' : 'Inactive'}`)
    
    // New target locks to test
    const targetLocks = [
      'Conference Room Lock',
      'Lock-PerfectIT Solutions Park Ave-789',
      'Main Entrance Lock'
    ]
    
    console.log('\n🚪 TESTING ACCESS TO NEW TARGET LOCKS:')
    console.log('=' .repeat(60))
    
    for (const lockName of targetLocks) {
      console.log(`\n🔒 Testing: ${lockName}`)
      
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
      const permission = await prisma.userPermission.findFirst({
        where: {
          userId: rfidKey.user.id,
          lockId: lock.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      })
      
      if (permission) {
        const isExpired = permission.validTo && permission.validTo < now
        const timeLeft = permission.validTo ? permission.validTo.getTime() - now.getTime() : null
        const minutesLeft = timeLeft ? Math.round(timeLeft / (1000 * 60)) : null
        
        console.log(`   ✅ PERMISSION FOUND`)
        console.log(`   📅 Valid from: ${permission.validFrom}`)
        console.log(`   ⏰ Valid to: ${permission.validTo || 'No expiration'}`)
        console.log(`   🕒 Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
        
        if (minutesLeft !== null) {
          if (!isExpired) {
            console.log(`   ⏰ Time remaining: ${minutesLeft} minutes`)
          } else {
            console.log(`   ⏰ Expired ${Math.abs(minutesLeft)} minutes ago`)
          }
        }
        
        // Check tenant isolation
        const sameTenant = lock.projectCityId === rfidKey.user.projectCityId
        console.log(`   🏢 Tenant isolation: ${sameTenant ? '✅ Same tenant' : '⚠️ Cross-tenant access'}`)
        
        // Final access decision
        const canAccess = !isExpired && lock.isActive && lock.isOnline
        console.log(`   🚪 ACCESS RESULT: ${canAccess ? '🟢 GRANTED' : '🔴 DENIED'}`)
        
        if (!canAccess) {
          const reasons = []
          if (isExpired) reasons.push('Permission expired')
          if (!lock.isActive) reasons.push('Lock inactive')
          if (!lock.isOnline) reasons.push('Lock offline')
          console.log(`   🚫 Denial reason: ${reasons.join(', ')}`)
        }
      } else {
        console.log(`   ❌ NO PERMISSION FOUND`)
        console.log(`   🚪 ACCESS RESULT: 🔴 DENIED`)
      }
    }
    
    // Get all user permissions for context
    console.log('\n📋 ALL USER PERMISSIONS (for context):')
    console.log('=' .repeat(60))
    
    const allPermissions = await prisma.userPermission.findMany({
      where: {
        userId: rfidKey.user.id,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (allPermissions.length === 0) {
      console.log('❌ User has no active permissions assigned')
    } else {
      console.log(`📊 Total active permissions: ${allPermissions.length}`)
      
      for (const permission of allPermissions) {
        const lock = permission.lock
        const isTarget = targetLocks.includes(lock.name)
        const marker = isTarget ? '🎯' : '📋'
        
        console.log(`\n${marker} ${lock.name}`)
        console.log(`   📍 ${lock.address.street} ${lock.address.number} • ${lock.address.city}`)
        console.log(`   🔧 Type: ${lock.lockType}`)
        console.log(`   📅 Valid: ${permission.validFrom} to ${permission.validTo || 'No expiration'}`)
        
        if (permission.validTo) {
          const timeLeft = permission.validTo.getTime() - now.getTime()
          const minutesLeft = Math.round(timeLeft / (1000 * 60))
          console.log(`   ⏰ ${minutesLeft > 0 ? `${minutesLeft} minutes remaining` : `Expired ${Math.abs(minutesLeft)} minutes ago`}`)
        }
      }
    }
    
    // Final summary
    console.log('\n🎯 FINAL ACCESS SUMMARY FOR TARGET LOCKS:')
    console.log('=' .repeat(60))
    
    for (const lockName of targetLocks) {
      const lock = await prisma.lock.findFirst({
        where: { name: lockName }
      })
      
      if (!lock) {
        console.log(`🔒 ${lockName}: ❌ LOCK NOT FOUND`)
        continue
      }
      
      const hasPermission = await prisma.userPermission.findFirst({
        where: {
          userId: rfidKey.user.id,
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
      
      console.log(`🔒 ${lockName}: ${result}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing RFID card access:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testRFIDCardNewLocks()