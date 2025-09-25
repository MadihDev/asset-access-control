const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugLocationDataMismatch() {
  try {
    console.log('🔍 DEBUGGING LOCATION DATA MISMATCH')
    console.log('=' .repeat(60))

    // Find a PerfectIT address with counts
    const addresses = await prisma.address.findMany({
      where: {
        street: { contains: 'PerfectIT' },
        projectCity: {
          project: { name: 'PerfectIT Solutions' },
          city: { name: 'Amsterdam' }
        }
      },
      include: {
        city: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        },
        locks: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    })

    if (addresses.length === 0) {
      console.log('❌ No PerfectIT addresses found')
      return
    }

    for (const address of addresses.slice(0, 2)) { // Check first 2 addresses
      console.log(`\n🏢 ADDRESS: ${address.street} ${address.number}`)
      console.log(`   📍 City: ${address.city.name}`)
      console.log(`   🔒 Locks: ${address.locks.length}`)
      
      const addressId = address.id
      const now = new Date()
      
      // Method 1: Count users with ANY permissions (like address endpoint)
      const allUsersWithPerms = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT up."userId")::integer as count
        FROM "locks" l
        LEFT JOIN "user_permissions" up ON l.id = up."lockId" AND up."canAccess" = true
        WHERE l."addressId" = ${addressId}
      `
      const totalUserCount = allUsersWithPerms[0]?.count || 0
      
      // Method 2: Count users with ACTIVE permissions (like location endpoint)
      const activeUsersWithPerms = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gte: now } }
          ],
          lock: { addressId }
        },
        select: { userId: true },
        distinct: ['userId']
      })
      const activeUserCount = activeUsersWithPerms.length
      
      console.log(`\n👥 USER COUNTS:`)
      console.log(`   📊 Address API count (all permissions): ${totalUserCount}`)
      console.log(`   📊 Location API count (active permissions): ${activeUserCount}`)
      console.log(`   ⚠️  Mismatch: ${totalUserCount !== activeUserCount ? 'YES' : 'NO'}`)
      
      // Method 3: Count keys with ANY permissions (like address endpoint)
      const allKeysCount = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT rk_filtered."userId")::integer as count
        FROM "locks" l
        LEFT JOIN "user_permissions" up ON l.id = up."lockId" AND up."canAccess" = true
        LEFT JOIN LATERAL (
          SELECT DISTINCT ON (rk."userId") rk."userId"
          FROM "rfid_keys" rk
          WHERE rk."userId" = up."userId" 
            AND rk."isActive" = true 
            AND (rk."expiresAt" IS NULL OR rk."expiresAt" > NOW())
          ORDER BY rk."userId", rk."issuedAt" DESC
        ) rk_filtered ON true
        WHERE l."addressId" = ${addressId}
      `
      const totalKeyCount = allKeysCount[0]?.count || 0
      
      // Method 4: Count keys with ACTIVE permissions (like location endpoint)
      const userIds = activeUsersWithPerms.map(u => u.userId)
      const activeKeysCount = userIds.length === 0 ? 0 : await prisma.rFIDKey.count({
        where: {
          userId: { in: userIds },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      })
      
      console.log(`\n🔑 KEY COUNTS:`)
      console.log(`   📊 Address API count (all permissions): ${totalKeyCount}`)
      console.log(`   📊 Location API count (active permissions): ${activeKeysCount}`)
      console.log(`   ⚠️  Mismatch: ${totalKeyCount !== activeKeysCount ? 'YES' : 'NO'}`)
      
      // Show expired permissions if any
      const expiredPerms = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validTo: { lt: now },
          lock: { addressId }
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          lock: {
            select: { name: true }
          }
        }
      })
      
      if (expiredPerms.length > 0) {
        console.log(`\n⏰ EXPIRED PERMISSIONS (${expiredPerms.length}):`)
        expiredPerms.forEach(perm => {
          console.log(`   ❌ ${perm.user.firstName} ${perm.user.lastName} - ${perm.lock.name} (expired: ${perm.validTo})`)
        })
      }
      
      // Show permissions without expiration
      const noExpiryPerms = await prisma.userPermission.findMany({
        where: {
          canAccess: true,
          validTo: null,
          lock: { addressId }
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          lock: {
            select: { name: true }
          }
        }
      })
      
      if (noExpiryPerms.length > 0) {
        console.log(`\n♾️ PERMANENT PERMISSIONS (${noExpiryPerms.length}):`)
        noExpiryPerms.forEach(perm => {
          console.log(`   ✅ ${perm.user.firstName} ${perm.user.lastName} - ${perm.lock.name} (no expiry)`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugLocationDataMismatch()