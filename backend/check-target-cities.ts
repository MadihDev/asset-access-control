import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTargetCities() {
  try {
    const cities = await prisma.city.findMany({ 
      where: { 
        name: { 
          in: ['Amsterdam', 'Rotterdam', 'Utrecht'] 
        } 
      }, 
      select: { 
        id: true, 
        name: true 
      } 
    });

    console.log('Target Cities:');
    cities.forEach(city => console.log(`ID: ${city.id} | Name: ${city.name}`));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkTargetCities();