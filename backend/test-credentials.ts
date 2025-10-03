import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function testCredentials() {
  try {
    const testUsername = 'techcorpadminamsterdam';
    const testPassword = 'password123';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { projectCity: { include: { project: true, city: true } } }
    });
    
    if (!user) {
      console.log(`❌ User ${testUsername} not found`);
      return;
    }
    
    console.log(`✅ User found: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   IsActive: ${user.isActive}`);
    console.log(`   ProjectCity: ${user.projectCity?.project.name}/${user.projectCity?.city.name}`);
    console.log(`   ProjectCityId: ${user.projectCityId}`);
    
    // Test password
    const passwordMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`   Password Match: ${passwordMatch}`);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match. Trying common passwords...');
      const commonPasswords = ['password', 'admin', '123456', 'test', 'demo'];
      
      for (const pwd of commonPasswords) {
        const match = await bcrypt.compare(pwd, user.password);
        if (match) {
          console.log(`✅ Password found: "${pwd}"`);
          break;
        }
      }
    }
    
    // Test project-city lookup
    console.log('\n=== TESTING PROJECT-CITY LOOKUP ===');
    const projectCity = await prisma.projectCity.findFirst({
      where: {
        project: { 
          OR: [
            { slug: 'techcorp' },
            { name: 'techcorp' }
          ]
        },
        city: { name: 'Amsterdam' }
      },
      include: { project: true, city: true }
    });
    
    if (projectCity) {
      console.log(`✅ ProjectCity found: ${projectCity.id}`);
      console.log(`   Project: ${projectCity.project.name} (slug: ${projectCity.project.slug})`);
      console.log(`   City: ${projectCity.city.name}`);
      console.log(`   User's ProjectCityId matches: ${user.projectCityId === projectCity.id}`);
    } else {
      console.log('❌ ProjectCity not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCredentials();