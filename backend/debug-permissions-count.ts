import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugPermissionsCount() {
  console.log('🔍 Debugging permissions count for PerfectIT Administrator...\n')
  
  try {
    // First, let's see all project cities
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: {
          select: {
            name: true
          }
        },
        city: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log('📍 All Project Cities:')
    projectCities.forEach(pc => {
      console.log(`  - ${pc.project.name} in ${pc.city.name} (ID: ${pc.id})`)
    })

    // Find the PerfectIT project city
    const perfectItProjectCity = projectCities.find(pc => 
      pc.project.name.toLowerCase().includes('perfectit')
    )

    if (!perfectItProjectCity) {
      console.log('❌ PerfectIT project city not found!')
      return
    }

    console.log(`\n🎯 Using PerfectIT project city: ${perfectItProjectCity.id}`)

    // Get the PerfectIT Administrator
    const admin = await prisma.user.findFirst({
      where: {
        username: 'perfectitadmin'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        projectCityId: true
      }
    })

    if (!admin) {
      console.log('❌ PerfectIT Administrator not found!')
      return
    }

    console.log(`\n👤 Found admin: ${admin.firstName} ${admin.lastName}`)
    console.log(`   Project City ID: ${admin.projectCityId}`)

    // Count total locks in PerfectIT project
    const totalLocks = await prisma.lock.count({
      where: {
        projectCityId: perfectItProjectCity.id,
        isActive: true
      }
    })

    console.log(`\n🔒 Total active locks in PerfectIT: ${totalLocks}`)

    // Get all locks in PerfectIT
    const locks = await prisma.lock.findMany({
      where: {
        projectCityId: perfectItProjectCity.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        deviceId: true
      }
    })

    console.log('\n📋 All PerfectIT locks:')
    locks.forEach((lock, index) => {
      console.log(`  ${index + 1}. ${lock.name} (${lock.deviceId})`)
    })

    // Get admin's permissions - WITHOUT filtering by canAccess
    const allPermissions = await prisma.userPermission.findMany({
      where: {
        userId: admin.id
      },
      include: {
        lock: {
          select: {
            id: true,
            name: true,
            deviceId: true,
            projectCityId: true,
            isActive: true
          }
        }
      }
    })

    console.log(`\n🔑 Admin's ALL permissions (${allPermissions.length}):`)
    allPermissions.forEach((perm: any, index: number) => {
      console.log(`  ${index + 1}. ${perm.lock.name} (${perm.lock.deviceId})`)
      console.log(`     Lock Project City: ${perm.lock.projectCityId}`)
      console.log(`     Can Access: ${perm.canAccess}`)
      console.log(`     Lock Active: ${perm.lock.isActive}`)
      console.log(`     Permission ID: ${perm.id}`)
      console.log('')
    })

    // Get admin's permissions with canAccess = true only
    const activePermissions = await prisma.userPermission.findMany({
      where: {
        userId: admin.id,
        canAccess: true
      },
      include: {
        lock: {
          select: {
            id: true,
            name: true,
            deviceId: true,
            projectCityId: true,
            isActive: true
          }
        }
      }
    })

    console.log(`\n✅ Admin's ACTIVE permissions (${activePermissions.length}):`)
    activePermissions.forEach((perm: any, index: number) => {
      console.log(`  ${index + 1}. ${perm.lock.name} (${perm.lock.deviceId})`)
    })

    // Check if there are permissions for locks from other projects
    const crossTenantPermissions = allPermissions.filter((perm: any) => 
      perm.lock.projectCityId !== perfectItProjectCity.id
    )

    if (crossTenantPermissions.length > 0) {
      console.log(`\n⚠️  CROSS-TENANT PERMISSIONS FOUND (${crossTenantPermissions.length}):`)
      crossTenantPermissions.forEach((perm: any, index: number) => {
        console.log(`  ${index + 1}. ${perm.lock.name} - Project City: ${perm.lock.projectCityId}`)
      })
    }

    // Test the exact query used in user service
    console.log('\n🧪 Testing exact query from user service:')
    const userWithCount = await prisma.user.findUnique({
      where: { id: admin.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            permissions: {
              where: { canAccess: true }
            }
          }
        }
      }
    })

    console.log(`User service count result: ${userWithCount?._count.permissions}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPermissionsCount()