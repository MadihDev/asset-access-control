import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function grantPerfectITPermissions() {
  console.log('🔑 Granting additional permissions to PerfectIT users...\n')
  
  try {
    // Get PerfectIT project
    const perfectIT = await prisma.project.findUnique({
      where: { slug: 'perfectit-solutions' }
    })
    
    if (!perfectIT) {
      console.error('❌ PerfectIT Solutions project not found.')
      return
    }
    
    // Get PerfectIT-Amsterdam project-city relationship
    const perfectIT_Amsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectIT.id,
        city: { name: 'Amsterdam' }
      }
    })
    
    // Get users
    const sarah = await prisma.user.findUnique({
      where: { username: 'sarah.johnson' }
    })
    
    const mike = await prisma.user.findUnique({
      where: { username: 'mike.davis' }
    })
    
    // Get locks
    const mainOfficeLock = await prisma.lock.findUnique({
      where: { deviceId: 'PERFECTIT-MAIN-001' }
    })
    
    const dataCenterLock = await prisma.lock.findUnique({
      where: { deviceId: 'PERFECTIT-DC-001' }
    })
    
    const warehouseLock = await prisma.lock.findUnique({
      where: { deviceId: 'PERFECTIT-WH-001' }
    })
    
    if (!sarah || !mike || !mainOfficeLock || !dataCenterLock || !warehouseLock) {
      console.error('❌ Some users or locks not found.')
      return
    }
    
    // Sarah (Supervisor) gets access to Main Office and Warehouse
    await prisma.userPermission.upsert({
      where: {
        userId_lockId: {
          userId: sarah.id,
          lockId: mainOfficeLock.id
        }
      },
      create: {
        userId: sarah.id,
        lockId: mainOfficeLock.id,
        canAccess: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        projectCityId: perfectIT_Amsterdam?.id
      },
      update: {
        canAccess: true,
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
    
    await prisma.userPermission.upsert({
      where: {
        userId_lockId: {
          userId: sarah.id,
          lockId: warehouseLock.id
        }
      },
      create: {
        userId: sarah.id,
        lockId: warehouseLock.id,
        canAccess: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        projectCityId: perfectIT_Amsterdam?.id
      },
      update: {
        canAccess: true,
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
    
    console.log(`✅ Granted Sarah Johnson access to Main Office and Warehouse`)
    
    // Mike (User) gets access to Main Office only
    await prisma.userPermission.upsert({
      where: {
        userId_lockId: {
          userId: mike.id,
          lockId: mainOfficeLock.id
        }
      },
      create: {
        userId: mike.id,
        lockId: mainOfficeLock.id,
        canAccess: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        projectCityId: perfectIT_Amsterdam?.id
      },
      update: {
        canAccess: true,
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
    
    console.log(`✅ Granted Mike Davis access to Main Office`)
    
    console.log('\n📋 Permission Summary:')
    console.log('┌─────────────────┬─────────────┬─────────────────────────────────┐')
    console.log('│ User            │ Role        │ Lock Access                     │')
    console.log('├─────────────────┼─────────────┼─────────────────────────────────┤')
    console.log('│ John Smith      │ ADMIN       │ All 3 locks (Full Access)      │')
    console.log('│ Sarah Johnson   │ SUPERVISOR  │ Main Office + Warehouse         │')
    console.log('│ Mike Davis      │ USER        │ Main Office only                │')
    console.log('└─────────────────┴─────────────┴─────────────────────────────────┘')
    
  } catch (error) {
    console.error('❌ Error granting permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
grantPerfectITPermissions()
  .then(() => {
    console.log('\n✅ Permission assignment completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })