const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function simulateDashboardAPI() {
  try {
    console.log('🔍 Simulating Dashboard API Call for PerfectIT-Amsterdam Admin...')
    
    // Get PerfectIT-Amsterdam admin user
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
    
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        projectCityId: perfectITAmsterdam.id
      }
    })
    
    console.log(`\n👤 Simulating user: ${adminUser.email}`)
    console.log(`📍 ProjectCityId: ${adminUser.projectCityId}`)
    console.log(`🏢 Role: ${adminUser.role}`)
    
    // Simulate the dashboard controller logic
    const user = adminUser
    const isManagerOrAbove = ['ADMIN', 'SUPERVISOR'].includes(user.role)
    
    console.log(`\n📊 DASHBOARD LOGIC SIMULATION:`)
    console.log(`Is Manager or Above: ${isManagerOrAbove}`)
    
    // Build where clauses (FIXED LOGIC - enforce tenant isolation for ALL users)
    const userWhere = {}
    const addressWhere = {}
    const lockWhere = {}
    const rfidKeyWhere = { isActive: true }
    const now = new Date()
    rfidKeyWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }]
    
    // FIXED: Enforce tenant isolation for ALL users regardless of role
    if (user?.projectCityId) {
      userWhere.projectCityId = user.projectCityId
      addressWhere.projectCityId = user.projectCityId
      lockWhere.projectCityId = user.projectCityId
      rfidKeyWhere.projectCityId = user.projectCityId
    }
    
    console.log(`\n🔍 WHERE CLAUSES:`)
    console.log(`userWhere:`, userWhere)
    console.log(`lockWhere:`, lockWhere)
    console.log(`rfidKeyWhere:`, rfidKeyWhere)
    
    // Simulate the Promise.all from dashboard controller
    const [
      totalUsers,
      totalLocks,
      onlineLocks,
      activeKeys,
      totalAccessAttempts,
      successfulAccess
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.lock.count({ where: lockWhere }),
      prisma.lock.count({ where: { ...lockWhere, isOnline: true } }),
      prisma.rFIDKey.count({ where: rfidKeyWhere }),
      // Simulate accessLogStrictScopeWhere function
      prisma.accessLog.count({ 
        where: user?.projectCityId ? {
          AND: [
            { projectCityId: user.projectCityId },
            { lock: { projectCityId: user.projectCityId } }
          ]
        } : undefined 
      }),
      prisma.accessLog.count({
        where: user?.projectCityId ? { 
          result: 'GRANTED',
          AND: [
            { projectCityId: user.projectCityId },
            { lock: { projectCityId: user.projectCityId } }
          ]
        } : { result: 'GRANTED' }
      })
    ])
    
    // Active users calculation (from dashboard controller)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
    const recentSuccessUsers = await prisma.accessLog.findMany({
      where: {
        result: 'GRANTED',
        timestamp: { gte: fifteenMinAgo },
        ...(user?.projectCityId ? {
          AND: [
            { projectCityId: user.projectCityId },
            { lock: { projectCityId: user.projectCityId } }
          ]
        } : {})
      },
      select: { userId: true },
      distinct: ['userId']
    })
    
    const usersWithActiveKeys = await prisma.rFIDKey.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        // FIXED: Enforce tenant isolation for ALL users
        ...(user?.projectCityId ? { projectCityId: user.projectCityId } : {})
      },
      select: { userId: true },
      distinct: ['userId']
    })
    
    const activeUserIds = new Set([
      ...recentSuccessUsers.map(u => u.userId).filter(Boolean),
      ...usersWithActiveKeys.map(u => u.userId)
    ])
    
    console.log(`\n📊 SIMULATED DASHBOARD RESULTS:`)
    console.log(`Total Users: ${totalUsers}`)
    console.log(`Active Users: ${activeUserIds.size}`)
    console.log(`Total Locks: ${totalLocks}`)
    console.log(`Online Locks: ${onlineLocks}`)
    console.log(`Active Keys: ${activeKeys}`)
    console.log(`Total Access Attempts: ${totalAccessAttempts}`)
    console.log(`Successful Access: ${successfulAccess}`)
    
    console.log(`\n🖥️  USER REPORTED DASHBOARD DATA:`)
    console.log(`Total Users: 3`)
    console.log(`Active Users: 4`)
    console.log(`Total Locks: 3`)
    console.log(`Online Locks: 3`)
    console.log(`Active Keys: 4`)
    console.log(`Access Attempts: 1`)
    
    console.log(`\n🔄 COMPARISON:`)
    console.log(`Users: Simulated=${totalUsers} vs Reported=3 ${totalUsers === 3 ? '✅' : '❌'}`)
    console.log(`Active Users: Simulated=${activeUserIds.size} vs Reported=4 ${activeUserIds.size === 4 ? '✅' : '❌'}`)
    console.log(`Locks: Simulated=${totalLocks} vs Reported=3 ${totalLocks === 3 ? '✅' : '❌'}`)
    console.log(`Online Locks: Simulated=${onlineLocks} vs Reported=3 ${onlineLocks === 3 ? '✅' : '❌'}`)
    console.log(`Active Keys: Simulated=${activeKeys} vs Reported=4 ${activeKeys === 4 ? '✅' : '❌'}`)
    console.log(`Access Attempts: Simulated=${totalAccessAttempts} vs Reported=1 ${totalAccessAttempts === 1 ? '✅' : '❌'}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

simulateDashboardAPI()