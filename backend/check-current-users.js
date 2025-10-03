const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking current users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        projectCity: {
          select: {
            id: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            city: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: "${user.username}"`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      if (user.projectCity) {
        console.log(`   Project: ${user.projectCity.project?.name || 'Unknown'}`);
        console.log(`   City: ${user.projectCity.city?.name || 'Unknown'}`);
      }
      console.log('');
    });
    
    // Check cities
    const cities = await prisma.city.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`\nAvailable cities (${cities.length}):`);
    cities.forEach(city => {
      console.log(`- ${city.name} (ID: ${city.id})`);
    });
    
    // Check projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true
      }
    });
    
    console.log(`\nAvailable projects (${projects.length}):`);
    projects.forEach(project => {
      console.log(`- ${project.name} (ID: ${project.id}, Slug: ${project.slug || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();