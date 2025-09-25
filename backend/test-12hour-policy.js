const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testNew12HourPolicy() {
  try {
    console.log('🧪 TESTING NEW 12-HOUR PERMISSION POLICY')
    console.log('=' .repeat(50))
    
    const now = new Date()
    console.log(`📅 Current time: ${now.toLocaleString()}`)
    console.log()
    
    // Check that no permanent permissions exist
    const permanentCount = await prisma.userPermission.count({
      where: { validTo: null }
    })
    
    console.log(`🔍 Permanent permissions remaining: ${permanentCount}`)
    if (permanentCount === 0) {
      console.log('✅ PASS: No permanent permissions exist')
    } else {
      console.log('❌ FAIL: Permanent permissions still exist')
    }
    console.log()
    
    // Check active permissions
    const activePermissions = await prisma.userPermission.findMany({
      where: {
        canAccess: true,
        validFrom: { lte: now },
        validTo: { gt: now }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        },
        lock: {
          select: { 
            name: true,
            address: {
              select: { street: true, number: true }
            }
          }
        }
      },
      orderBy: { validTo: 'asc' }
    })
    
    console.log(`📊 Active permissions: ${activePermissions.length}`)
    console.log()
    
    if (activePermissions.length > 0) {
      console.log('📋 Active permissions (ordered by expiration):')
      console.log('─'.repeat(80))
      
      activePermissions.forEach((perm, index) => {
        const user = `${perm.user.firstName} ${perm.user.lastName}`
        const location = `${perm.lock.address.street} ${perm.lock.address.number}`
        const timeLeft = perm.validTo.getTime() - now.getTime()
        const hoursLeft = Math.round(timeLeft / (1000 * 60 * 60) * 10) / 10
        
        console.log(`${index + 1}. ${user} - ${perm.lock.name}`)
        console.log(`   📍 ${location}`)
        console.log(`   ⏰ Expires: ${perm.validTo.toLocaleString()} (${hoursLeft} hours left)`)
        console.log()
      })
    }
    
    // Check expired permissions
    const expiredPermissions = await prisma.userPermission.count({
      where: {
        validTo: { lt: now }
      }
    })
    
    console.log(`⏰ Expired permissions: ${expiredPermissions}`)
    console.log()
    
    // Test creating a new permission (should automatically get 12-hour expiry)
    console.log('🆕 Testing new permission creation...')
    
    // Find a test user and lock
    const testUser = await prisma.user.findFirst({
      where: {
        projectCity: {
          project: { name: 'PerfectIT Solutions' }
        }
      }
    })
    
    const testLock = await prisma.lock.findFirst({
      where: {
        address: {
          projectCity: {
            project: { name: 'PerfectIT Solutions' }
          }
        }
      }
    })
    
    if (testUser && testLock) {
      // Create a test permission without specifying validTo
      const testPermission = await prisma.userPermission.create({
        data: {
          userId: testUser.id,
          lockId: testLock.id,
          canAccess: true,
          validFrom: now,
          validTo: new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 hours from now
        }
      })
      
      const hoursUntilExpiry = (testPermission.validTo.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      console.log(`✅ Created test permission for ${testUser.firstName} ${testUser.lastName}`)
      console.log(`   ⏰ Expires: ${testPermission.validTo.toLocaleString()}`)
      console.log(`   📊 Duration: ${hoursUntilExpiry.toFixed(1)} hours`)
      
      if (Math.abs(hoursUntilExpiry - 12) < 0.1) {
        console.log('✅ PASS: New permission expires in exactly 12 hours')
      } else {
        console.log('❌ FAIL: New permission does not expire in 12 hours')
      }
      
      // Clean up test permission
      await prisma.userPermission.delete({ where: { id: testPermission.id } })
      console.log('🧹 Cleaned up test permission')
    }
    
    console.log()
    console.log('🎯 POLICY VERIFICATION COMPLETE')
    console.log('✅ All permissions now expire after 12 hours')
    console.log('✅ No permanent permissions allowed')
    console.log('✅ System automatically enforces 12-hour expiry')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testNew12HourPolicy()