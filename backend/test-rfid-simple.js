const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSpecificRFIDCard() {
  try {
    const cardNumber = 'TEST_SINGLE_CARD_1758603770664_3'
    console.log(`🔍 Testing RFID Card: ${cardNumber}`)
    console.log('=' .repeat(60))
    
    // Find the RFID card and its owner
    const rfidKey = await prisma.rFIDKey.findUnique({
      where: { cardId: cardNumber },
      include: {
        user: true
      }
    })

    if (!rfidKey) {
      console.log('❌ RFID Card not found in database')
      return
    }

    console.log(`👤 Card Owner: ${rfidKey.user.firstName} ${rfidKey.user.lastName}`)
    console.log(`📧 Email: ${rfidKey.user.email}`)
    console.log(`🏢 Role: ${rfidKey.user.role}`)
    console.log(`🏙️ ProjectCity ID: ${rfidKey.user.projectCityId}`)
    console.log(`🆔 User ID: ${rfidKey.user.id}`)
    console.log(`🔑 Card Status: ${rfidKey.isActive ? 'Active' : 'Inactive'}`)
    console.log(`📅 Card Expires: ${rfidKey.expiresAt || 'No expiration'}`)
    
    // Target locks to test
    const targetLocks = [
      'Server Room Lock',
      'Lock-PerfectIT Solutions Main St-123', 
      'Lock-PerfectIT Solutions Broadway-456'
    ]
    
    console.log('\n🚪 TESTING ACCESS TO TARGET LOCKS:')
    console.log('=' .repeat(60))
    
    for (const lockName of targetLocks) {
      console.log(`\n🔒 Testing: ${lockName}`)
      
      // Find the lock
      const lock = await prisma.lock.findFirst({
        where: { name: lockName },
        include: {
          address: true
        }
      })
      
      if (!lock) {
        console.log(`   ❌ Lock not found in database`)
        continue
      }
      
      console.log(`   📍 Location: ${lock.address.street} ${lock.address.number}, ${lock.address.city}`)
      console.log(`   🔧 Type: ${lock.lockType}`)
      console.log(`   📡 Status: ${lock.isActive ? 'Active' : 'Inactive'} | ${lock.isOnline ? 'Online' : 'Offline'}`)
      
      // Check user permission
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
        const now = new Date()
        const isExpired = permission.validTo && permission.validTo < now
        
        console.log(`   ✅ PERMISSION FOUND`)
        console.log(`   📅 Valid from: ${permission.validFrom}`)
        console.log(`   ⏰ Valid to: ${permission.validTo || 'No expiration'}`)
        console.log(`   📊 Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
        
        // Final access decision
        const canAccess = !isExpired && lock.isActive && lock.isOnline
        console.log(`   🚪 ACCESS RESULT: ${canAccess ? '🟢 GRANTED' : '🔴 DENIED'}`)
        
        if (!canAccess) {
          const reasons = []
          if (isExpired) reasons.push('Permission expired')
          if (!lock.isActive) reasons.push('Lock inactive')
          if (!lock.isOnline) reasons.push('Lock offline')
          console.log(`   🚫 Reason: ${reasons.join(', ')}`)
        }
      } else {
        console.log(`   ❌ NO PERMISSION FOUND`)
        console.log(`   🚪 ACCESS RESULT: 🔴 DENIED`)
      }
    }
    
    // Summary of all user permissions
    console.log('\n📋 ALL USER PERMISSIONS:')
    console.log('=' .repeat(60))
    
    const allPermissions = await prisma.userPermission.findMany({
      where: {
        userId: rfidKey.user.id
      },
      include: {
        lock: {
          include: {
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (allPermissions.length === 0) {
      console.log('❌ User has no permissions assigned')
    } else {
      console.log(`📊 Total permissions: ${allPermissions.length}`)
      
      allPermissions.forEach((perm, index) => {
        const now = new Date()
        const isActive = perm.canAccess && (!perm.validTo || perm.validTo >= now)
        const status = isActive ? '✅ ACTIVE' : '❌ INACTIVE/EXPIRED'
        
        console.log(`\n${index + 1}. ${perm.lock.name} - ${status}`)
        console.log(`   📍 ${perm.lock.address.street} ${perm.lock.address.number}, ${perm.lock.address.city}`)
        console.log(`   📅 ${perm.validFrom} → ${perm.validTo || 'No expiration'}`)
        console.log(`   🔑 Can access: ${perm.canAccess ? 'Yes' : 'No'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testSpecificRFIDCard()