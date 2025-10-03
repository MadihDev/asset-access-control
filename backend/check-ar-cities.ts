import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkARCities() {
  try {
    const cities = await prisma.city.findMany({ 
      where: { 
        OR: [
          { name: { startsWith: 'A' } }, 
          { name: { startsWith: 'R' } }
        ]
      }, 
      select: { 
        id: true, 
        name: true 
      } 
    });

    console.log('A/R Cities:');
    cities.forEach(city => console.log(`ID: ${city.id} | Name: ${city.name}`));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkARCities();