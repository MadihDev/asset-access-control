import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAllUsersPermissionsCount() {
  console.log('🧪 Testing tenant-isolated permissions count for all users...\n')
  
  try {
    // Get all active users in PerfectIT project city
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        projectCityId: 'cmfuzr81u0008qfgkk5hxzzdu' // PerfectIT Amsterdam
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        projectCityId: true
      }
    })

    console.log('PerfectIT Users with Tenant-Isolated Permissions Count:')
    console.log('========================================================')

    for (const user of users) {
      // Test the new tenant-isolated count
      const isolatedCount = await prisma.userPermission.count({
        where: {
          userId: user.id,
          canAccess: true,
          lock: {
            projectCityId: user.projectCityId || undefined
          }
        }
      })

      // Also get total permissions (cross-tenant) for comparison
      const totalCount = await prisma.userPermission.count({
        where: {
          userId: user.id,
          canAccess: true
        }
      })

      console.log(`\n👤 ${user.firstName} ${user.lastName} (@${user.username})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ✅ Tenant-Isolated Permissions: ${isolatedCount}`)
      console.log(`   ⚠️  Total Permissions (should be same): ${totalCount}`)
      
      if (isolatedCount !== totalCount) {
        console.log(`   🚨 TENANT ISOLATION VIOLATION! User has cross-tenant permissions.`)
      } else {
        console.log(`   ✅ Clean - No cross-tenant permissions`)
      }
    }

    console.log('\n🎯 Summary:')
    console.log('- All users should show the SAME count for both isolated and total permissions')
    console.log('- If counts differ, there are cross-tenant permission violations')
    console.log('- The frontend should now show the "Tenant-Isolated" count')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAllUsersPermissionsCount()