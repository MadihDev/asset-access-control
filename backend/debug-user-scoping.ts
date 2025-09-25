import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugUserScoping() {
  console.log('🔍 Debugging user scoping and project-city relationships...\n')
  
  try {
    // Check the PerfectIT Administrator
    console.log('1. PerfectIT Administrator details:')
    const perfectitAdmin = await prisma.user.findUnique({
      where: { username: 'perfectitadmin' },
      select: {
        id: true,
        username: true,
        role: true,
        projectCityId: true,
        projectCity: {
          select: {
            id: true,
            project: {
              select: {
                name: true,
                slug: true
              }
            },
            city: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
    console.log('PerfectIT Admin:', JSON.stringify(perfectitAdmin, null, 2))
    
    if (!perfectitAdmin) {
      console.log('❌ PerfectIT Administrator not found!')
      return
    }
    
    // Check all locks in the same project-city
    console.log('\n2. Locks in PerfectIT Admin\'s project-city:')
    const locksInScope = await prisma.lock.findMany({
      where: {
        projectCityId: perfectitAdmin.projectCityId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        deviceId: true,
        projectCityId: true
      }
    })
    console.log(`Found ${locksInScope.length} locks:`, locksInScope)
    
    // Check all RFID cards accessible to this project-city
    console.log('\n3. RFID cards accessible to PerfectIT Admin:')
    const rfidCardsInScope = await prisma.rFIDKey.findMany({
      where: {
        user: {
          projectCityId: perfectitAdmin.projectCityId
        },
        isActive: false // These are "available"
      },
      select: {
        id: true,
        cardId: true,
        isActive: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true
          }
        }
      }
    })
    console.log(`Found ${rfidCardsInScope.length} available RFID cards:`, rfidCardsInScope)
    
    // Check a specific user (Mike Davis) for available locks
    console.log('\n4. Testing available locks for Mike Davis:')
    const mikeDavis = await prisma.user.findUnique({
      where: { username: 'mike.davis' },
      select: {
        id: true,
        username: true,
        projectCityId: true
      }
    })
    
    if (mikeDavis) {
      // Check Mike's current permissions
      const mikePermissions = await prisma.userPermission.findMany({
        where: {
          userId: mikeDavis.id,
          canAccess: true
        },
        select: {
          lockId: true,
          lock: {
            select: {
              name: true,
              deviceId: true
            }
          }
        }
      })
      console.log(`Mike has ${mikePermissions.length} permissions:`, mikePermissions)
      
      // Check locks available for Mike (locks he doesn't have access to)
      const availableForMike = await prisma.lock.findMany({
        where: {
          isActive: true,
          projectCityId: mikeDavis.projectCityId,
          NOT: {
            permissions: {
              some: {
                userId: mikeDavis.id,
                canAccess: true
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          deviceId: true
        }
      })
      console.log(`Available locks for Mike: ${availableForMike.length}`, availableForMike)
    }
    
    // Check project-city consistency
    console.log('\n5. Project-City consistency check:')
    const allProjectCities = await prisma.projectCity.findMany({
      select: {
        id: true,
        project: {
          select: {
            name: true,
            slug: true
          }
        },
        city: {
          select: {
            name: true
          }
        }
      }
    })
    console.log('All project-cities:', JSON.stringify(allProjectCities, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUserScoping()