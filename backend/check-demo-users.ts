import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDemoUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        role: true
      },
      take: 20
    });

    console.log('Demo Users Available:');
    console.log('==================');
    users.forEach(user => {
      console.log(`${user.username} | ${user.role}`);
    });

    console.log(`\nTotal users found: ${users.length}`);
    console.log('All users have password: demo123');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkDemoUsers();