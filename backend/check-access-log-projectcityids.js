const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAccessLogProjectCityIds() {
  try {
    console.log('🔍 Checking AccessLog projectCityId population...')
    
    // Check all access logs and their projectCityId values
    const accessLogs = await prisma.accessLog.findMany({
      select: {
        id: true,
        projectCityId: true,
        lockId: true,
        userId: true,
        result: true,
        timestamp: true,
        lock: {
          select: {
            name: true,
            projectCityId: true
          }
        },
        user: {
          select: {
            email: true,
            projectCityId: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })
    
    console.log('\n📋 ACCESS LOG ANALYSIS:')
    console.log('Format: AccessLog.projectCityId | Lock.projectCityId | User.projectCityId | Result')
    
    accessLogs.forEach(log => {
      const logProjectCity = log.projectCityId || 'NULL'
      const lockProjectCity = log.lock?.projectCityId || 'NULL'
      const userProjectCity = log.user?.projectCityId || 'NULL'
      const isConsistent = logProjectCity === lockProjectCity && logProjectCity === userProjectCity
      const status = isConsistent ? '✅' : '❌'
      
      console.log(`${status} ${logProjectCity} | ${lockProjectCity} | ${userProjectCity} | ${log.result} - ${log.user?.email} -> ${log.lock?.name}`)
    })
    
    // Count access logs by projectCityId population
    const totalLogs = await prisma.accessLog.count()
    const logsWithProjectCityId = await prisma.accessLog.count({
      where: { projectCityId: { not: null } }
    })
    const logsWithoutProjectCityId = totalLogs - logsWithProjectCityId
    
    console.log(`\n📊 PROJECTCITYID POPULATION:`)
    console.log(`Total access logs: ${totalLogs}`)
    console.log(`With projectCityId: ${logsWithProjectCityId}`)
    console.log(`Without projectCityId: ${logsWithoutProjectCityId}`)
    
    if (logsWithoutProjectCityId > 0) {
      console.log('\n🔧 FIXING MISSING PROJECTCITYIDS...')
      
      // Get logs without projectCityId and fix them
      const logsToFix = await prisma.accessLog.findMany({
        where: { projectCityId: null },
        include: {
          lock: { select: { projectCityId: true } }
        }
      })
      
      console.log(`Found ${logsToFix.length} logs to fix`)
      
      for (const log of logsToFix) {
        if (log.lock?.projectCityId) {
          await prisma.accessLog.update({
            where: { id: log.id },
            data: { projectCityId: log.lock.projectCityId }
          })
        }
      }
      
      console.log(`✅ Fixed ${logsToFix.length} access logs`)
    }
    
    // Re-check PerfectIT access logs after fix
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
    
    console.log(`\n✅ PERFECTIT ACCESS LOG COUNTS AFTER FIX:`)
    
    // Count using different methods
    const countViaLock = await prisma.accessLog.count({
      where: { lock: { projectCityId: perfectITAmsterdam.id } }
    })
    
    const countViaDirectProjectCityId = await prisma.accessLog.count({
      where: { projectCityId: perfectITAmsterdam.id }
    })
    
    const countViaStrictScope = await prisma.accessLog.count({
      where: {
        AND: [
          { projectCityId: perfectITAmsterdam.id },
          { lock: { projectCityId: perfectITAmsterdam.id } }
        ]
      }
    })
    
    console.log(`Via lock.projectCityId: ${countViaLock}`)
    console.log(`Via accessLog.projectCityId: ${countViaDirectProjectCityId}`)
    console.log(`Via strict scope (both): ${countViaStrictScope}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAccessLogProjectCityIds()