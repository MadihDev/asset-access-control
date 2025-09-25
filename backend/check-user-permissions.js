const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserPermissions() {
  try {
    console.log('🔍 Checking User Permission Counts...')
    
    // Get PerfectIT-Amsterdam ProjectCity
    const perfectITProject = await prisma.project.findFirst({
      where: { name: 'PerfectIT Solutions' }
    })
    const amsterdamCity = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    const perfectITAmsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectITProject.id,
        cityId: amsterdamCity.id
      }
    })
    
    console.log(`\n📋 PerfectIT-Amsterdam ProjectCity ID: ${perfectITAmsterdam.id}`)
    
    // Get all users from PerfectIT-Amsterdam
    const users = await prisma.user.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true, 
        role: true,
        projectCityId: true
      }
    })
    
    console.log(`\n👥 Users in PerfectIT-Amsterdam: ${users.length}`)
    
    for (const user of users) {
      console.log(`\n👤 USER: ${user.email} (${user.role})`)
      
      // Method 1: Count all permissions for this user
      const allPermissions = await prisma.userPermission.count({
        where: { userId: user.id }
      })
      
      // Method 2: Count active permissions (canAccess=true, not expired)
      const activePermissions = await prisma.userPermission.count({
        where: {
          userId: user.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        }
      })
      
      // Method 3: Count permissions with tenant scoping (lock in same projectCity)
      const tenantScopedPermissions = await prisma.userPermission.count({
        where: {
          userId: user.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ],
          lock: {
            projectCityId: user.projectCityId
          }
        }
      })
      
      // Method 4: Get detailed permission info
      const detailedPermissions = await prisma.userPermission.findMany({
        where: {
          userId: user.id,
          canAccess: true,
          OR: [
            { validTo: null },
            { validTo: { gte: new Date() } }
          ]
        },
        include: {
          lock: {
            select: {
              id: true,
              name: true,
              projectCityId: true,
              projectCity: {
                select: {
                  project: { select: { name: true } },
                  city: { select: { name: true } }
                }
              }
            }
          }
        }
      })
      
      console.log(`  📊 Permission Counts:`)
      console.log(`    All permissions: ${allPermissions}`)
      console.log(`    Active permissions: ${activePermissions}`)
      console.log(`    Tenant-scoped permissions: ${tenantScopedPermissions}`)
      
      console.log(`  📝 Detailed Permissions:`)
      detailedPermissions.forEach(perm => {
        const lockProject = perm.lock?.projectCity?.project?.name || 'Unknown'
        const lockCity = perm.lock?.projectCity?.city?.name || 'Unknown'
        const isInSameTenant = perm.lock?.projectCityId === user.projectCityId
        const status = isInSameTenant ? '✅' : '❌'
        
        console.log(`    ${status} ${perm.lock?.name} (${lockProject}-${lockCity}) - Valid: ${perm.validFrom} to ${perm.validTo || 'Never'}`)
      })
      
      // Test the actual service method
      console.log(`  🧪 Testing UserService.getUserStats:`)
      const stats = await getUserStats(user.id, user.projectCityId)
      console.log(`    Active permissions via getUserStats: ${stats.activePermissions}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Copy of the getUserStats method from UserService
async function getUserStats(userId, projectCityId) {
  const [accessLogs, permissions] = await Promise.all([
    prisma.accessLog.findMany({
      where: { userId, ...(projectCityId ? { lock: { projectCityId } } : {}) },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.userPermission.count({
      where: {
        userId,
        canAccess: true,
        OR: [
          { validTo: null },
          { validTo: { gte: new Date() } }
        ],
        ...(projectCityId ? { lock: { projectCityId } } : {})
      }
    })
  ])

  const successfulAccess = accessLogs.filter(log => log.result === 'GRANTED').length
  const failedAccess = accessLogs.length - successfulAccess
  const lastAccess = accessLogs.length > 0 ? accessLogs[0].timestamp : undefined

  return {
    totalAccessAttempts: accessLogs.length,
    successfulAccess,
    failedAccess,
    activePermissions: permissions,
    lastAccess
  }
}

checkUserPermissions()