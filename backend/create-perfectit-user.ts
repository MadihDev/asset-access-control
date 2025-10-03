// create-perfectit-user.ts
// Script to create a test user for Perfect IT project in Amsterdam

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createPerfectITUser() {
  console.log('👤 Creating Perfect IT Test User...\n');

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
      console.log('❌ Perfect IT Amsterdam not found. Run create-perfectit-project.ts first.');
      return;
    }

    console.log('✅ Found Perfect IT Amsterdam');
    console.log(`   Project: ${perfectITAmsterdam.project.name}`);
    console.log(`   City: ${perfectITAmsterdam.city.name}`);
    console.log(`   ProjectCity ID: ${perfectITAmsterdam.id}`);

    // 2. Create test user
    console.log('\n👤 Creating test user...');
    const hashedPassword = await bcrypt.hash('PerfectIT123!', 12);
    
    const testUser = await prisma.user.upsert({
      where: { username: 'perfectit-admin' },
      create: {
        username: 'perfectit-admin',
        email: 'admin@perfectit.nl',
        firstName: 'Perfect',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'SUPERVISOR',
        isActive: true,
        projectCityId: perfectITAmsterdam.id,
        // Optional: Enable 2FA for this user (update phone number if needed)
        phone: '+31612345678', // Dutch phone number format
        twoFactorEnabled: false, // Set to true if you want 2FA
        twoFactorVerifiedAt: null
      },
      update: {
        password: hashedPassword,
        projectCityId: perfectITAmsterdam.id,
        isActive: true,
        role: 'SUPERVISOR'
      }
    });

    console.log('✅ Perfect IT user created/updated');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Phone: ${testUser.phone}`);

    // 3. Create a regular user too
    console.log('\n👤 Creating regular Perfect IT user...');
    const regularUser = await prisma.user.upsert({
      where: { username: 'perfectit-user' },
      create: {
        username: 'perfectit-user',
        email: 'user@perfectit.nl',
        firstName: 'Perfect',
        lastName: 'User',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        projectCityId: perfectITAmsterdam.id,
        phone: '+31687654321', // Different Dutch phone number
        twoFactorEnabled: false
      },
      update: {
        password: hashedPassword,
        projectCityId: perfectITAmsterdam.id,
        isActive: true,
        role: 'USER'
      }
    });

    console.log('✅ Regular Perfect IT user created/updated');
    console.log(`   ID: ${regularUser.id}`);
    console.log(`   Username: ${regularUser.username}`);
    console.log(`   Email: ${regularUser.email}`);
    console.log(`   Role: ${regularUser.role}`);

    // 4. Show all users for this project-city
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
      console.log(`      2FA: ${user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
      console.log('');
    });

    console.log('🎉 Perfect IT Users Created Successfully!');
    console.log('=' .repeat(50));
    console.log('\n📋 Login Credentials:');
    console.log('\n🔐 Admin User:');
    console.log('   Username: perfectit-admin');
    console.log('   Password: PerfectIT123!');
    console.log('   Role: SUPERVISOR');
    console.log('   Project: perfect-it');
    console.log('   City: Amsterdam');

    console.log('\n👤 Regular User:');
    console.log('   Username: perfectit-user');
    console.log('   Password: PerfectIT123!');
    console.log('   Role: USER');
    console.log('   Project: perfect-it');
    console.log('   City: Amsterdam');

    console.log('\n🧪 Test Login API Call:');
    console.log('POST http://localhost:5000/api/auth/login');
    console.log('{');
    console.log('  "username": "perfectit-admin",');
    console.log('  "password": "PerfectIT123!",');
    console.log('  "projectId": "perfect-it",');
    console.log('  "cityName": "Amsterdam"');
    console.log('}');

    console.log('\n✅ Perfect IT project is now ready for use!');

  } catch (error) {
    console.error('❌ Error creating Perfect IT user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createPerfectITUser().catch(console.error);