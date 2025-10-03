// create-perfectit-project.ts
// Script to create Perfect IT project and link it to Amsterdam

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPerfectITProject() {
  console.log('🚀 Creating Perfect IT Project in Amsterdam...\n');

  try {
    // 1. Check if Amsterdam city exists
    console.log('🏙️  Checking if Amsterdam exists...');
    let amsterdam = await prisma.city.findUnique({
      where: { name: 'Amsterdam' }
    });

    if (!amsterdam) {
      console.log('📍 Creating Amsterdam city...');
      amsterdam = await prisma.city.create({
        data: {
          name: 'Amsterdam',
          country: 'Netherlands'
        }
      });
      console.log('✅ Amsterdam city created');
    } else {
      console.log('✅ Amsterdam city found');
    }

    // 2. Create Perfect IT project
    console.log('🏢 Creating Perfect IT project...');
    const perfectIT = await prisma.project.upsert({
      where: { slug: 'perfect-it' },
      create: {
        name: 'Perfect IT',
        slug: 'perfect-it',
        isActive: true
      },
      update: {
        name: 'Perfect IT',
        isActive: true
      }
    });

    if (perfectIT) {
      console.log('✅ Perfect IT project created/updated');
      console.log(`   ID: ${perfectIT.id}`);
      console.log(`   Name: ${perfectIT.name}`);
      console.log(`   Slug: ${perfectIT.slug}`);
    }

    // 3. Create project-city relationship
    console.log('🔗 Linking Perfect IT to Amsterdam...');
    const projectCity = await prisma.projectCity.upsert({
      where: {
        projectId_cityId: {
          projectId: perfectIT.id,
          cityId: amsterdam.id
        }
      },
      create: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      },
      update: {}
    });

    console.log('✅ Perfect IT linked to Amsterdam');
    console.log(`   ProjectCity ID: ${projectCity.id}`);

    // 4. Verify the setup
    console.log('\n🔍 Verifying setup...');
    const verification = await prisma.projectCity.findUnique({
      where: { id: projectCity.id },
      include: {
        project: true,
        city: true
      }
    });

    if (verification) {
      console.log('✅ Verification successful!');
      console.log(`   Project: ${verification.project.name} (${verification.project.slug})`);
      console.log(`   City: ${verification.city.name}, ${verification.city.country}`);
      console.log(`   Active: ${verification.project.isActive}`);
    }

    // 5. Show all project-city relationships
    console.log('\n📊 Current Project-City Relationships:');
    const allProjectCities = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true
      },
      orderBy: [
        { project: { name: 'asc' } },
        { city: { name: 'asc' } }
      ]
    });

    allProjectCities.forEach((pc, index) => {
      console.log(`   ${index + 1}. ${pc.project.name} → ${pc.city.name}, ${pc.city.country}`);
    });

    console.log('\n🎉 Perfect IT Project Setup Complete!');
    console.log('=' .repeat(50));
    console.log('\n📋 Project Details:');
    console.log(`   Name: Perfect IT`);
    console.log(`   Slug: perfect-it`);
    console.log(`   City: Amsterdam, Netherlands`);
    console.log(`   Status: Active`);
    console.log(`   ProjectCity ID: ${projectCity.id}`);

    console.log('\n🧪 Usage Examples:');
    console.log('• Create users for this project:');
    console.log(`  projectCityId: "${projectCity.id}"`);
    console.log('');
    console.log('• API authentication:');
    console.log('  projectId: "perfect-it"');
    console.log('  cityName: "Amsterdam"');
    console.log('');
    console.log('• Test login:');
    console.log('  POST /api/auth/login');
    console.log('  {');
    console.log('    "username": "your_username",');
    console.log('    "password": "your_password",');
    console.log('    "projectId": "perfect-it",');
    console.log('    "cityName": "Amsterdam"');
    console.log('  }');

  } catch (error) {
    console.error('❌ Error creating Perfect IT project:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPerfectITProject().catch(console.error);