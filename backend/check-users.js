const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  console.log('👥 CHECKING USER DATABASE');
  console.log('=========================\n');
  
  // Get all users with their project-city info
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      projectCityId: true,
      createdAt: true,
      updatedAt: true,
      projectCity: {
        select: {
          project: { select: { name: true } },
          city: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`📊 Total users in database: ${users.length}\n`);
  
  // Show all users
  users.forEach((user, index) => {
    const projectName = user.projectCity?.project?.name || 'No Project';
    const cityName = user.projectCity?.city?.name || 'No City';
    const isRecent = new Date() - new Date(user.createdAt) < 60 * 60 * 1000; // within last hour
    
    console.log(`${index + 1}. ${user.firstName} ${user.lastName} ${isRecent ? '🆕' : ''}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Project-City: ${projectName} - ${cityName}`);
    console.log(`   ProjectCityId: ${user.projectCityId}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
    if (user.createdAt !== user.updatedAt) {
      console.log(`   Updated: ${new Date(user.updatedAt).toLocaleString()}`);
    }
    console.log('');
  });
  
  // Check for PerfectIT users specifically
  const perfectitUsers = users.filter(u => 
    u.projectCity?.project?.name === 'PerfectIT Solutions'
  );
  
  console.log(`🏢 PerfectIT Solutions users: ${perfectitUsers.length}`);
  perfectitUsers.forEach(user => {
    const cityName = user.projectCity?.city?.name || 'No City';
    console.log(`   - ${user.firstName} ${user.lastName} (${user.role}) in ${cityName}`);
  });
  
  // Show recent users (created in last hour)
  const recentUsers = users.filter(u => 
    new Date() - new Date(u.createdAt) < 60 * 60 * 1000
  );
  
  if (recentUsers.length > 0) {
    console.log(`\n🆕 Recently created users (last hour): ${recentUsers.length}`);
    recentUsers.forEach(user => {
      const projectName = user.projectCity?.project?.name || 'No Project';
      const cityName = user.projectCity?.city?.name || 'No City';
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${projectName} - ${cityName}`);
      console.log(`     Created: ${new Date(user.createdAt).toLocaleString()}`);
    });
  }
  
  await prisma.$disconnect();
}

checkUsers().catch(console.error);