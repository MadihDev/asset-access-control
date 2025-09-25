const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAccessLogProjectCityIds() {
  console.log('🔧 Fixing AccessLog projectCityId values...');
  
  try {
    // Get all access logs that have a userId (we need to fix all of them)
    const accessLogsToFix = await prisma.accessLog.findMany({
      where: {
        userId: { not: null }
      },
      include: {
        user: {
          select: {
            id: true,
            projectCityId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${accessLogsToFix.length} access logs that need projectCityId updates`);
    
    if (accessLogsToFix.length === 0) {
      console.log('✅ No access logs need updates');
      return;
    }
    
    // Update each access log with the user's projectCityId
    let updateCount = 0;
    for (const log of accessLogsToFix) {
      if (log.user?.projectCityId) {
        const currentProjectCityId = log.projectCityId;
        const correctProjectCityId = log.user.projectCityId;
        
        // Only update if they're different
        if (currentProjectCityId !== correctProjectCityId) {
          await prisma.accessLog.update({
            where: { id: log.id },
            data: { projectCityId: correctProjectCityId }
          });
          updateCount++;
          console.log(`✅ Updated log ${log.id} for ${log.user.firstName} ${log.user.lastName}`);
          console.log(`   From: ${currentProjectCityId || 'null'} → To: ${correctProjectCityId}`);
        }
      } else {
        console.log(`⚠️  Skipped log ${log.id} for ${log.user?.firstName} ${log.user?.lastName} - user has no projectCityId`);
      }
    }
    
    console.log(`🎉 Successfully updated ${updateCount} access logs`);
    
    // Verify the fix by checking current state
    console.log('\n🔍 Verifying the fix...');
    const allLogs = await prisma.accessLog.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            projectCityId: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    console.log('\n📋 Recent access logs (first 10):');
    allLogs.forEach((log, i) => {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown User';
      const userProjectCity = log.user?.projectCityId || 'None';
      const logProjectCity = log.projectCityId || 'None';
      const match = userProjectCity === logProjectCity ? '✅' : '❌';
      
      console.log(`${i+1}. ${userName} | User ProjectCity: ${userProjectCity} | Log ProjectCity: ${logProjectCity} ${match}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing access logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAccessLogProjectCityIds();