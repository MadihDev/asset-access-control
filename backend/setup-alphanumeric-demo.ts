import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAlphanumericDemoData() {
  console.log('🚀 Creating new demo data with ALPHANUMERIC usernames...\n');

  try {
    // Create Cities
    console.log('🌍 Creating cities...');
    const amsterdam = await prisma.city.create({
      data: {
        id: 'city1',
        name: 'Amsterdam',
        country: 'Netherlands'
      }
    });

    const rotterdam = await prisma.city.create({
      data: {
        id: 'city2', 
        name: 'Rotterdam',
        country: 'Netherlands'
      }
    });

    const utrecht = await prisma.city.create({
      data: {
        id: 'city3',
        name: 'Utrecht', 
        country: 'Netherlands'
      }
    });

    console.log('✅ Created 3 cities');

    // Create Projects
    console.log('🏢 Creating projects...');
    const techcorp = await prisma.project.create({
      data: {
        id: 'proj1',
        name: 'TechCorp Solutions',
        slug: 'techcorp'
      }
    });

    const safeaccess = await prisma.project.create({
      data: {
        id: 'proj2',
        name: 'SafeAccess Ltd',
        slug: 'safeaccess'
      }
    });

    const perfectit = await prisma.project.create({
      data: {
        id: 'proj3',
        name: 'PerfectIT Solutions',
        slug: 'perfectit'
      }
    });

    console.log('✅ Created 3 projects');

    // Create ProjectCity relationships
    console.log('🔗 Creating project-city relationships...');
    const techcorpAmsterdam = await prisma.projectCity.create({
      data: {
        id: 'pc1',
        projectId: techcorp.id,
        cityId: amsterdam.id
      }
    });

    const safeaccessRotterdam = await prisma.projectCity.create({
      data: {
        id: 'pc2', 
        projectId: safeaccess.id,
        cityId: rotterdam.id
      }
    });

    const perfectitAmsterdam = await prisma.projectCity.create({
      data: {
        id: 'pc3',
        projectId: perfectit.id,
        cityId: amsterdam.id
      }
    });

    const perfectitUtrecht = await prisma.projectCity.create({
      data: {
        id: 'pc4',
        projectId: perfectit.id,
        cityId: utrecht.id
      }
    });

    console.log('✅ Created 4 project-city relationships');

    // Create Users with ALPHANUMERIC usernames
    console.log('👤 Creating users with alphanumeric usernames...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // TechCorp Users (Amsterdam)
    const techcorpAdmin = await prisma.user.create({
      data: {
        username: 'techcorpadmin',  // NO UNDERSCORE
        email: 'admin@techcorp.com',
        password: hashedPassword,
        firstName: 'Tech',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        projectCityId: techcorpAmsterdam.id
      }
    });

    await prisma.user.create({
      data: {
        username: 'techcorpuser',   // NO UNDERSCORE
        email: 'user@techcorp.com',
        password: hashedPassword,
        firstName: 'Tech',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        projectCityId: techcorpAmsterdam.id
      }
    });

    // SafeAccess Users (Rotterdam)
    const safeaccessAdmin = await prisma.user.create({
      data: {
        username: 'safeaccessadmin', // NO UNDERSCORE
        email: 'admin@safeaccess.com',
        password: hashedPassword,
        firstName: 'Safe',
        lastName: 'Admin',
        role: 'ADMIN', 
        isActive: true,
        projectCityId: safeaccessRotterdam.id
      }
    });

    // PerfectIT Users
    await prisma.user.create({
      data: {
        username: 'perfectitadmin', // NO UNDERSCORE
        email: 'admin@perfectit.com',
        password: hashedPassword,
        firstName: 'Perfect',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        projectCityId: perfectitAmsterdam.id
      }
    });

    await prisma.user.create({
      data: {
        username: 'perfectituser',  // NO UNDERSCORE
        email: 'user@perfectit.com', 
        password: hashedPassword,
        firstName: 'Perfect',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        projectCityId: perfectitUtrecht.id
      }
    });

    console.log('✅ Created 5 users with alphanumeric usernames');

    // Create Addresses
    console.log('🏠 Creating addresses...');
    const address1 = await prisma.address.create({
      data: {
        street: 'Damrak',
        number: '123',
        zipCode: '1012 AB',
        cityId: amsterdam.id,
        projectCityId: techcorpAmsterdam.id
      }
    });

    const address2 = await prisma.address.create({
      data: {
        street: 'Coolsingel',
        number: '456',
        zipCode: '3011 AB',
        cityId: rotterdam.id,
        projectCityId: safeaccessRotterdam.id
      }
    });

    console.log('✅ Created 2 addresses');

    // Create Locations
    console.log('📍 Creating locations...');
    const location1 = await prisma.location.create({
      data: {
        name: 'TechCorp Main Office',
        description: 'Main office building',
        addressId: address1.id,
        projectCityId: techcorpAmsterdam.id
      }
    });

    const location2 = await prisma.location.create({
      data: {
        name: 'SafeAccess HQ',
        description: 'Headquarters building',
        addressId: address2.id, 
        projectCityId: safeaccessRotterdam.id
      }
    });

    console.log('✅ Created 2 locations');

    // Create Locks
    console.log('🔐 Creating locks...');
    await prisma.lock.create({
      data: {
        name: 'Main Entrance',
        description: 'Main building entrance lock',
        deviceId: 'DEV001',
        secretKey: 'secret123',
        locationId: location1.id,
        projectCityId: techcorpAmsterdam.id,
        isActive: true
      }
    });

    await prisma.lock.create({
      data: {
        name: 'Server Room',
        description: 'Secure server room access',
        deviceId: 'DEV002',
        secretKey: 'secret456',
        locationId: location2.id,
        projectCityId: safeaccessRotterdam.id,
        isActive: true
      }
    });

    console.log('✅ Created 2 locks');

    // Create some RFID keys
    console.log('🔑 Creating RFID keys...');
    await prisma.rFIDKey.create({
      data: {
        cardId: 'RFID001',
        name: 'TechCorp Admin Key Card',
        userId: techcorpAdmin.id,
        projectCityId: techcorpAmsterdam.id,
        isActive: true
      }
    });

    await prisma.rFIDKey.create({
      data: {
        cardId: 'RFID002',
        name: 'SafeAccess Admin Key Card',
        userId: safeaccessAdmin.id,
        projectCityId: safeaccessRotterdam.id,
        isActive: true
      }
    });

    console.log('✅ Created 2 RFID keys');

    // Create audit log entries
    console.log('📋 Creating initial audit logs...');
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'User',
        entityId: techcorpAdmin.id,
        userId: techcorpAdmin.id
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'System',
        entityId: 'demo-setup'
      }
    });

    console.log('✅ Created initial audit logs');

    console.log('\n🎉 DEMO DATA CREATION COMPLETED!');
    console.log('\n📊 SUMMARY OF CREATED DATA:');
    console.log('├── 3 Cities: Amsterdam, Rotterdam, Utrecht');
    console.log('├── 3 Projects: TechCorp, SafeAccess, PerfectIT');
    console.log('├── 4 Project-City relationships');
    console.log('├── 5 Users (ALL with alphanumeric usernames)');
    console.log('├── 2 Addresses');  
    console.log('├── 2 Locations');
    console.log('├── 2 Locks');
    console.log('├── 2 RFID Keys');
    console.log('└── 2 Audit Log entries');

    console.log('\n🔐 NEW ALPHANUMERIC CREDENTIALS:');
    console.log('');
    console.log('🏢 TechCorp Solutions (Amsterdam):');
    console.log('   Admin: techcorpadmin / password123');
    console.log('   User:  techcorpuser / password123');
    console.log('');
    console.log('🚢 SafeAccess Ltd (Rotterdam):');
    console.log('   Admin: safeaccessadmin / password123');
    console.log('');
    console.log('🎯 PerfectIT Solutions:');
    console.log('   Amsterdam Admin: perfectitadmin / password123');
    console.log('   Utrecht User:    perfectituser / password123');
    console.log('');
    console.log('✅ ALL USERNAMES ARE NOW ALPHANUMERIC (no underscores or special characters)');

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
createAlphanumericDemoData()
  .catch(console.error);