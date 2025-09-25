const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function enforceStrictTwelveHourPolicy() {
  try {
    console.log('🔧 ENFORCING STRICT 12-HOUR PERMISSION POLICY')
    console.log('=' .repeat(60))
    console.log('📋 Converting ALL permissions to 12-hour expiry')
    console.log('')
    
    const now = new Date()
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000)
    
    // Find all permissions that don't expire in exactly 12 hours
    const allPermissions = await prisma.userPermission.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        lock: {
          select: {
            name: true,
            address: {
              select: {
                street: true,
                number: true,
                city: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        validTo: 'asc'
      }
    })
    
    console.log(`🔍 Found ${allPermissions.length} total permissions`)
    
    // Categorize permissions
    const permanent = allPermissions.filter(p => p.validTo === null)
    const expired = allPermissions.filter(p => p.validTo && p.validTo < now)
    const longTerm = allPermissions.filter(p => p.validTo && p.validTo > new Date(now.getTime() + 13 * 60 * 60 * 1000))
    const correctExpiry = allPermissions.filter(p => {
      if (!p.validTo) return false
      const timeDiff = Math.abs(p.validTo.getTime() - twelveHoursFromNow.getTime())
      return timeDiff < 60 * 60 * 1000 // Within 1 hour of 12-hour mark
    })
    
    console.log('')
    console.log('📊 Permission Analysis:')
    console.log(`   Permanent (null expiry): ${permanent.length}`)
    console.log(`   Expired: ${expired.length}`)
    console.log(`   Long-term (>13 hours): ${longTerm.length}`)
    console.log(`   Correct 12-hour expiry: ${correctExpiry.length}`)
    console.log('')
    
    const permissionsToUpdate = [...permanent, ...expired, ...longTerm]
    
    if (permissionsToUpdate.length === 0) {
      console.log('✅ All permissions already have correct 12-hour expiry')
      return
    }
    
    console.log(`🔄 Updating ${permissionsToUpdate.length} permissions to 12-hour expiry`)
    console.log(`⏰ New expiration time: ${twelveHoursFromNow.toLocaleString()}`)
    console.log('')
    
    // Show some examples
    console.log('📋 Examples of permissions being updated:')
    console.log('─'.repeat(80))
    
    permissionsToUpdate.slice(0, 5).forEach((perm, index) => {
      const user = `${perm.user.firstName} ${perm.user.lastName}`
      const location = `${perm.lock.address.street} ${perm.lock.address.number}`
      const currentStatus = perm.validTo === null ? 'Permanent' : 
                          perm.validTo < now ? 'Expired' : 
                          'Long-term'
      
      console.log(`${index + 1}. ${user} - ${perm.lock.name}`)
      console.log(`   📍 ${location}`)
      console.log(`   📊 Current: ${currentStatus}`)
      console.log(`   ⏰ New expiry: ${twelveHoursFromNow.toLocaleString()}`)
      console.log('')
    })
    
    if (permissionsToUpdate.length > 5) {
      console.log(`   ... and ${permissionsToUpdate.length - 5} more`)
    }
    
    // Update all permissions to 12-hour expiry
    const permissionIds = permissionsToUpdate.map(p => p.id)
    
    const result = await prisma.userPermission.updateMany({
      where: {
        id: { in: permissionIds }
      },
      data: {
        validTo: twelveHoursFromNow
      }
    })
    
    console.log('')
    console.log(`✅ Successfully updated ${result.count} permissions`)
    
    // Final verification
    const finalCheck = await prisma.userPermission.findMany({
      select: {
        validTo: true
      }
    })
    
    const stillPermanent = finalCheck.filter(p => p.validTo === null).length
    const stillLongTerm = finalCheck.filter(p => {
      if (!p.validTo) return false
      return p.validTo.getTime() > new Date(now.getTime() + 13 * 60 * 60 * 1000).getTime()
    }).length
    
    console.log('')
    console.log('📊 Final Status:')
    console.log(`   Total permissions: ${finalCheck.length}`)
    console.log(`   Permanent permissions: ${stillPermanent}`)
    console.log(`   Long-term permissions: ${stillLongTerm}`)
    
    if (stillPermanent === 0 && stillLongTerm === 0) {
      console.log('🎉 SUCCESS! All permissions now expire within 12 hours')
    } else {
      console.log('⚠️  Some permissions still need attention')
    }
    
    console.log('')
    console.log('🔐 12-HOUR POLICY FULLY ENFORCED:')
    console.log('   ✅ No permanent permissions allowed')
    console.log('   ✅ No long-term permissions allowed')
    console.log('   ✅ All permissions expire after maximum 12 hours')
    console.log('   ✅ System automatically enforces 12-hour limit')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

enforceStrictTwelveHourPolicy()