import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserProjectCityAssignments() {
  console.log('🔧 Fixing user project-city assignments...\n');

  try {
    // Define user assignments based on their usernames and intended projects
    const userAssignments = [
      {
        username: 'techcorpadmin',
        projectSlug: 'techcorp',
        cityName: 'Amsterdam',
        role: 'ADMIN'
      },
      {
        username: 'techcorpuser', 
        projectSlug: 'techcorp',
        cityName: 'Amsterdam',
        role: 'USER'
      },
      {
        username: 'safeaccessadmin',
        projectSlug: 'safeaccess', 
        cityName: 'Rotterdam',
        role: 'ADMIN'
      },
      {
        username: 'secureadmin',
        projectSlug: 'securebuildings',
        cityName: 'Amsterdam', 
        role: 'ADMIN'
      }
    ];

    console.log('📋 Planned user assignments:');
    userAssignments.forEach((assignment, i) => {
      console.log(`${i + 1}. ${assignment.username} → ${assignment.projectSlug} (${assignment.cityName}) [${assignment.role}]`);
    });
    console.log('');

    let updated = 0;
    let errors = 0;

    for (const assignment of userAssignments) {
      try {
        // Find the user
        const user = await prisma.user.findUnique({
          where: { username: assignment.username }
        });

        if (!user) {
          console.log(`❌ User not found: ${assignment.username}`);
          errors++;
          continue;
        }

        // Find the project
        const project = await prisma.project.findFirst({
          where: { slug: assignment.projectSlug }
        });

        if (!project) {
          console.log(`❌ Project not found: ${assignment.projectSlug}`);
          errors++;
          continue;
        }

        // Find the city
        const city = await prisma.city.findFirst({
          where: { name: assignment.cityName }
        });

        if (!city) {
          console.log(`❌ City not found: ${assignment.cityName}`);
          errors++;
          continue;
        }

        // Find the project-city relationship
        const projectCity = await prisma.projectCity.findFirst({
          where: {
            projectId: project.id,
            cityId: city.id
          }
        });

        if (!projectCity) {
          console.log(`❌ Project-city relationship not found: ${assignment.projectSlug} + ${assignment.cityName}`);
          errors++;
          continue;
        }

        // Update the user with project-city assignment
        await prisma.user.update({
          where: { id: user.id },
          data: {
            projectCityId: projectCity.id,
            role: assignment.role as 'ADMIN' | 'USER'
          }
        });

        console.log(`✅ ${assignment.username} → ${assignment.projectSlug} (${assignment.cityName}) [${assignment.role}]`);
        updated++;

      } catch (error) {
        console.log(`❌ Error updating ${assignment.username}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Users updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);

    // Verify the assignments
    console.log('\n🔍 VERIFICATION:');
    const users = await prisma.user.findMany({
      include: {
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    });

    users.forEach(user => {
      if (user.projectCity) {
        console.log(`✅ ${user.username} → ${user.projectCity.project.slug} (${user.projectCity.city.name}) [${user.role}]`);
      } else {
        console.log(`❌ ${user.username} → NO ASSIGNMENT`);
      }
    });

    console.log('\n🎉 User assignments fixed! Try logging in now with:');
    console.log('Username: techcorpadmin');
    console.log('Password: demo123');
    console.log('Project: techcorp');
    console.log('City: Amsterdam');

  } catch (error) {
    console.error('❌ Error fixing user assignments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixUserProjectCityAssignments();