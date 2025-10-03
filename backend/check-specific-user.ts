import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificUser() {
  try {
    // Check if the user exists
    const user = await prisma.user.findFirst({
      where: {
        username: 'techcorpadminamsterdam'
      },
      include: {
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    });

    console.log('User Check:');
    console.log('===========');
    if (user) {
      console.log(`Found user: ${user.username}`);
      console.log(`Role: ${user.role}`);
      if (user.projectCity) {
        console.log(`Project: ${user.projectCity.project.slug} (${user.projectCity.project.name})`);
        console.log(`City: ${user.projectCity.city.name}`);
        console.log(`User Active: ${user.isActive}`);
        console.log(`Project Active: ${user.projectCity.project.isActive}`);
        console.log(`City Active: ${user.projectCity.city.isActive}`);
      } else {
        console.log('User has no projectCity relationship');
      }
    } else {
      console.log('User not found');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkSpecificUser();