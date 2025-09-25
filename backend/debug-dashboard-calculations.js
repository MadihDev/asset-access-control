const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugDashboardCalculations() {
  try {
    console.log('🔍 Debugging Dashboard Calculations...')
    
    // Get PerfectIT-Amsterdam ProjectCity ID
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
    
    // 1. Check Access Attempts calculation
    console.log('\n🔍 1. ACCESS ATTEMPTS DEBUG:')
    const accessAttemptsTotal = await prisma.accessLog.count({
      where: { 
        lock: { projectCityId: perfectITAmsterdam.id }
      }
    })
    console.log(`Total access attempts in DB: ${accessAttemptsTotal}`)
    
    // Show recent access logs
    const recentLogs = await prisma.accessLog.findMany({
      where: { 
        lock: { projectCityId: perfectITAmsterdam.id }
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true } },
        lock: { select: { name: true } }
      }
    })
    console.log('Recent access logs:')
    recentLogs.forEach(log => {
      console.log(`  - ${log.user?.email || 'Unknown'} -> ${log.lock.name} (${log.result}) at ${log.timestamp}`)
    })
    
    // 2. Check Active Users calculation
    console.log('\n🔍 2. ACTIVE USERS DEBUG:')
    const now = new Date()
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
    
    console.log(`Current time: ${now}`)
    console.log(`15 minutes ago: ${fifteenMinAgo}`)
    
    const recentSuccessUsers = await prisma.accessLog.findMany({
      where: {
        result: 'GRANTED',
        timestamp: { gte: fifteenMinAgo },
        lock: { projectCityId: perfectITAmsterdam.id }
      },
      select: { 
        userId: true, 
        timestamp: true,
        user: { select: { email: true } }
      },
      distinct: ['userId']
    })
    
    console.log(`Recent successful users (last 15 min): ${recentSuccessUsers.length}`)
    recentSuccessUsers.forEach(u => {
      console.log(`  - ${u.user?.email} (${u.timestamp})`)
    })
    
    const usersWithActiveKeys = await prisma.rFIDKey.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        projectCityId: perfectITAmsterdam.id
      },
      select: { 
        userId: true,
        user: { select: { email: true } }
      },
      distinct: ['userId']
    })
    
    console.log(`Users with active keys: ${usersWithActiveKeys.length}`)
    usersWithActiveKeys.forEach(u => {
      console.log(`  - ${u.user?.email}`)
    })
    
    const allActiveUserIds = new Set([
      ...recentSuccessUsers.map(u => u.userId).filter(Boolean),
      ...usersWithActiveKeys.map(u => u.userId),
    ])
    console.log(`Combined active users: ${allActiveUserIds.size}`)
    
    // 3. Check Active Keys calculation
    console.log('\n🔍 3. ACTIVE KEYS DEBUG:')
    const activeKeysCount = await prisma.rFIDKey.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        projectCityId: perfectITAmsterdam.id
      }
    })
    console.log(`Active keys count: ${activeKeysCount}`)
    
    const allKeys = await prisma.rFIDKey.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { 
        cardId: true, 
        name: true, 
        isActive: true, 
        expiresAt: true,
        user: { select: { email: true } }
      }
    })
    
    console.log('All RFID keys for PerfectIT:')
    allKeys.forEach(key => {
      const isExpired = key.expiresAt && key.expiresAt <= now
      const isActiveKey = key.isActive && !isExpired
      console.log(`  - ${key.cardId} (${key.name}) - Active: ${key.isActive}, Expires: ${key.expiresAt || 'Never'}, User: ${key.user?.email}, IsActiveKey: ${isActiveKey}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugDashboardCalculations()