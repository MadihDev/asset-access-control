// fix-perfectit-usernames.ts
// Script to fix Perfect IT usernames to be alphanumeric only

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPerfectITUsernames() {
  console.log('🔧 Fixing Perfect IT Usernames to Alphanumeric Only...\n');

  try {
    // 1. Find Perfect IT Amsterdam project-city
    console.log('🔍 Finding Perfect IT Amsterdam project-city...');
    const perfectITAmsterdam = await prisma.projectCity.findFirst({
      where: {
        project: { slug: 'perfect-it' },
        city: { name: 'Amsterdam' }
      },
      include: {
        project: true,
        city: true
      }
    });

    if (!perfectITAmsterdam) {
      console.log('❌ Perfect IT Amsterdam not found.');
      return;
    }

    console.log('✅ Found Perfect IT Amsterdam');

    // 2. Delete old users with hyphens
    console.log('\n🗑️  Removing old users with invalid usernames...');
    
    const oldUsers = await prisma.user.findMany({
      where: {
        username: {
          in: ['perfectit-admin', 'perfectit-user']
        }
      }
    });

    if (oldUsers.length > 0) {
      console.log(`Found ${oldUsers.length} users to remove`);
      await prisma.user.deleteMany({
        where: {
          username: {
            in: ['perfectit-admin', 'perfectit-user']
          }
        }
      });
      console.log('✅ Old users removed');
    } else {
      console.log('No old users found');
    }

    // 3. Create new users with alphanumeric usernames
    console.log('\n👤 Creating new users with alphanumeric usernames...');
    const hashedPassword = await bcrypt.hash('PerfectIT123!', 12);
    
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'perfectitadmin',
        email: 'admin@perfectit.nl',
        firstName: 'Perfect',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'SUPERVISOR',
        isActive: true,
        projectCityId: perfectITAmsterdam.id,
        phone: '+31612345678',
        twoFactorEnabled: false,
        twoFactorVerifiedAt: null
      }
    });

    console.log('✅ Admin user created');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        username: 'perfectituser',
        email: 'user@perfectit.nl',
        firstName: 'Perfect',
        lastName: 'User',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        projectCityId: perfectITAmsterdam.id,
        phone: '+31687654321',
        twoFactorEnabled: false
      }
    });

    console.log('✅ Regular user created');
    console.log(`   Username: ${regularUser.username}`);
    console.log(`   Email: ${regularUser.email}`);
    console.log(`   Role: ${regularUser.role}`);

    // 4. Verify all users for this project-city
    console.log('\n📊 All Perfect IT Amsterdam Users:');
    const allUsers = await prisma.user.findMany({
      where: { projectCityId: perfectITAmsterdam.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        twoFactorEnabled: true
      },
      orderBy: { role: 'asc' }
    });

    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Active: ${user.isActive}`);
      console.log(`      Username Valid: ${/^[a-zA-Z0-9]+$/.test(user.username) ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('🎉 Perfect IT Usernames Fixed Successfully!');
    console.log('=' .repeat(60));
    console.log('\n📋 Updated Login Credentials:');
    console.log('\n🔐 Admin User:');
    console.log('   Username: perfectitadmin (✅ alphanumeric)');
    console.log('   Password: PerfectIT123!');
    console.log('   Role: SUPERVISOR');
    console.log('   Project: perfect-it');
    console.log('   City: Amsterdam');

    console.log('\n👤 Regular User:');
    console.log('   Username: perfectituser (✅ alphanumeric)');
    console.log('   Password: PerfectIT123!');
    console.log('   Role: USER');
    console.log('   Project: perfect-it');
    console.log('   City: Amsterdam');

    console.log('\n🧪 Updated Test Login API Call:');
    console.log('POST http://localhost:5000/api/auth/login');
    console.log('{');
    console.log('  "username": "perfectitadmin",');
    console.log('  "password": "PerfectIT123!",');
    console.log('  "projectId": "perfect-it",');
    console.log('  "cityName": "Amsterdam"');
    console.log('}');

    console.log('\n✅ All usernames are now alphanumeric only!');

    // 5. Username validation check
    console.log('\n🔍 Username Validation Summary:');
    const validationResults = allUsers.map(user => ({
      username: user.username,
      isValid: /^[a-zA-Z0-9]+$/.test(user.username),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(user.username)
    }));

    validationResults.forEach(result => {
      const status = result.isValid ? '✅ VALID' : '❌ INVALID';
      console.log(`   ${result.username}: ${status}`);
      if (result.hasSpecialChars) {
        console.log(`      Contains special characters`);
      }
    });

  } catch (error) {
    console.error('❌ Error fixing Perfect IT usernames:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixPerfectITUsernames().catch(console.error);