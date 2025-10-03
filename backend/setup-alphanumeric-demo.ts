import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
        slug: 'techcorp',
        description: 'Advanced technology solutions company'
      }
    });

    const safeaccess = await prisma.project.create({
      data: {
        id: 'proj2',
        name: 'SafeAccess Ltd',
        slug: 'safeaccess', 
        description: 'Security and access control systems'
      }
    });

    const perfectit = await prisma.project.create({
      data: {
        id: 'proj3',
        name: 'PerfectIT Solutions',
        slug: 'perfectit',
        description: 'Complete IT infrastructure solutions'
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

    const techcorpUser = await prisma.user.create({
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
    const perfectitAmsterdamAdmin = await prisma.user.create({
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

    const perfectitUtrechtUser = await prisma.user.create({
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
        street: 'Damrak 123',
        city: 'Amsterdam',
        postalCode: '1012 AB',
        country: 'Netherlands'
      }
    });

    const address2 = await prisma.address.create({
      data: {
        street: 'Coolsingel 456', 
        city: 'Rotterdam',
        postalCode: '3011 AB',
        country: 'Netherlands'
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
        locationId: location1.id,
        isActive: true
      }
    });

    await prisma.lock.create({
      data: {
        name: 'Server Room',
        description: 'Secure server room access',
        locationId: location2.id,
        isActive: true
      }
    });

    console.log('✅ Created 2 locks');

    // Create some RFID keys
    console.log('🔑 Creating RFID keys...');
    await prisma.rFIDKey.create({
      data: {
        keyId: 'RFID001',
        userId: techcorpAdmin.id,
        isActive: true,
        description: 'TechCorp Admin Key Card'
      }
    });

    await prisma.rFIDKey.create({
      data: {
        keyId: 'RFID002', 
        userId: safeaccessAdmin.id,
        isActive: true,
        description: 'SafeAccess Admin Key Card'
      }
    });

    console.log('✅ Created 2 RFID keys');

    // Create audit log entries
    console.log('📋 Creating initial audit logs...');
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        userId: techcorpAdmin.id,
        details: 'Demo user created during setup'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_SETUP',
        details: 'Demo data initialization completed'
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