import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugLoginIssue() {
  console.log('🔍 Debugging login issue...\n');

  try {
    // Check current users and their project-city assignments
    console.log('👥 CURRENT USERS:');
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
      console.log(`\n📝 User: ${user.username}`);
      console.log(`   Password: ${user.password ? '[SET]' : '[MISSING]'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      if (user.projectCity) {
        console.log(`   Project: ${user.projectCity.project.name} (${user.projectCity.project.slug})`);
        console.log(`   City: ${user.projectCity.city.name}`);
        console.log(`   ProjectCityId: ${user.projectCityId}`);
      } else {
        console.log(`   ❌ NO PROJECT-CITY ASSIGNMENT`);
        console.log(`   ProjectCityId: ${user.projectCityId || 'None'}`);
      }
    });

    console.log(`\n📊 Total users: ${users.length}`);
    const usersWithProjectCity = users.filter(u => u.projectCity);
    const usersWithoutProjectCity = users.filter(u => !u.projectCity);
    console.log(`✅ Users with project-city: ${usersWithProjectCity.length}`);
    console.log(`❌ Users without project-city: ${usersWithoutProjectCity.length}`);

    // Check available project-city combinations
    console.log('\n🔗 AVAILABLE PROJECT-CITY COMBINATIONS:');
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true
      }
    });

    const projectGroups = projectCities.reduce((acc, pc) => {
      const projectKey = `${pc.project.name} (${pc.project.slug})`;
      if (!acc[projectKey]) acc[projectKey] = [];
      acc[projectKey].push(pc.city.name);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(projectGroups).forEach(([project, cities]) => {
      console.log(`\n📁 ${project}: ${cities.length} cities`);
      cities.slice(0, 5).forEach(city => console.log(`   → ${city}`));
      if (cities.length > 5) {
        console.log(`   ... and ${cities.length - 5} more`);
      }
    });

    // Check for common login issues
    console.log('\n🚨 POTENTIAL ISSUES:');
    const issues = [];

    if (usersWithoutProjectCity.length > 0) {
      issues.push(`${usersWithoutProjectCity.length} users have no project-city assignment`);
    }

    const inactiveUsers = users.filter(u => !u.isActive);
    if (inactiveUsers.length > 0) {
      issues.push(`${inactiveUsers.length} users are inactive`);
    }

    const usersWithoutPassword = users.filter(u => !u.password);
    if (usersWithoutPassword.length > 0) {
      issues.push(`${usersWithoutPassword.length} users have no password`);
    }

    if (issues.length === 0) {
      console.log('✅ No obvious user configuration issues found');
    } else {
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ❌ ${issue}`);
      });
    }

    // Provide login guidance
    console.log('\n💡 LOGIN GUIDANCE:');
    console.log('To login successfully, you need:');
    console.log('1. Valid username from the users above');
    console.log('2. Correct password (see demo credentials)');
    console.log('3. Project slug that matches the user\'s project');
    console.log('4. City that exists in that project\'s city list');
    
    if (usersWithProjectCity.length > 0) {
      const exampleUser = usersWithProjectCity[0];
      console.log('\n🎯 WORKING LOGIN EXAMPLE:');
      console.log(`Username: ${exampleUser.username}`);
      console.log(`Password: demo123 (if using demo data)`);
      console.log(`Project: ${exampleUser.projectCity!.project.slug}`);
      console.log(`City: ${exampleUser.projectCity!.city.name}`);
    }

  } catch (error) {
    console.error('❌ Error debugging login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLoginIssue();