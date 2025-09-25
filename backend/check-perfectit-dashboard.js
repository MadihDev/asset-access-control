const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPerfectITData() {
  try {
    console.log('🔍 Checking PerfectIT Database Data...')
    
    // Get PerfectIT project and Amsterdam city
    const perfectITProject = await prisma.project.findFirst({
      where: { name: 'PerfectIT Solutions' }
    })
    
    const amsterdamCity = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    
    if (!perfectITProject || !amsterdamCity) {
      console.log('❌ Could not find PerfectIT project or Amsterdam city')
      return
    }
    
    // Get PerfectIT-Amsterdam ProjectCity
    const perfectITAmsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectITProject.id,
        cityId: amsterdamCity.id
      }
    })
    
    if (!perfectITAmsterdam) {
      console.log('❌ Could not find PerfectIT-Amsterdam ProjectCity')
      return
    }
    
    console.log(`\n📋 PerfectIT ProjectCity ID: ${perfectITAmsterdam.id}`)
    
    // Count users
    const totalUsers = await prisma.user.count({
      where: { projectCityId: perfectITAmsterdam.id }
    })
    
    const activeUsers = await prisma.user.count({
      where: { 
        projectCityId: perfectITAmsterdam.id,
        isActive: true 
      }
    })
    
    // Count locks
    const totalLocks = await prisma.lock.count({
      where: { projectCityId: perfectITAmsterdam.id }
    })
    
    const onlineLocks = await prisma.lock.count({
      where: { 
        projectCityId: perfectITAmsterdam.id,
        isOnline: true 
      }
    })
    
    // Count access attempts
    const accessAttempts = await prisma.accessLog.count({
      where: { 
        lock: { projectCityId: perfectITAmsterdam.id }
      }
    })
    
    // Count RFID keys
    const activeKeys = await prisma.rFIDKey.count({
      where: { 
        projectCityId: perfectITAmsterdam.id,
        isActive: true 
      }
    })
    
    console.log('\n📊 DATABASE DATA:')
    console.log(`Total Users: ${totalUsers}`)
    console.log(`Active Users: ${activeUsers}`)
    console.log(`Total Locks: ${totalLocks}`)
    console.log(`Online Locks: ${onlineLocks}`)
    console.log(`Access Attempts: ${accessAttempts}`)
    console.log(`Active Keys: ${activeKeys}`)
    
    console.log('\n🖥️  DASHBOARD DATA (from user):')
    console.log('Total Users: 3')
    console.log('Total Locks: 3')
    console.log('Access Attempts: 1')
    console.log('Online Locks: 3')
    console.log('Active Users: 4')
    console.log('Active Keys: 4')
    
    console.log('\n🔄 COMPARISON:')
    console.log(`Users: DB=${totalUsers} vs Dashboard=3 ${totalUsers === 3 ? '✅' : '❌'}`)
    console.log(`Locks: DB=${totalLocks} vs Dashboard=3 ${totalLocks === 3 ? '✅' : '❌'}`)
    console.log(`Access: DB=${accessAttempts} vs Dashboard=1 ${accessAttempts === 1 ? '✅' : '❌'}`)
    console.log(`Online: DB=${onlineLocks} vs Dashboard=3 ${onlineLocks === 3 ? '✅' : '❌'}`)
    console.log(`Active Users: DB=${activeUsers} vs Dashboard=4 ${activeUsers === 4 ? '✅' : '❌'}`)
    console.log(`Active Keys: DB=${activeKeys} vs Dashboard=4 ${activeKeys === 4 ? '✅' : '❌'}`)
    
    // Additional debugging - show detailed data
    console.log('\n🔍 DETAILED DATA:')
    
    const users = await prisma.user.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { id: true, email: true, isActive: true, role: true }
    })
    console.log('\nUsers:')
    users.forEach(u => console.log(`  - ${u.email} (${u.role}) - Active: ${u.isActive}`))
    
    const locks = await prisma.lock.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { id: true, name: true, isOnline: true, isActive: true }
    })
    console.log('\nLocks:')
    locks.forEach(l => console.log(`  - ${l.name} - Online: ${l.isOnline}, Active: ${l.isActive}`))
    
    const keys = await prisma.rFIDKey.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: { id: true, cardId: true, isActive: true, name: true }
    })
    console.log('\nRFID Keys:')
    keys.forEach(k => console.log(`  - ${k.cardId} (${k.name}) - Active: ${k.isActive}`))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerfectITData()
