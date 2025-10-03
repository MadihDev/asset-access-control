// complete-2fa-setup.ts
// Complete setup script for 2FA testing (creates cities, projects, users)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function completeSetup() {
  console.log('🚀 Complete 2FA Setup - Creating Everything Needed...\n');

  try {
    // 1. Create cities
    console.log('🏙️  Creating cities...');
    const cities = [
      { name: 'Amsterdam', country: 'Netherlands' },
      { name: 'Rotterdam', country: 'Netherlands' },
      { name: 'Utrecht', country: 'Netherlands' },
      { name: 'The Hague', country: 'Netherlands' },
      { name: 'Eindhoven', country: 'Netherlands' }
    ];

    for (const cityData of cities) {
      await prisma.city.upsert({
        where: { name: cityData.name },
        create: cityData,
        update: cityData
      });
    }
    console.log(`✅ Created ${cities.length} cities`);

    // 2. Create projects
    console.log('🏢 Creating projects...');
    const perfectIT = await prisma.project.upsert({
      where: { slug: 'perfectit' },
      create: {
        name: 'PerfectIT Solutions',
        slug: 'perfectit',
        isActive: true
      },
      update: {}
    });

    const acmeCorp = await prisma.project.upsert({
      where: { slug: 'acmecorp' },
      create: {
        name: 'Acme Corporation',
        slug: 'acmecorp',
        isActive: true
      },
      update: {}
    });
    console.log('✅ Created projects: PerfectIT Solutions, Acme Corporation');

    // 3. Get cities for project-city relationships
    const amsterdam = await prisma.city.findUnique({ where: { name: 'Amsterdam' } });
    const rotterdam = await prisma.city.findUnique({ where: { name: 'Rotterdam' } });
    const utrecht = await prisma.city.findUnique({ where: { name: 'Utrecht' } });

    if (!amsterdam || !rotterdam || !utrecht) {
      throw new Error('Cities not found');
    }

    // 4. Create project-city relationships
    console.log('🔗 Creating project-city relationships...');
    const projectCities = [
      { projectId: perfectIT.id, cityId: amsterdam.id },
      { projectId: perfectIT.id, cityId: rotterdam.id },
      { projectId: acmeCorp.id, cityId: amsterdam.id },
      { projectId: acmeCorp.id, cityId: utrecht.id }
    ];

    for (const pc of projectCities) {
      await prisma.projectCity.upsert({
        where: {
          projectId_cityId: {
            projectId: pc.projectId,
            cityId: pc.cityId
          }
        },
        create: pc,
        update: {}
      });
    }
    console.log('✅ Created project-city relationships');

    // 5. Create test user with 2FA
    console.log('👤 Creating test user with 2FA...');
    const acmeAmsterdam = await prisma.projectCity.findFirst({
      where: {
        project: { slug: 'acmecorp' },
        city: { name: 'Amsterdam' }
      }
    });

    if (!acmeAmsterdam) {
      throw new Error('Acme Amsterdam project-city not found');
    }

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
        projectCityId: acmeAmsterdam.id,
        // 2FA Configuration - UPDATE THIS PHONE NUMBER!
        phone: '+1234567890', // ⚠️ Replace with your actual phone number
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date()
      },
      update: {
        phone: '+1234567890', // ⚠️ Replace with your actual phone number
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
        password: hashedPassword
      }
    });

    // 6. Create notification templates
    console.log('📝 Creating notification templates...');
    await prisma.notificationTemplate.upsert({
      where: { name: '2FA_VERIFICATION_CODE' },
      create: {
        name: '2FA_VERIFICATION_CODE',
        type: 'SMS',
        subject: null,
        body: 'Your verification code is: {{code}}. This code expires in {{expiryMinutes}} minutes.',
        isActive: true
      },
      update: {
        body: 'Your verification code is: {{code}}. This code expires in {{expiryMinutes}} minutes.',
        isActive: true
      }
    });

    console.log('\n🎉 Complete 2FA Setup Finished Successfully!');
    console.log('=' .repeat(50));
    
    console.log('\n📋 Test User Created:');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: TestPassword123!`);
    console.log(`   Phone: ${testUser.phone} ⚠️  UPDATE THIS TO YOUR PHONE!`);
    console.log(`   2FA Enabled: ${testUser.twoFactorEnabled}`);
    console.log(`   Project: Acme Corporation`);
    console.log(`   City: Amsterdam`);

    console.log('\n🧪 How to Test 2FA:');
    console.log('1. ⚠️  IMPORTANT: Update phone number to YOUR actual phone:');
    console.log('   Run: UPDATE users SET phone = \'+19876543210\' WHERE username = \'testuser2fa\';');
    console.log('');
    console.log('2. Start your backend server:');
    console.log('   npm run dev');
    console.log('');
    console.log('3. Test login (should trigger 2FA):');
    console.log('   POST http://localhost:5000/api/auth/login');
    console.log('   {');
    console.log('     "username": "testuser2fa",');
    console.log('     "password": "TestPassword123!",');
    console.log('     "projectId": "acmecorp",');
    console.log('     "cityName": "Amsterdam"');
    console.log('   }');
    console.log('');
    console.log('4. You should receive SMS with 6-digit code');
    console.log('');
    console.log('5. Verify 2FA code:');
    console.log('   POST http://localhost:5000/api/auth/verify2fa');
    console.log('   {');
    console.log('     "challengeId": "challenge_id_from_login_response",');
    console.log('     "code": "123456"');
    console.log('   }');

    console.log('\n✅ Your Twilio 2FA system is now 100% ready for testing!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  console.log('🔐 COMPLETE 2FA SETUP');
  console.log('=====================\n');
  
  await completeSetup();
}

// Export for use in other scripts
export { completeSetup };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}