// Check database directly to understand the keys issue
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeKeysIssue() {
  try {
    console.log('🔍 Analyzing the 14 keys issue...\n')
    
    // Get first address that matches our test case (Damrak 100)
    const address = await prisma.address.findFirst({
      where: {
        street: 'Damrak',
        number: '100'
      },
      include: {
        city: true
      }
    })
    
    console.log(`📍 Address: ${address.street} ${address.number}, ${address.city.name}`)
    console.log(`Address ID: ${address.id}\n`)
    
    // Step 1: Find users with permissions to locks at this address
    const perms = await prisma.userPermission.findMany({
      where: {
        canAccess: true,
        lock: { addressId: address.id }
      },
      select: { 
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      distinct: ['userId']
    })
    
    console.log(`👥 Users with permissions (${perms.length}):`)
    const userIds = perms.map(p => p.userId)
    perms.forEach((perm, i) => {
      const userName = `${perm.user.firstName} ${perm.user.lastName}`
      console.log(`  ${i+1}. ${userName} (${perm.user.email}) - ID: ${perm.userId}`)
    })
    
    // Step 2: Get ALL keys (including inactive) for these users to see the full picture
    console.log(`\n🗝️ ALL RFID keys (active and inactive) for these users:`)
    const allKeys = await prisma.rFIDKey.findMany({
      where: {
        userId: { in: userIds }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log(`Total keys found (active + inactive): ${allKeys.length}`)
    
    // Separate active and inactive
    const activeKeys = allKeys.filter(key => key.isActive)
    const inactiveKeys = allKeys.filter(key => !key.isActive)
    
    console.log(`Active keys: ${activeKeys.length}`)
    console.log(`Inactive keys: ${inactiveKeys.length}`)
    
    // Group by user
    const keysByUser = {}
    allKeys.forEach(key => {
      const userId = key.userId
      if (!keysByUser[userId]) {
        keysByUser[userId] = {
          user: key.user,
          keys: []
        }
      }
      keysByUser[userId].keys.push(key)
    })
    
    Object.entries(keysByUser).forEach(([userId, data]) => {
      const userName = `${data.user.firstName} ${data.user.lastName}`
      console.log(`\n  ${userName} (${userId}): ${data.keys.length} keys`)
      data.keys.forEach((key, i) => {
        console.log(`    ${i+1}. ${key.cardId} (Created: ${key.createdAt?.toISOString()?.split('T')[0]})`)
      })
    })
    
    // Check if keys are actually meant for different addresses
    console.log(`\n🔍 Let's check if these keys have specific address associations...`)
    
    // Note: RFID keys in the schema don't have direct address associations
    // They are associated with users, and users have permissions to specific locks at addresses
    
    console.log(`\n📝 EXPLANATION:`)
    console.log(`The current logic is:`)
    console.log(`1. Find users who have access to ANY lock at this address`)
    console.log(`2. Return ALL active RFID keys for those users`)
    console.log(``)
    console.log(`This means if a user has multiple RFID keys (for different purposes/locations),`)
    console.log(`ALL of them will be shown for EVERY address they have access to.`)
    console.log(``)
    console.log(`This is likely not the intended behavior. You probably want to show only`)
    console.log(`keys that are specifically relevant to this address/location.`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeKeysIssue()