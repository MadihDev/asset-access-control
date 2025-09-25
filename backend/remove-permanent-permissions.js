const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function removePermanentPermissions() {
  try {
    console.log('🔧 REMOVING PERMANENT PERMISSIONS')
    console.log('=' .repeat(50))
    console.log('📋 Policy: All permissions must expire after 12 hours')
    console.log('')
    
    const now = new Date()
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000)
    
    // Find all permanent permissions (validTo is null)
    const permanentPermissions = await prisma.userPermission.findMany({
      where: {
        validTo: null
      },
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
        createdAt: 'desc'
      }
    })
    
    console.log(`🔍 Found ${permanentPermissions.length} permanent permissions`)
    
    if (permanentPermissions.length === 0) {
      console.log('✅ No permanent permissions found - all permissions already have expiration dates')
      return
    }
    
    console.log('\n📋 Permissions to be updated:')
    console.log('─'.repeat(80))
    
    permanentPermissions.forEach((perm, index) => {
      const user = `${perm.user.firstName} ${perm.user.lastName}`
      const location = `${perm.lock.address.street} ${perm.lock.address.number}, ${perm.lock.address.city.name}`
      console.log(`${index + 1}. ${user} - ${perm.lock.name}`)
      console.log(`   📋 Location: ${location}`)
      console.log(`   📅 Created: ${perm.createdAt.toLocaleString()}`)
      console.log(`   ⏰ Will expire: ${twelveHoursFromNow.toLocaleString()}`)
      console.log('')
    })
    
    // Ask for confirmation
    console.log('⚠️  This will update ALL permanent permissions to expire in 12 hours')
    console.log(`⏰ New expiration time: ${twelveHoursFromNow.toLocaleString()}`)
    console.log('')
    
    // Update all permanent permissions
    console.log('🔄 Updating permissions...')
    
    const result = await prisma.userPermission.updateMany({
      where: {
        validTo: null
      },
      data: {
        validTo: twelveHoursFromNow
      }
    })
    
    console.log(`✅ Successfully updated ${result.count} permissions`)
    console.log('')
    
    // Verify the changes
    const remainingPermanent = await prisma.userPermission.count({
      where: {
        validTo: null
      }
    })
    
    const totalPermissions = await prisma.userPermission.count()
    const expiringPermissions = await prisma.userPermission.count({
      where: {
        validTo: { not: null }
      }
    })
    
    console.log('📊 Summary:')
    console.log(`   Total permissions: ${totalPermissions}`)
    console.log(`   Permissions with expiration: ${expiringPermissions}`)
    console.log(`   Permanent permissions remaining: ${remainingPermanent}`)
    
    if (remainingPermanent === 0) {
      console.log('🎉 Success! All permissions now have expiration dates')
    } else {
      console.log(`⚠️  Warning: ${remainingPermanent} permanent permissions still exist`)
    }
    
    console.log('')
    console.log('🔐 New Policy Implemented:')
    console.log('   ✅ All new permissions will expire after 12 hours')
    console.log('   ✅ No permanent permissions are allowed')
    console.log('   ✅ Existing permanent permissions converted to 12-hour expiry')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

removePermanentPermissions()