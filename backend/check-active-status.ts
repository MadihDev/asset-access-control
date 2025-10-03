import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActiveStatus() {
  try {
    // Check project active status
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true
      }
    });

    console.log('Project Active Status:');
    console.log('======================');
    projects.forEach(project => {
      console.log(`${project.slug} (${project.id}): ${project.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // Check city active status for Amsterdam, Rotterdam, Utrecht
    const cities = await prisma.city.findMany({
      where: {
        name: { in: ['Amsterdam', 'Rotterdam', 'Utrecht'] }
      },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    console.log('\nCity Active Status:');
    console.log('===================');
    cities.forEach(city => {
      console.log(`${city.name} (${city.id}): ${city.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // Check specific projectCity relationship
    const projectCity = await prisma.projectCity.findFirst({
      where: {
        project: { 
          slug: 'techcorp'
        },
        city: { name: 'Amsterdam' }
      },
      include: { 
        project: { 
          select: { 
            id: true, 
            slug: true, 
            isActive: true 
          } 
        }, 
        city: { 
          select: { 
            id: true, 
            name: true, 
            isActive: true 
          } 
        } 
      }
    });

    console.log('\nSpecific ProjectCity Check (techcorp + Amsterdam):');
    console.log('=================================================');
    if (projectCity) {
      console.log(`Found: ${projectCity.project.slug} + ${projectCity.city.name}`);
      console.log(`Project Active: ${projectCity.project.isActive}`);
      console.log(`City Active: ${projectCity.city.isActive}`);
    } else {
      console.log('ProjectCity relationship not found');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkActiveStatus();