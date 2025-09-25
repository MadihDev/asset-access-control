import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPerfectITLocks() {
  console.log('🔍 Checking PerfectIT locks and permissions...\n')
  
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
    
    // Get locks for PerfectIT
    const locks = await prisma.lock.findMany({
      where: {
        projectCityId: perfectIT_Amsterdam?.id
      },
      include: {
        address: true,
        permissions: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      }
    })
    
    console.log('🔐 PerfectIT Locks:')
    locks.forEach(lock => {
      console.log(`\n📍 ${lock.name}`)
      console.log(`   Device ID: ${lock.deviceId}`)
      console.log(`   Type: ${lock.lockType}`)
      console.log(`   Location: ${lock.address.street} ${lock.address.number}, ${lock.address.zipCode}`)
      console.log(`   Status: ${lock.isActive ? '🟢 Active' : '🔴 Inactive'} | ${lock.isOnline ? '🌐 Online' : '📴 Offline'}`)
      console.log(`   Permissions: ${lock.permissions.length} users`)
      
      lock.permissions.forEach(perm => {
        console.log(`     • ${perm.user.firstName} ${perm.user.lastName} (${perm.user.role})`)
      })
    })
    
    // Get all addresses for PerfectIT
    console.log('\n🏢 PerfectIT Addresses:')
    const addresses = await prisma.address.findMany({
      where: {
        projectCityId: perfectIT_Amsterdam?.id
      },
      include: {
        locks: true
      }
    })
    
    addresses.forEach(addr => {
      console.log(`   📍 ${addr.street} ${addr.number}, ${addr.zipCode} (${addr.locks.length} locks)`)
    })
    
    // Get all PerfectIT users and their permissions
    console.log('\n👥 PerfectIT Users and their Lock Access:')
    const users = await prisma.user.findMany({
      where: {
        projectCityId: perfectIT_Amsterdam?.id
      },
      include: {
        permissions: {
          include: {
            lock: {
              select: {
                name: true,
                deviceId: true
              }
            }
          }
        },
        rfidKeys: {
          select: {
            cardId: true,
            isActive: true
          }
        }
      }
    })
    
    users.forEach(user => {
      console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.role})`)
      console.log(`   Email: ${user.email}`)
      console.log(`   RFID Cards: ${user.rfidKeys.filter(card => card.isActive).map(card => card.cardId).join(', ') || 'None'}`)
      console.log(`   Lock Access: ${user.permissions.length} locks`)
      user.permissions.forEach(perm => {
        console.log(`     • ${perm.lock.name}`)
      })
    })
    
  } catch (error) {
    console.error('❌ Error checking locks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerfectITLocks()