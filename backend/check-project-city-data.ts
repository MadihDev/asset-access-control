import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjectsAndCities() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        slug: true,
        name: true
      }
    });

    console.log('Available Projects:');
    console.log('==================');
    projects.forEach(project => {
      console.log(`ID: ${project.id} | Slug: ${project.slug} | Name: ${project.name}`);
    });

    const cities = await prisma.city.findMany({
      select: {
        id: true,
        name: true
      },
      take: 10
    });

    console.log('\nAvailable Cities:');
    console.log('================');
    cities.forEach(city => {
      console.log(`ID: ${city.id} | Name: ${city.name}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkProjectsAndCities();