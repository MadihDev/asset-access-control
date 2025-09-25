import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testNewPermissionsCount() {
  console.log('🧪 Testing new tenant-isolated permissions count...\n')
  
  try {
    const admin = await prisma.user.findFirst({
      where: { username: 'perfectitadmin' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        projectCityId: true
      }
    })

    if (!admin) {
      console.log('❌ Admin not found!')
      return
    }

    console.log(`👤 Admin: ${admin.firstName} ${admin.lastName}`)
    console.log(`📍 Project City: ${admin.projectCityId}`)

    // Test the new tenant-isolated count
    const isolatedCount = await prisma.userPermission.count({
      where: {
        userId: admin.id,
        canAccess: true,
        lock: {
          projectCityId: admin.projectCityId || undefined
        }
      }
    })

    console.log(`\n🔒 Tenant-isolated permissions count: ${isolatedCount}`)

    // Show which permissions these are
    const isolatedPermissions = await prisma.userPermission.findMany({
      where: {
        userId: admin.id,
        canAccess: true,
        lock: {
          projectCityId: admin.projectCityId || undefined
        }
      },
      include: {
        lock: {
          select: {
            name: true,
            deviceId: true
          }
        }
      }
    })

    console.log('\n📋 These permissions are:')
    isolatedPermissions.forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm.lock.name} (${perm.lock.deviceId})`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNewPermissionsCount()