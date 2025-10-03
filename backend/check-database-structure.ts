import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database structure...\n');
  
  try {
    // Check projects
    const projects = await prisma.project.findMany();
    console.log('📁 PROJECTS:');
    projects.forEach(p => {
      console.log(`  - ${p.name} (slug: ${p.slug}, id: ${p.id})`);
    });
    console.log(`  Total projects: ${projects.length}\n`);
    
    // Check cities
    const cities = await prisma.city.findMany();
    console.log('🏙️ CITIES:');
    cities.forEach(c => {
      console.log(`  - ${c.name} (id: ${c.id})`);
    });
    console.log(`  Total cities: ${cities.length}\n`);
    
    // Check project-city relationships
    const projectCities = await prisma.projectCity.findMany({
      include: { 
        project: { select: { name: true, slug: true } }, 
        city: { select: { name: true } } 
      }
    });
    console.log('🔗 PROJECT-CITY RELATIONSHIPS:');
    projectCities.forEach(pc => {
      console.log(`  - ${pc.project.name} (${pc.project.slug}) → ${pc.city.name}`);
    });
    console.log(`  Total project-city pairs: ${projectCities.length}\n`);
    
    // Group cities by project
    console.log('📊 CITIES BY PROJECT:');
    const projectGroups = projectCities.reduce((acc, pc) => {
      const projectKey = `${pc.project.name} (${pc.project.slug})`;
      if (!acc[projectKey]) acc[projectKey] = [];
      acc[projectKey].push(pc.city.name);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(projectGroups).forEach(([project, cities]) => {
      console.log(`  ${project}:`);
      cities.forEach(city => console.log(`    → ${city}`));
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();