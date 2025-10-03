const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({ 
      select: { 
        username: true, 
        role: true,
        projectCityId: true 
      } 
    });
    console.log('Available users:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();