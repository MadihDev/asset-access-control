const { PrismaClient } = require('@prisma/client');

async function getUsersForLogin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Getting users for login testing...');
    
    // Get the PerfectIT ProjectCity ID
    const projectCity = await prisma.projectCity.findFirst({
      where: {
        project: {
          name: 'PerfectIT Solutions'
        },
        city: {
          name: 'Amsterdam'
        }
      }
    });
    
    if (!projectCity) {
      console.log('❌ PerfectIT-Amsterdam not found');
      return;
    }
    
    console.log(`📍 PerfectIT-Amsterdam ID: ${projectCity.id}`);
    
    // Get all users in that tenant
    const users = await prisma.user.findMany({
      where: {
        projectCityId: projectCity.id
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        projectCityId: true
      },
      orderBy: {
        role: 'desc'
      }
    });
    
    console.log(`\n👥 Found ${users.length} users in PerfectIT-Amsterdam:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. Username: "${user.username}" | Email: ${user.email} | Role: ${user.role}`);
    });
    
    // Show login example for admin user
    const adminUser = users.find(u => u.role === 'ADMIN');
    if (adminUser) {
      console.log(`\n🔐 Login credentials for admin user:`);
      console.log(`{`);
      console.log(`  "username": "${adminUser.username}",`);
      console.log(`  "password": "admin123",`);
      console.log(`  "projectId": "PerfectIT Solutions",`);
      console.log(`  "cityName": "Amsterdam"`);
      console.log(`}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getUsersForLogin();