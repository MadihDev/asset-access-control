const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function investigateCrossTenantAccess() {
  try {
    console.log('🚨 INVESTIGATING CROSS-TENANT ACCESS VIOLATIONS...')
    
    // Get all access logs with detailed tenant information
    const accessLogs = await prisma.accessLog.findMany({
      include: {
        user: { 
          include: { 
            projectCity: { 
              include: { project: true, city: true } 
            } 
          } 
        },
        lock: { 
          include: { 
            projectCity: { 
              include: { project: true, city: true } 
            } 
          } 
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    })
    
    console.log('\n📋 ACCESS LOG ANALYSIS:')
    accessLogs.forEach(log => {
      const userProject = log.user?.projectCity?.project?.name || 'NO PROJECT'
      const lockProject = log.lock?.projectCity?.project?.name || 'NO PROJECT'
      const isCrossTenant = userProject !== lockProject
      const violation = isCrossTenant ? '🚨 VIOLATION' : '✅ OK'
      
      console.log(`${violation} ${log.user?.email || 'Unknown'} (${userProject}) -> ${log.lock?.name} (${lockProject}) [${log.result}] at ${log.timestamp}`)
    })
    
    // Find all cross-tenant violations
    const violations = accessLogs.filter(log => {
      const userProject = log.user?.projectCity?.project?.name
      const lockProject = log.lock?.projectCity?.project?.name
      return userProject && lockProject && userProject !== lockProject
    })
    
    console.log(`\n🚨 TOTAL CROSS-TENANT VIOLATIONS: ${violations.length}`)
    
    if (violations.length > 0) {
      console.log('\n⚠️  VIOLATION DETAILS:')
      violations.forEach(v => {
        console.log(`- ${v.user?.email} (${v.user?.projectCity?.project?.name}) accessed ${v.lock?.name} (${v.lock?.projectCity?.project?.name})`)
      })
    }
    
    // Check if this is a data issue or logic issue
    console.log('\n🔍 CHECKING USER-LOCK TENANT CONSISTENCY:')
    
    const users = await prisma.user.findMany({
      include: { projectCity: { include: { project: true } } }
    })
    
    const locks = await prisma.lock.findMany({
      include: { projectCity: { include: { project: true } } }
    })
    
    console.log('\nUsers by tenant:')
    const usersByTenant = {}
    users.forEach(u => {
      const tenant = u.projectCity?.project?.name || 'NO_TENANT'
      if (!usersByTenant[tenant]) usersByTenant[tenant] = []
      usersByTenant[tenant].push(u.email)
    })
    Object.entries(usersByTenant).forEach(([tenant, emails]) => {
      console.log(`  ${tenant}: ${emails.join(', ')}`)
    })
    
    console.log('\nLocks by tenant:')
    const locksByTenant = {}
    locks.forEach(l => {
      const tenant = l.projectCity?.project?.name || 'NO_TENANT'
      if (!locksByTenant[tenant]) locksByTenant[tenant] = []
      locksByTenant[tenant].push(l.name)
    })
    Object.entries(locksByTenant).forEach(([tenant, names]) => {
      console.log(`  ${tenant}: ${names.join(', ')}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

investigateCrossTenantAccess()