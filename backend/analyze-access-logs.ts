import prisma from './src/lib/prisma'

async function analyzeAccessLogs() {
  try {
    console.log('🔍 ANALYZING ACCESS LOG TENANT ISOLATION')
    console.log('=======================================\n')
    
    // Get all access logs with detailed information
    const accessLogs = await prisma.accessLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            projectCityId: true,
            projectCity: {
              select: {
                project: { select: { name: true } },
                city: { select: { name: true } }
              }
            }
          }
        },
        lock: {
          select: {
            id: true,
            name: true,
            projectCityId: true,
            location: {
              select: {
                name: true,
                address: {
                  select: {
                    projectCityId: true,
                    street: true,
                    number: true,
                    city: { select: { name: true } }
                  }
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`📊 Total access logs found: ${accessLogs.length}\n`)
    
    // Analyze tenant isolation issues
    const tenantIssues = []
    const uniqueUserTenants = new Set()
    const uniqueLockTenants = new Set()
    
    accessLogs.forEach((log, index) => {
      const userTenant = log.user?.projectCityId
      const lockTenant = log.lock?.projectCityId || log.lock?.location?.address?.projectCityId
      const accessLogTenant = log.projectCityId
      
      uniqueUserTenants.add(userTenant)
      uniqueLockTenants.add(lockTenant)
      
      // Check for tenant isolation issues
      if (userTenant && lockTenant && userTenant !== lockTenant) {
        tenantIssues.push({
          logId: log.id,
          timestamp: log.timestamp,
          userName: `${log.user?.firstName} ${log.user?.lastName}`,
          userTenant,
          lockName: log.lock?.name,
          lockLocation: `${log.lock?.location?.address?.street} ${log.lock?.location?.address?.number}`,
          lockTenant,
          accessLogTenant,
          result: log.result
        })
      }
      
      // Show detailed info for first few logs
      if (index < 10) {
        console.log(`📋 Log ${index + 1}:`)
        console.log(`   Timestamp: ${log.timestamp}`)
        console.log(`   User: ${log.user?.firstName} ${log.user?.lastName} (Tenant: ${userTenant})`)
        console.log(`   Lock: ${log.lock?.name} (Tenant: ${lockTenant})`)
        console.log(`   Access Log Tenant: ${accessLogTenant}`)
        console.log(`   Result: ${log.result}`)
        
        if (userTenant !== lockTenant) {
          console.log(`   🚨 TENANT MISMATCH! User tenant (${userTenant}) != Lock tenant (${lockTenant})`)
        }
        console.log('')
      }
    })
    
    // Summary
    console.log('\n📊 TENANT ISOLATION ANALYSIS:')
    console.log(`   Unique user tenants: ${uniqueUserTenants.size}`)
    console.log(`   Unique lock tenants: ${uniqueLockTenants.size}`)
    console.log(`   Cross-tenant access issues: ${tenantIssues.length}`)
    
    if (tenantIssues.length > 0) {
      console.log('\n🚨 CRITICAL TENANT ISOLATION BREACHES:')
      tenantIssues.slice(0, 10).forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.userName} (${issue.userTenant}) → ${issue.lockName} (${issue.lockTenant}) - ${issue.result}`)
      })
      
      console.log('\n🔍 ROOT CAUSE ANALYSIS:')
      
      // Check if this is a data generation issue
      const distinctUserTenantsByLockTenant = {}
      tenantIssues.forEach(issue => {
        if (!distinctUserTenantsByLockTenant[issue.lockTenant]) {
          distinctUserTenantsByLockTenant[issue.lockTenant] = new Set()
        }
        distinctUserTenantsByLockTenant[issue.lockTenant].add(issue.userTenant)
      })
      
      console.log('   Lock tenants being accessed by users from other tenants:')
      Object.entries(distinctUserTenantsByLockTenant).forEach(([lockTenant, userTenants]) => {
        console.log(`     ${lockTenant}: accessed by users from [${Array.from(userTenants).join(', ')}]`)
      })
    } else {
      console.log('\n✅ No tenant isolation issues detected in access logs!')
    }
    
    // Check if there are locks that belong to wrong tenants
    console.log('\n🏢 LOCK TENANT DISTRIBUTION:')
    const locksByTenant = {}
    const locks = await prisma.lock.findMany({
      select: {
        name: true,
        projectCityId: true,
        location: {
          select: {
            address: {
              select: {
                projectCityId: true,
                street: true
              }
            }
          }
        }
      }
    })
    
    locks.forEach(lock => {
      const tenant = lock.projectCityId || lock.location?.address?.projectCityId || 'NO_TENANT'
      if (!locksByTenant[tenant]) {
        locksByTenant[tenant] = []
      }
      locksByTenant[tenant].push({
        name: lock.name,
        address: lock.location?.address?.street
      })
    })
    
    Object.entries(locksByTenant).forEach(([tenant, locks]) => {
      console.log(`   ${tenant}: ${locks.length} locks`)
      locks.slice(0, 3).forEach(lock => {
        console.log(`     - ${lock.name} (${lock.address})`)
      })
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

analyzeAccessLogs()