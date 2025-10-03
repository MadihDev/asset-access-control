import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjectCityRelationships() {
  try {
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        },
        city: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('Project-City Relationships:');
    console.log('===========================');
    projectCities.forEach(pc => {
      console.log(`Project: ${pc.project.slug} (${pc.project.id}) | City: ${pc.city.name} (${pc.city.id})`);
    });

    console.log(`\nTotal relationships: ${projectCities.length}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkProjectCityRelationships();