const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserPermissionExpiry() {
  try {
    console.log('🔍 CHECKING USER PERMISSION EXPIRY')
    console.log('=' .repeat(50))
    console.log('📍 Address: PerfectIT Solutions Broadway 456')
    console.log('👥 Users: madih madih, PerfectIT Administrator, vgh gj')
    console.log('')
    
    // Find the specific address
    const address = await prisma.address.findFirst({
      where: {
        street: 'PerfectIT Solutions Broadway',
        number: '456'
      },
      include: {
        city: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    })
    
    if (!address) {
      console.log('❌ Address not found')
      return
    }
    
    console.log(`✅ Found address: ${address.street} ${address.number}`)
    console.log(`   📍 City: ${address.city.name}`)
    console.log(`   🏢 Project: ${address.projectCity.project.name}`)
    
    // Get the target users
    const targetUserNames = ['madih madih', 'PerfectIT Administrator', 'vgh gj']
    
    for (const fullName of targetUserNames) {
      const [firstName, ...lastNameParts] = fullName.split(' ')
      const lastName = lastNameParts.join(' ')
      
      console.log(`\n👤 Checking permissions for: ${fullName}`)
      console.log('─'.repeat(40))
      
      // Find the user
      const user = await prisma.user.findFirst({
        where: {
          firstName: firstName,
          lastName: lastName
        }
      })
      
      if (!user) {
        console.log(`❌ User "${fullName}" not found`)
        continue
      }
      
      // Find all permissions for this user at this address
      const permissions = await prisma.userPermission.findMany({
        where: {
          userId: user.id,
          lock: {
            addressId: address.id
          }
        },
        include: {
          lock: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      if (permissions.length === 0) {
        console.log(`❌ No permissions found for ${fullName} at this address`)
        continue
      }
      
      console.log(`📊 Found ${permissions.length} permission(s):`)
      
      const now = new Date()
      
      permissions.forEach((perm, index) => {
        const lockName = perm.lock.name
        const canAccess = perm.canAccess ? '✅' : '❌'
        const validFrom = perm.validFrom ? perm.validFrom.toLocaleString() : 'No start date'
        const validTo = perm.validTo
        
        console.log(`\n   🔒 Lock ${index + 1}: ${lockName}`)
        console.log(`      Access: ${canAccess} ${perm.canAccess ? 'Allowed' : 'Denied'}`)
        console.log(`      Valid from: ${validFrom}`)
        
        if (validTo) {
          const isExpired = validTo < now
          const timeUntilExpiry = validTo.getTime() - now.getTime()
          const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24))
          
          console.log(`      Valid until: ${validTo.toLocaleString()}`)
          
          if (isExpired) {
            const daysSinceExpiry = Math.abs(daysUntilExpiry)
            console.log(`      Status: ❌ EXPIRED (${daysSinceExpiry} days ago)`)
          } else {
            if (daysUntilExpiry <= 7) {
              console.log(`      Status: ⚠️  EXPIRES SOON (in ${daysUntilExpiry} days)`)
            } else {
              console.log(`      Status: ✅ ACTIVE (expires in ${daysUntilExpiry} days)`)
            }
          }
        } else {
          console.log(`      Valid until: ♾️  PERMANENT (no expiration)`)
          console.log(`      Status: ✅ ACTIVE (permanent)`)
        }
        
        console.log(`      Created: ${perm.createdAt.toLocaleString()}`)
        console.log(`      Updated: ${perm.updatedAt.toLocaleString()}`)
      })
    }
    
    console.log('\n📅 Current server time:', new Date().toLocaleString())
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserPermissionExpiry()