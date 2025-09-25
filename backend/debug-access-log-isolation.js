const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAccessLogTenantIsolation() {
  try {
    console.log('🔍 Debugging Access Log Tenant Isolation...\n');
    
    // 1. Get PerfectIT Amsterdam projectCityId
    const perfectItAmsterdam = await prisma.projectCity.findFirst({
      where: {
        project: { name: 'PerfectIT Solutions' },
        city: { name: 'Amsterdam' }
      },
      include: {
        project: true,
        city: true
      }
    });
    
    if (!perfectItAmsterdam) {
      console.error('❌ PerfectIT Amsterdam not found!');
      return;
    }
    
    console.log('🏢 PerfectIT Amsterdam ProjectCity ID:', perfectItAmsterdam.id);
    
    // 2. Show what the strict scope filter should find
    console.log('\n🔍 STRICT SCOPE FILTER LOGIC:');
    console.log('============================');
    console.log('For PerfectIT Administrator, the query should be:');
    console.log(`  AND: [`);
    console.log(`    { projectCityId: "${perfectItAmsterdam.id}" },`);
    console.log(`    { lock: { projectCityId: "${perfectItAmsterdam.id}" } }`);
    console.log(`  ]`);
    
    // 3. Find access logs that match the strict filter (what SHOULD show)
    const strictFilterLogs = await prisma.accessLog.findMany({
      where: {
        AND: [
          { projectCityId: perfectItAmsterdam.id },
          { lock: { projectCityId: perfectItAmsterdam.id } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 15,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true,
            projectCity: {
              include: {
                project: true,
                city: true
              }
            }
          }
        },
        lock: {
          select: {
            name: true,
            projectCityId: true
          }
        }
      }
    });
    
    console.log(`\n✅ LOGS THAT MATCH STRICT FILTER (${strictFilterLogs.length} logs):`);
    console.log('================================================');
    strictFilterLogs.forEach((log, index) => {
      const userProject = log.user?.projectCity?.project?.name || 'No User';
      const userCity = log.user?.projectCity?.city?.name || '';
      console.log(`   ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`      User: ${log.user?.firstName || 'Unknown'} ${log.user?.lastName || ''} (${userProject} - ${userCity})`);
      console.log(`      Lock: ${log.lock.name}`);
      console.log(`      Result: ${log.result}`);
      console.log(`      Access Log ProjectCityId: ${log.projectCityId}`);
      console.log(`      Lock ProjectCityId: ${log.lock.projectCityId}`);
      console.log(`      Match Expected: ${log.projectCityId === perfectItAmsterdam.id && log.lock.projectCityId === perfectItAmsterdam.id ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    // 4. Find ALL access logs for PerfectIT locks (regardless of access log projectCityId)
    const allPerfectItLockLogs = await prisma.accessLog.findMany({
      where: {
        lock: { projectCityId: perfectItAmsterdam.id }
      },
      orderBy: { timestamp: 'desc' },
      take: 15,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true,
            projectCity: {
              include: {
                project: true,
                city: true
              }
            }
          }
        },
        lock: {
          select: {
            name: true,
            projectCityId: true
          }
        }
      }
    });
    
    console.log(`\n🚨 ALL LOGS FOR PERFECTIT LOCKS (${allPerfectItLockLogs.length} logs):`);
    console.log('==========================================');
    allPerfectItLockLogs.forEach((log, index) => {
      const userProject = log.user?.projectCity?.project?.name || 'No User';
      const userCity = log.user?.projectCity?.city?.name || '';
      const isCrossTenant = log.projectCityId !== perfectItAmsterdam.id;
      const warningIcon = isCrossTenant ? '🚨' : '✅';
      
      console.log(`   ${warningIcon} ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`      User: ${log.user?.firstName || 'Unknown'} ${log.user?.lastName || ''} (${userProject} - ${userCity})`);
      console.log(`      Lock: ${log.lock.name}`);
      console.log(`      Result: ${log.result}`);
      console.log(`      Access Log ProjectCityId: ${log.projectCityId}`);
      console.log(`      Lock ProjectCityId: ${log.lock.projectCityId}`);
      console.log(`      Cross-Tenant Access Log: ${isCrossTenant ? 'YES (PROBLEM!)' : 'No'}`);
      console.log('');
    });
    
    // 5. Summary
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`   Logs matching strict filter: ${strictFilterLogs.length}`);
    console.log(`   Total logs for PerfectIT locks: ${allPerfectItLockLogs.length}`);
    console.log(`   Cross-tenant access logs: ${allPerfectItLockLogs.length - strictFilterLogs.length}`);
    
    if (strictFilterLogs.length < allPerfectItLockLogs.length) {
      console.log('\n🚨 TENANT ISOLATION ISSUE CONFIRMED!');
      console.log('The dashboard should only show logs that match the strict filter.');
      console.log('Cross-tenant access logs should have their projectCityId updated to match the lock\'s projectCityId.');
    } else {
      console.log('\n✅ Tenant isolation appears to be working correctly.');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugAccessLogTenantIsolation();