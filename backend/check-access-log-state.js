const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAccessLogState() {
  console.log('🔍 Checking current AccessLog state...');
  
  try {
    // Get all access logs with their user information
    const allLogs = await prisma.accessLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            projectCityId: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 15
    });
    
    console.log(`📊 Found ${allLogs.length} access logs total`);
    
    console.log('\n📋 Access Log Details:');
    allLogs.forEach((log, i) => {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown User';
      const userProjectCity = log.user?.projectCityId || 'None';
      const logProjectCity = log.projectCityId || 'None';
      const match = userProjectCity === logProjectCity ? '✅' : '❌';
      
      console.log(`${i+1}. ${userName}`);
      console.log(`   User ProjectCityId: ${userProjectCity}`);
      console.log(`   Log ProjectCityId:  ${logProjectCity} ${match}`);
      console.log(`   Timestamp: ${log.timestamp}`);
      console.log('');
    });
    
    // Count by project city
    const projectCityCounts = {};
    allLogs.forEach(log => {
      const userProjectCity = log.user?.projectCityId || 'None';
      const logProjectCity = log.projectCityId || 'None';
      
      if (!projectCityCounts[userProjectCity]) {
        projectCityCounts[userProjectCity] = { userCount: 0, logCount: 0 };
      }
      projectCityCounts[userProjectCity].userCount++;
      
      if (!projectCityCounts[logProjectCity]) {
        projectCityCounts[logProjectCity] = { userCount: 0, logCount: 0 };
      }
      projectCityCounts[logProjectCity].logCount++;
    });
    
    console.log('\n📊 ProjectCity Distribution:');
    Object.entries(projectCityCounts).forEach(([projectCityId, counts]) => {
      console.log(`${projectCityId}:`);
      console.log(`  Users: ${counts.userCount}, Logs: ${counts.logCount}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccessLogState();