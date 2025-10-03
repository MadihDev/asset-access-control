import prisma from './src/lib/prisma.js';

async function getSafeAccessUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { projectCity: { include: { project: true, city: true } } }
    });
    
    console.log('=== SAFEACCESS USERS ===');
    users.filter(u => u.projectCity?.project.slug === 'safeaccess').forEach(u => {
      console.log(`Username: ${u.username}, Project: ${u.projectCity.project.name}, City: ${u.projectCity.city.name}`);
    });

    console.log('\n=== ALL PROJECT USERS BY PROJECT ===');
    const projectGroups = {};
    users.forEach(u => {
      if (u.projectCity) {
        const projectSlug = u.projectCity.project.slug;
        if (!projectGroups[projectSlug]) projectGroups[projectSlug] = [];
        projectGroups[projectSlug].push(u);
      }
    });

    Object.keys(projectGroups).forEach(projectSlug => {
      console.log(`\n${projectSlug.toUpperCase()} USERS:`);
      projectGroups[projectSlug].forEach(u => {
        console.log(`  ${u.username} (${u.role}) - ${u.projectCity.city.name}`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getSafeAccessUsers();