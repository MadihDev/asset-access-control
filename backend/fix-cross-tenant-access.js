const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixCrossTenantAccess() {
  try {
    console.log('🔧 FIXING CROSS-TENANT ACCESS VIOLATIONS...')
    
    // First, let's identify and remove cross-tenant access logs
    const accessLogs = await prisma.accessLog.findMany({
      include: {
        user: { 
          include: { 
            projectCity: { 
              include: { project: true } 
            } 
          } 
        },
        lock: { 
          include: { 
            projectCity: { 
              include: { project: true } 
            } 
          } 
        }
      }
    })
    
    const validLogs = []
    const invalidLogs = []
    
    accessLogs.forEach(log => {
      const userProject = log.user?.projectCity?.project?.name
      const lockProject = log.lock?.projectCity?.project?.name
      
      if (userProject && lockProject && userProject === lockProject) {
        validLogs.push(log.id)
      } else {
        invalidLogs.push({
          id: log.id,
          user: log.user?.email,
          userProject,
          lock: log.lock?.name,
          lockProject,
          timestamp: log.timestamp
        })
      }
    })
    
    console.log(`\n📊 ANALYSIS:`)
    console.log(`Valid access logs (same tenant): ${validLogs.length}`)
    console.log(`Invalid access logs (cross-tenant): ${invalidLogs.length}`)
    
    console.log(`\n❌ INVALID LOGS TO REMOVE:`)
    invalidLogs.forEach(log => {
      console.log(`- ${log.user} (${log.userProject}) -> ${log.lock} (${log.lockProject}) at ${log.timestamp}`)
    })
    
    if (invalidLogs.length > 0) {
      console.log(`\n🗑️  REMOVING ${invalidLogs.length} INVALID ACCESS LOGS...`)
      
      const deleteResult = await prisma.accessLog.deleteMany({
        where: {
          id: { in: invalidLogs.map(log => log.id) }
        }
      })
      
      console.log(`✅ Deleted ${deleteResult.count} cross-tenant access logs`)
    }
    
    // Now verify the PerfectIT counts after cleanup
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
    
    console.log(`\n✅ VERIFICATION AFTER CLEANUP:`)
    
    const cleanAccessAttempts = await prisma.accessLog.count({
      where: { 
        lock: { projectCityId: perfectITAmsterdam.id }
      }
    })
    
    console.log(`PerfectIT access attempts after cleanup: ${cleanAccessAttempts}`)
    
    // Show remaining logs for PerfectIT
    const remainingLogs = await prisma.accessLog.findMany({
      where: { 
        lock: { projectCityId: perfectITAmsterdam.id }
      },
      include: {
        user: { select: { email: true } },
        lock: { select: { name: true } }
      },
      orderBy: { timestamp: 'desc' }
    })
    
    console.log(`\n📋 REMAINING PERFECTIT ACCESS LOGS:`)
    remainingLogs.forEach(log => {
      console.log(`- ${log.user?.email} -> ${log.lock?.name} (${log.result}) at ${log.timestamp}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixCrossTenantAccess()