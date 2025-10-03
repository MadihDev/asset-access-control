import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Strategic Project-City Configuration
 * Links cities to projects based on realistic business scenarios
 */
async function configureProjectCitiesStrategic() {
  console.log('🎯 Configuring strategic project-city relationships...\n');

  try {
    // Get projects and cities
    const projects = await prisma.project.findMany();
    const cities = await prisma.city.findMany();
    
    // Define realistic project-city strategies
    const projectStrategies = {
      'techcorp': {
        name: 'TechCorp Solutions',
        description: 'National tech company with offices in major cities',
        cities: [
          'Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen',
          'Tilburg', 'Breda', 'Nijmegen', 'Haarlem', 'Arnhem'
        ]
      },
      'safeaccess': {
        name: 'SafeAccess Ltd', 
        description: 'Security company focused on port cities and logistics hubs',
        cities: [
          'Rotterdam', 'Amsterdam', 'Utrecht', 'Vlissingen', 'Den Helder',
          'Schiedam', 'Dordrecht', 'Hoorn', 'Lelystad'
        ]
      },
      'securebuildings': {
        name: 'SecureBuildings Inc',
        description: 'Construction security serving all Dutch regions',
        cities: [
          'Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen',
          'Maastricht', 'Leeuwarden', 'Assen', 'Zwolle', 'Den Bosch',
          'Middelburg', 'Haarlem', 'Leiden', 'Delft', 'Breda',
          'Tilburg', 'Apeldoorn', 'Nijmegen', 'Enschede', 'Heerlen'
        ]
      }
    };

    // Clear existing relationships first
    console.log('🧹 Clearing existing project-city relationships...');
    await prisma.projectCity.deleteMany({});
    
    // Apply strategic configurations
    for (const project of projects) {
      const strategy = projectStrategies[project.slug as keyof typeof projectStrategies];
      if (!strategy) {
        console.log(`⚠️ No strategy defined for project: ${project.slug}`);
        continue;
      }

      console.log(`\n📁 ${strategy.name}`);
      console.log(`   ${strategy.description}`);
      console.log(`   Target cities: ${strategy.cities.length}`);

      let linked = 0;
      let notFound = 0;

      for (const cityName of strategy.cities) {
        const city = cities.find(c => c.name === cityName);
        if (city) {
          await prisma.projectCity.create({
            data: {
              projectId: project.id,
              cityId: city.id
            }
          });
          console.log(`   ✅ ${cityName}`);
          linked++;
        } else {
          console.log(`   ❌ City not found: ${cityName}`);
          notFound++;
        }
      }

      console.log(`   📊 Linked: ${linked}, Not found: ${notFound}`);
    }

    // Verification and summary
    console.log('\n📊 FINAL CONFIGURATION:');
    for (const project of projects) {
      const projectCities = await prisma.projectCity.findMany({
        where: { projectId: project.id },
        include: { city: true }
      });
      
      const strategy = projectStrategies[project.slug as keyof typeof projectStrategies];
      console.log(`\n${project.name} (${project.slug}):`);
      console.log(`  Strategy: ${strategy?.description || 'No strategy'}`);
      console.log(`  Cities: ${projectCities.length}`);
      
      // Show first few cities
      projectCities.slice(0, 8).forEach(pc => {
        console.log(`    → ${pc.city.name}`);
      });
      if (projectCities.length > 8) {
        console.log(`    ... and ${projectCities.length - 8} more cities`);
      }
    }

    console.log('\n✅ Strategic project-city configuration complete!');
    console.log('\n💡 Benefits of this approach:');
    console.log('  • Realistic business scenarios');
    console.log('  • Better data quality and reporting');
    console.log('  • Proper multi-tenant isolation');
    console.log('  • Scalable for future projects');
    
    console.log('\n🔧 To modify city assignments:');
    console.log('  • Edit the projectStrategies object in this script');
    console.log('  • Run the script again to apply changes');

  } catch (error) {
    console.error('❌ Error configuring project cities:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

configureProjectCitiesStrategic();