const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixExpiredPermissions() {
  try {
    console.log('🔧 FIXING EXPIRED PERMISSIONS')
    console.log('=' .repeat(50))
    
    const now = new Date()
    console.log(`📅 Current time: ${now}`)
    
    // Find all expired permissions for PerfectIT
    const expiredPerms = await prisma.userPermission.findMany({
      where: {
        canAccess: true,
        validTo: { not: null },
        lock: {
          address: {
            projectCity: {
              project: { name: 'PerfectIT Solutions' }
            }
          }
        }
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        lock: { 
          select: { 
            name: true,
            address: { select: { street: true, number: true } }
          } 
        }
      }
    })
    
    console.log(`\n🔍 Found ${expiredPerms.length} permissions with expiration dates`)
    
    for (const perm of expiredPerms) {
      const isExpired = perm.validTo < now
      console.log(`${isExpired ? '❌' : '✅'} ${perm.user.firstName} ${perm.user.lastName} - ${perm.lock.name}`)
      console.log(`   📅 Valid until: ${perm.validTo} (${isExpired ? 'EXPIRED' : 'ACTIVE'})`)
    }
    
    // Option 1: Remove expiration dates (make permissions permanent)
    const expiredCount = expiredPerms.filter(p => p.validTo < now).length
    
    if (expiredCount > 0) {
      console.log(`\n🔧 Making ${expiredCount} expired permissions permanent...`)
      
      const result = await prisma.userPermission.updateMany({
        where: {
          canAccess: true,
          validTo: { lt: now },
          lock: {
            address: {
              projectCity: {
                project: { name: 'PerfectIT Solutions' }
              }
            }
          }
        },
        data: {
          validTo: null // Remove expiration
        }
      })
      
      console.log(`✅ Updated ${result.count} permissions to be permanent`)
    } else {
      console.log(`✅ No expired permissions to fix`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixExpiredPermissions()