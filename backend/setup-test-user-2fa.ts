// setup-test-user-2fa.ts
// Script to create a test user with 2FA enabled for testing

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupTestUser2FA() {
  console.log('👤 Setting up test user with 2FA...\n');

  try {
    // First, let's see what project cities are available
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true
      }
    });

    if (projectCities.length === 0) {
      console.log('❌ No project cities found. Please run the demo data creation first:');
      console.log('   npx tsx create-multi-tenant-demo.ts');
      return;
    }

    console.log('🏢 Available Project Cities:');
    projectCities.forEach((pc, index) => {
      console.log(`${index + 1}. ${pc.project.name} - ${pc.city.name}`);
    });

    // Use the first project city for our test user
    const selectedProjectCity = projectCities[0];
    console.log(`\n✅ Using: ${selectedProjectCity.project.name} - ${selectedProjectCity.city.name}`);

    // Create test user with 2FA
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const testUser = await prisma.user.upsert({
      where: { username: 'testuser2fa' },
      create: {
        username: 'testuser2fa',
        email: 'testuser2fa@example.com',
        firstName: 'Test',
        lastName: 'User2FA',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        projectCityId: selectedProjectCity.id,
        // 2FA Configuration
        phone: '+1234567890', // Replace with your actual phone number for testing
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date()
      },
      update: {
        phone: '+1234567890', // Replace with your actual phone number for testing
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
        password: hashedPassword
      }
    });

    console.log('\n🎉 Test user created successfully!');
    console.log('📋 User Details:');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: TestPassword123!`);
    console.log(`   Phone: ${testUser.phone}`);
    console.log(`   2FA Enabled: ${testUser.twoFactorEnabled}`);
    console.log(`   Project: ${selectedProjectCity.project.name}`);
    console.log(`   City: ${selectedProjectCity.city.name}`);

    console.log('\n🧪 To test 2FA:');
    console.log('1. ⚠️  IMPORTANT: Update the phone number above to YOUR actual phone number');
    console.log('2. Start your backend server: npm run dev');
    console.log('3. Try logging in with these credentials:');
    console.log('   POST /api/auth/login');
    console.log('   {');
    console.log('     "username": "testuser2fa",');
    console.log('     "password": "TestPassword123!",');
    console.log(`     "projectId": "${selectedProjectCity.project.slug}",`);
    console.log(`     "cityName": "${selectedProjectCity.city.name}"`);
    console.log('   }');
    console.log('4. You should receive an SMS with a 6-digit code');
    console.log('5. Use POST /api/auth/verify2fa to complete login');

    console.log('\n⚠️  REMEMBER TO UPDATE PHONE NUMBER:');
    console.log('Run this script again or manually update the user\'s phone number in the database');

  } catch (error) {
    console.error('❌ Error setting up test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  console.log('🔐 2FA TEST USER SETUP');
  console.log('======================\n');
  
  await setupTestUser2FA();
}

// Export for use in other scripts
export { setupTestUser2FA };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}