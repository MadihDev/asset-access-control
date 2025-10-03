import prisma from './src/lib/prisma.js';

async function getAuthData() {
  try {
    // Get projects
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true }
    });
    console.log('=== PROJECTS ===');
    projects.forEach(p => console.log(`ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}`));

    // Get cities
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    console.log('\n=== CITIES ===');
    cities.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));

    // Get project-city relationships
    const projectCities = await prisma.projectCity.findMany({
      include: { project: true, city: true }
    });
    console.log('\n=== PROJECT-CITY RELATIONSHIPS ===');
    projectCities.forEach(pc => console.log(`ProjectCity ID: ${pc.id}, Project: ${pc.project.name}, City: ${pc.city.name}`));

    // Get users with project-city info
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { projectCity: { include: { project: true, city: true } } },
      take: 10
    });
    console.log('\n=== USERS (first 10) ===');
    users.forEach(u => {
      const pcInfo = u.projectCity ? `${u.projectCity.project.name}/${u.projectCity.city.name}` : 'No project-city';
      console.log(`Username: ${u.username}, Role: ${u.role}, ProjectCity: ${pcInfo}`);
    });

    // Sample credentials for testing
    console.log('\n=== SAMPLE CREDENTIALS FOR TESTING ===');
    if (users.length > 0) {
      const sampleUser = users.find(u => u.projectCity && u.role === 'ADMIN') || users[0];
      if (sampleUser?.projectCity) {
        console.log('Recommended test credentials:');
        console.log(`  username: "${sampleUser.username}"`);
        console.log(`  projectId: "${sampleUser.projectCity.project.slug}" (or "${sampleUser.projectCity.project.name}")`);
        console.log(`  cityName: "${sampleUser.projectCity.city.name}"`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAuthData();