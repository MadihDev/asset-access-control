// Check dashboard data for techcorpadmin in Amsterdam
import prisma from './src/lib/prisma'

async function checkDashboardData() {
  try {
    console.log('🔍 Checking Dashboard Data for TechCorp Admin in Amsterdam')
    console.log('🏢 WITH PROPER MULTI-TENANT ISOLATION\n')
    
    // First, let's identify the context - find Amsterdam city and TechCorp project
    const amsterdam = await prisma.city.findFirst({
      where: { name: { contains: 'Amsterdam', mode: 'insensitive' } },
      include: {
        projectCities: {
          include: {
            project: true
          }
        }
      }
    })
    
    if (!amsterdam) {
      console.log('❌ Amsterdam city not found in database')
      return
    }
    
    console.log(`📍 Found Amsterdam: ${amsterdam.name} (ID: ${amsterdam.id})`)
    
    // Find TechCorp project
    const techCorpProject = amsterdam.projectCities.find(pc => 
      pc.project.name.toLowerCase().includes('techcorp') || 
      pc.project.slug?.toLowerCase().includes('techcorp')
    )
    
    if (!techCorpProject) {
      console.log('❌ TechCorp project not found for Amsterdam')
      console.log('Available projects for Amsterdam:')
      amsterdam.projectCities.forEach(pc => {
        console.log(`  - ${pc.project.name} (${pc.project.slug})`)
      })
      return
    }
    
    console.log(`🏢 Found TechCorp Project: ${techCorpProject.project.name} (ID: ${techCorpProject.project.id})`)
    console.log(`🔗 Project-City ID: ${techCorpProject.id}\n`)
    
    // Now let's get the dashboard metrics
    
    // 1. Total Users - users in this project-city context
    const totalUsers = await prisma.user.count({
      where: {
        projectCityId: techCorpProject.id,
        isActive: true
      }
    })
    
    // 2. Total Locks - locks with PROPER TENANT ISOLATION for this project-city
    const totalLocks = await prisma.lock.count({
      where: {
        projectCityId: techCorpProject.id,
        // Also ensure they're in Amsterdam (redundant but explicit)
        location: {
          address: {
            cityId: amsterdam.id
          }
        }
      }
    })
    
    // 3. Access Attempts - recent access logs with PROPER TENANT ISOLATION
    const accessAttempts = await prisma.accessLog.count({
      where: {
        projectCityId: techCorpProject.id,
        // Ensure the lock is also in the right tenant context
        lock: {
          projectCityId: techCorpProject.id,
          location: {
            address: {
              cityId: amsterdam.id
            }
          }
        },
        // Could add time filter for recent attempts
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
    
    // 4. Online Locks - locks that are currently online/active with PROPER TENANT ISOLATION
    const onlineLocks = await prisma.lock.count({
      where: {
        projectCityId: techCorpProject.id,
        location: {
          address: {
            cityId: amsterdam.id
          }
        },
        isActive: true,
        isOnline: true
      }
    })
    
    // 5. Active Users - users who have been active recently
    const activeUsers = await prisma.user.count({
      where: {
        projectCityId: techCorpProject.id,
        isActive: true,
        // Users who have accessed something recently
        accessLogs: {
          some: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }
      }
    })
    
    // 6. Active Keys - active RFID keys for users in this context
    const activeKeys = await prisma.rFIDKey.count({
      where: {
        user: {
          projectCityId: techCorpProject.id,
          isActive: true
        },
        isActive: true
      }
    })
    
    // Display the results
    console.log('📊 DASHBOARD METRICS VERIFICATION')
    console.log('================================')
    console.log(`Total Users:      ${totalUsers} (Dashboard shows: 6)`)
    console.log(`Total Locks:      ${totalLocks} (Dashboard shows: 12)`)
    console.log(`Access Attempts:  ${accessAttempts} (Dashboard shows: 20)`)
    console.log(`Online Locks:     ${onlineLocks} (Dashboard shows: 11)`)
    console.log(`Active Users:     ${activeUsers} (Dashboard shows: 3)`)
    console.log(`Active Keys:      ${activeKeys} (Dashboard shows: 4)`)
    
    console.log('\n🔍 DETAILED BREAKDOWN')
    console.log('=====================')
    
    // Show detailed user information
    const users = await prisma.user.findMany({
      where: {
        projectCityId: techCorpProject.id,
        isActive: true
      },
      include: {
        rfidKeys: {
          where: { isActive: true }
        },
        _count: {
          select: {
            accessLogs: {
              where: {
                timestamp: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`\n👥 Users in TechCorp Amsterdam (${users.length} total):`)
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`)
      console.log(`    RFID Keys: ${user.rfidKeys.length}, Recent Access: ${user._count.accessLogs} times`)
    })
    
    // Show lock information with PROPER TENANT ISOLATION
    const locks = await prisma.lock.findMany({
      where: {
        projectCityId: techCorpProject.id,
        location: {
          address: {
            cityId: amsterdam.id
          }
        }
      },
      include: {
        location: {
          include: {
            address: {
              select: {
                street: true,
                number: true
              }
            }
          }
        },
        _count: {
          select: {
            accessLogs: {
              where: {
                projectCityId: techCorpProject.id,
                timestamp: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`\n🔒 Locks in TechCorp Amsterdam (${locks.length} total):`)
    locks.forEach(lock => {
      console.log(`  - ${lock.name} at ${lock.location.address.street} ${lock.location.address.number}`)
      console.log(`    ProjectCity: ${lock.projectCityId}, Status: ${lock.isActive ? 'Active' : 'Inactive'}, Recent Access: ${lock._count.accessLogs} times`)
    })
    
    // Recent access attempts with PROPER TENANT ISOLATION
    const recentAccess = await prisma.accessLog.findMany({
      where: {
        projectCityId: techCorpProject.id,
        lock: {
          projectCityId: techCorpProject.id,
          location: {
            address: {
              cityId: amsterdam.id
            }
          }
        },
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        lock: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    })
    
    console.log(`\n📋 Recent Access Attempts (last 10 of ${accessAttempts} total):`)
    recentAccess.forEach(log => {
      const user = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'
      console.log(`  - ${log.timestamp.toISOString()}: ${user} → ${log.lock.name} (${log.result})`)
    })
    
  } catch (error) {
    console.error('❌ Error checking dashboard data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDashboardData()