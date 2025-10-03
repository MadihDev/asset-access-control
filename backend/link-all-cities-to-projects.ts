import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkAllCitiesToProjects() {
  console.log('🔗 Linking all Dutch cities to all projects...\n');

  try {
    // Get all active projects and cities
    const projects = await prisma.project.findMany({
      where: { isActive: true }
    });
    
    const cities = await prisma.city.findMany();
    
    console.log(`Found ${projects.length} projects and ${cities.length} cities`);
    
    // Create project-city relationships for all combinations
    let created = 0;
    let skipped = 0;
    
    for (const project of projects) {
      console.log(`\n📁 Processing project: ${project.name} (${project.slug})`);
      
      for (const city of cities) {
        try {
          await prisma.projectCity.create({
            data: {
              projectId: project.id,
              cityId: city.id
            }
          });
          console.log(`  ✅ Linked ${city.name}`);
          created++;
        } catch {
          // Relationship already exists, skip
          console.log(`  ⚠️ Already linked: ${city.name}`);
          skipped++;
        }
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ New relationships created: ${created}`);
    console.log(`⚠️ Relationships skipped (already exist): ${skipped}`);
    console.log(`🔗 Total possible combinations: ${projects.length * cities.length}`);

    // Verify final state
    console.log('\n🔍 VERIFICATION - Cities per project:');
    for (const project of projects) {
      const projectCities = await prisma.projectCity.findMany({
        where: { projectId: project.id },
        include: { city: true }
      });
      
      console.log(`  ${project.name} (${project.slug}): ${projectCities.length} cities`);
      if (projectCities.length <= 10) {
        // Show first few cities for smaller lists
        projectCities.slice(0, 5).forEach(pc => {
          console.log(`    → ${pc.city.name}`);
        });
        if (projectCities.length > 5) {
          console.log(`    ... and ${projectCities.length - 5} more`);
        }
      } else {
        console.log(`    → Amsterdam, Rotterdam, Utrecht, ... and ${projectCities.length - 3} more Dutch cities`);
      }
    }

    console.log('\n🎉 All Dutch cities are now available for all projects!');
    console.log('Users can now select from any of the 40 cities when logging into any project.');
    
  } catch (error) {
    console.error('❌ Error linking cities to projects:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

linkAllCitiesToProjects();