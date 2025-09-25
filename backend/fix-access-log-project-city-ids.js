const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAccessLogProjectCityIds() {
  try {
    console.log('🔧 Fixing Access Log ProjectCity IDs...\n');
    
    // 1. Find all access logs where projectCityId doesn't match the lock's projectCityId
    const problematicLogs = await prisma.accessLog.findMany({
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
          include: {
            address: {
              include: {
                projectCity: {
                  include: {
                    project: true,
                    city: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    const logsToFix = problematicLogs.filter(log => 
      log.projectCityId !== log.lock.projectCityId
    );
    
    console.log(`🚨 Found ${logsToFix.length} access logs with incorrect projectCityId:\n`);
    
    logsToFix.forEach((log, index) => {
      const userProject = log.user?.projectCity?.project?.name || 'Unknown';
      const userCity = log.user?.projectCity?.city?.name || 'Unknown';
      const lockProject = log.lock.address.projectCity.project.name;
      const lockCity = log.lock.address.projectCity.city.name;
      
      console.log(`   ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`      User: ${log.user?.firstName} ${log.user?.lastName} (${userProject} - ${userCity})`);
      console.log(`      Lock: ${log.lock.name} (${lockProject} - ${lockCity})`);
      console.log(`      Current AccessLog ProjectCityId: ${log.projectCityId}`);
      console.log(`      Should be Lock ProjectCityId: ${log.lock.projectCityId}`);
      console.log(`      Result: ${log.result}`);
      console.log('');
    });
    
    if (logsToFix.length === 0) {
      console.log('✅ All access logs have correct projectCityId values!');
      return;
    }
    
    // 2. Fix the projectCityId values
    console.log('🔧 Updating access log projectCityId values to match their locks...\n');
    
    let updatedCount = 0;
    for (const log of logsToFix) {
      await prisma.accessLog.update({
        where: { id: log.id },
        data: { projectCityId: log.lock.projectCityId }
      });
      updatedCount++;
    }
    
    console.log(`✅ Updated ${updatedCount} access log projectCityId values\n`);
    
    // 3. Verify the fix
    console.log('🔍 Verifying access log tenant isolation...\n');
    
    const remainingIssues = await prisma.accessLog.findMany({
      include: {
        lock: true
      }
    });
    
    const stillProblematic = remainingIssues.filter(log => 
      log.projectCityId !== log.lock.projectCityId
    );
    
    if (stillProblematic.length === 0) {
      console.log('✅ Access log tenant isolation successfully restored!');
      console.log('   All access logs now have projectCityId matching their locks.');
    } else {
      console.log(`🚨 Still ${stillProblematic.length} access logs with mismatched projectCityId.`);
    }
    
    // 4. Show the correct tenant isolation rules
    console.log('\n📋 ACCESS LOG TENANT ISOLATION RULES:');
    console.log('=====================================');
    console.log('✅ Access log projectCityId should ALWAYS match the lock\'s projectCityId');
    console.log('✅ This ensures each tenant only sees access logs for their own locks');
    console.log('✅ Cross-tenant access attempts should be stored with the LOCK\'s tenant, not the USER\'s tenant');
    console.log('❌ Previously: Access logs used accessing user\'s projectCityId (wrong!)');
    console.log('✅ Now: Access logs use the lock\'s projectCityId (correct!)');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAccessLogProjectCityIds();