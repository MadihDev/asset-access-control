import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createComprehensiveDemoData() {
  console.log('🎬 Creating comprehensive demo data for all projects...\n');

  try {
    // Get existing projects and cities
    const projects = await prisma.project.findMany();
    const cities = await prisma.city.findMany();
    const projectCities = await prisma.projectCity.findMany({
      include: { project: true, city: true }
    });

    console.log(`📊 Found ${projects.length} projects, ${cities.length} cities, ${projectCities.length} project-city relationships\n`);

    // Demo data configuration for each project
    const demoConfig = {
      techcorp: {
        name: 'TechCorp Solutions',
        users: [
          { username: 'techcorpadmin', firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@techcorp.com', role: 'ADMIN', phone: '+31612345678' },
          { username: 'techcorpuser', firstName: 'Bob', lastName: 'Smith', email: 'bob.smith@techcorp.com', role: 'USER', phone: '+31612345679' },
          { username: 'techcorpsupervisor', firstName: 'Carol', lastName: 'Davis', email: 'carol.davis@techcorp.com', role: 'SUPERVISOR', phone: '+31612345680' },
          { username: 'techcorpguard', firstName: 'David', lastName: 'Wilson', email: 'david.wilson@techcorp.com', role: 'USER', phone: '+31612345681' }
        ],
        addresses: [
          { street: 'Technologielaan', number: '1', zipCode: '1000 AA', description: 'TechCorp HQ Amsterdam' },
          { street: 'Innovatieweg', number: '25', zipCode: '3000 BB', description: 'TechCorp R&D Center Rotterdam' },
          { street: 'Digitaal Park', number: '12', zipCode: '3500 CC', description: 'TechCorp Utrecht Office' }
        ]
      },
      safeaccess: {
        name: 'SafeAccess Ltd',
        users: [
          { username: 'safeaccessadmin', firstName: 'Emma', lastName: 'Brown', email: 'emma.brown@safeaccess.com', role: 'ADMIN', phone: '+31612345682' },
          { username: 'safeaccesssupervisor', firstName: 'Frank', lastName: 'Miller', email: 'frank.miller@safeaccess.com', role: 'SUPERVISOR', phone: '+31612345683' },
          { username: 'safeaccessguard1', firstName: 'Grace', lastName: 'Taylor', email: 'grace.taylor@safeaccess.com', role: 'USER', phone: '+31612345684' },
          { username: 'safeaccessguard2', firstName: 'Henry', lastName: 'Anderson', email: 'henry.anderson@safeaccess.com', role: 'USER', phone: '+31612345685' }
        ],
        addresses: [
          { street: 'Havenstraat', number: '45', zipCode: '3000 DD', description: 'SafeAccess Port Security Rotterdam' },
          { street: 'Scheepvaartweg', number: '78', zipCode: '1700 EE', description: 'SafeAccess Logistics Hub Den Helder' },
          { street: 'Maritiem Plein', number: '23', zipCode: '4380 FF', description: 'SafeAccess Vlissingen Terminal' }
        ]
      },
      securebuildings: {
        name: 'SecureBuildings Inc',
        users: [
          { username: 'secureadmin', firstName: 'Isabella', lastName: 'Garcia', email: 'isabella.garcia@securebuildings.com', role: 'ADMIN', phone: '+31612345686' },
          { username: 'securesupervisor1', firstName: 'Jack', lastName: 'Martinez', email: 'jack.martinez@securebuildings.com', role: 'SUPERVISOR', phone: '+31612345687' },
          { username: 'securesupervisor2', firstName: 'Kate', lastName: 'Rodriguez', email: 'kate.rodriguez@securebuildings.com', role: 'SUPERVISOR', phone: '+31612345688' },
          { username: 'secureguard1', firstName: 'Liam', lastName: 'Lopez', email: 'liam.lopez@securebuildings.com', role: 'USER', phone: '+31612345689' },
          { username: 'secureguard2', firstName: 'Mia', lastName: 'Gonzalez', email: 'mia.gonzalez@securebuildings.com', role: 'USER', phone: '+31612345690' },
          { username: 'secureguard3', firstName: 'Noah', lastName: 'Perez', email: 'noah.perez@securebuildings.com', role: 'USER', phone: '+31612345691' }
        ],
        addresses: [
          { street: 'Bouwplein', number: '88', zipCode: '1000 GG', description: 'SecureBuildings Amsterdam HQ' },
          { street: 'Constructieweg', number: '156', zipCode: '5600 HH', description: 'SecureBuildings Eindhoven Site' },
          { street: 'Architectenlaan', number: '234', zipCode: '6200 II', description: 'SecureBuildings Maastricht Office' },
          { street: 'Ingenieurstraat', number: '67', zipCode: '9700 JJ', description: 'SecureBuildings Groningen Branch' }
        ]
      }
    };

    let totalUsersCreated = 0;
    let totalAddressesCreated = 0;
    let totalLocationsCreated = 0;
    let totalLocksCreated = 0;
    let totalRfidKeysCreated = 0;
    let totalAccessLogsCreated = 0;

    // Create demo data for each project
    for (const project of projects) {
      const config = demoConfig[project.slug as keyof typeof demoConfig];
      if (!config) {
        console.log(`⚠️ No demo config for project: ${project.slug}`);
        continue;
      }

      console.log(`\n🏢 Creating demo data for ${config.name} (${project.slug})`);

      // Get project cities for this project
      const thisProjectCities = projectCities.filter(pc => pc.project.slug === project.slug);
      console.log(`   Available cities: ${thisProjectCities.map(pc => pc.city.name).join(', ')}`);

      // Create users for each city in this project
      for (const projectCity of thisProjectCities.slice(0, 3)) { // Limit to first 3 cities to avoid too much data
        console.log(`\n   📍 Creating data for ${projectCity.city.name}:`);

        // Create users
        for (const userData of config.users) {
          const hashedPassword = await bcrypt.hash('demo123', 10);
          
          try {
            const user = await prisma.user.create({
              data: {
                username: `${userData.username}${projectCity.city.name.toLowerCase()}`,
                email: userData.email.replace('@', `+${projectCity.city.name.toLowerCase()}@`),
                firstName: userData.firstName,
                lastName: userData.lastName,
                password: hashedPassword,
                role: userData.role as 'ADMIN' | 'SUPERVISOR' | 'USER',
                phone: userData.phone,
                twoFactorEnabled: Math.random() > 0.7, // 30% have 2FA enabled
                projectCityId: projectCity.id,
                isActive: true
              }
            });
            
            console.log(`      👤 Created user: ${user.username} [${user.role}]`);
            totalUsersCreated++;
          } catch {
            console.log(`      ⚠️ User already exists: ${userData.username}${projectCity.city.name.toLowerCase()}`);
          }
        }

        // Create addresses for this project-city
        for (let i = 0; i < config.addresses.length && i < 2; i++) { // Max 2 addresses per city
          const addressData = config.addresses[i];
          
          try {
            const address = await prisma.address.create({
              data: {
                street: addressData.street,
                number: addressData.number,
                zipCode: addressData.zipCode,
                cityId: projectCity.cityId,
                projectCityId: projectCity.id
              }
            });
            
            console.log(`      🏠 Created address: ${address.street}`);
            totalAddressesCreated++;

            // Create locations for each address
            const locationTypes = ['Main Entrance', 'Side Entrance', 'Parking Gate', 'Emergency Exit', 'Loading Dock'];
            for (let j = 0; j < 3; j++) { // 3 locations per address
              const location = await prisma.location.create({
                data: {
                  name: `${locationTypes[j]} - ${addressData.description}`,
                  description: `${locationTypes[j]} at ${addressData.description}, ${projectCity.city.name}`,
                  addressId: address.id,
                  projectCityId: projectCity.id
                }
              });
              
              console.log(`        📍 Created location: ${location.name}`);
              totalLocationsCreated++;

              // Create locks for each location
              const lockTypes = ['DOOR', 'GATE', 'CABINET', 'ROOM'];
              for (let k = 0; k < 2; k++) { // 2 locks per location
                const lock = await prisma.lock.create({
                  data: {
                    name: `${lockTypes[k % lockTypes.length]} Lock ${k + 1}`,
                    lockType: lockTypes[k % lockTypes.length] as 'DOOR' | 'GATE' | 'CABINET' | 'ROOM',
                    deviceId: `DEV_${Date.now()}_${k}`,
                    secretKey: `SECRET_${Date.now()}_${k}`,
                    isActive: Math.random() > 0.1, // 90% active
                    locationId: location.id,
                    projectCityId: projectCity.id
                  }
                });
                
                console.log(`          🔒 Created lock: ${lock.name}`);
                totalLocksCreated++;
              }
            }
          } catch {
            console.log(`      ⚠️ Address creation failed: ${addressData.description}`);
          }
        }
      }
    }

    // Create RFID keys for users
    console.log(`\n🔑 Creating RFID keys for users...`);
    const users = await prisma.user.findMany({
      include: { projectCity: { include: { project: true, city: true } } }
    });

    for (const user of users) {
      if (!user.projectCity) continue;

      // Create 1-2 RFID keys per user
      const keyCount = Math.random() > 0.6 ? 2 : 1;
      for (let i = 0; i < keyCount; i++) {
        const keyId = `${user.projectCity.project.slug.toUpperCase()}_${user.username}_${i + 1}_${Date.now() + i}`;
        const expiryHours = Math.random() > 0.3 ? 168 : 6; // 70% long-term (1 week), 30% short-term (6 hours)
        
        try {
          await prisma.rFIDKey.create({
            data: {
              cardId: keyId,
              name: `${user.firstName}'s RFID Card ${i + 1}`,
              userId: user.id,
              isActive: Math.random() > 0.15, // 85% active
              expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
              projectCityId: user.projectCityId
            }
          });
          
          console.log(`  🔑 Created RFID key: ${keyId} (expires in ${expiryHours}h)`);
          totalRfidKeysCreated++;
        } catch {
          console.log(`  ⚠️ RFID key creation failed: ${keyId}`);
        }
      }
    }

    // Create user permissions
    console.log(`\n🔐 Creating user permissions...`);
    const locks = await prisma.lock.findMany();
    
    for (const user of users) {
      if (!user.projectCity) continue;
      
      // Get locks in the same project-city
      const userLocks = locks.filter(lock => lock.projectCityId === user.projectCityId);
      
      // Give permissions to random subset of locks (20-80% of locks)
      const permissionCount = Math.floor(userLocks.length * (0.2 + Math.random() * 0.6));
      const selectedLocks = userLocks.sort(() => 0.5 - Math.random()).slice(0, permissionCount);
      
      for (const lock of selectedLocks) {
        const canAccess = user.role === 'ADMIN' ? true : 
                         user.role === 'SUPERVISOR' ? (Math.random() > 0.2) : // 80% access for supervisors
                         (Math.random() > 0.4); // 60% access for users
        
        const validTo = Math.random() > 0.7 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined; // 30% have expiry
        
        try {
          await prisma.userPermission.create({
            data: {
              userId: user.id,
              lockId: lock.id,
              canAccess: canAccess,
              validTo: validTo,
              projectCityId: user.projectCityId
            }
          });
          
          console.log(`  🔐 Granted ${canAccess ? 'ACCESS' : 'NO ACCESS'} permission: ${user.username} → ${lock.name}`);
        } catch {
          // Permission might already exist, skip
        }
      }
    }

    // Create access logs (simulate recent activity)
    console.log(`\n📋 Creating access logs (simulating recent activity)...`);
    const rfidKeys = await prisma.rFIDKey.findMany({
      include: { user: true }
    });

    const accessResults = ['GRANTED', 'DENIED_INVALID_CARD', 'DENIED_EXPIRED_CARD', 'DENIED_NO_PERMISSION', 'DENIED_INACTIVE_USER'] as const;
    const now = new Date();
    
    // Create logs for the past 30 days
    for (let day = 0; day < 30; day++) {
      const logsPerDay = Math.floor(Math.random() * 50) + 20; // 20-70 logs per day
      
      for (let i = 0; i < logsPerDay; i++) {
        const randomRfidKey = rfidKeys[Math.floor(Math.random() * rfidKeys.length)];
        const randomLock = locks[Math.floor(Math.random() * locks.length)];
        
        // Ensure same project-city
        if (randomRfidKey.projectCityId !== randomLock.projectCityId) continue;
        
        const timestamp = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000) + (Math.random() * 24 * 60 * 60 * 1000));
        const result = accessResults[Math.floor(Math.random() * accessResults.length)];
        
        // Weight results (more granted than denied)
        const weightedResult = Math.random() > 0.25 ? 'GRANTED' : result;
        
        try {
          await prisma.accessLog.create({
            data: {
              lockId: randomLock.id,
              rfidKeyId: randomRfidKey.id,
              userId: randomRfidKey.userId,
              result: weightedResult,
              timestamp: timestamp,
              projectCityId: randomRfidKey.projectCityId
            }
          });
          
          totalAccessLogsCreated++;
        } catch {
          // Skip duplicate or invalid logs
        }
      }
    }

    // Create audit logs
    console.log(`\n📊 Creating audit logs...`);
    const auditActions = [
      'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE',
      'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'ACCESS_ATTEMPT'
    ];

    for (const user of users) {
      if (!user.projectCity) continue;
      
      // Create 5-15 audit entries per user
      const auditCount = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 0; i < auditCount; i++) {
        const action = auditActions[Math.floor(Math.random() * auditActions.length)] as 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_GRANT' | 'PERMISSION_REVOKE' | 'ACCESS_ATTEMPT';
        const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        try {
          await prisma.auditLog.create({
            data: {
              action,
              entityType: 'USER',
              entityId: user.id,
              userId: user.id,
              timestamp,
              ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
              userAgent: 'Demo Data Generator'
            }
          });
        } catch {
          // Skip if creation fails
        }
      }
    }

    console.log('\n🎉 COMPREHENSIVE DEMO DATA CREATION COMPLETE!\n');
    
    // Final summary
    console.log('📊 SUMMARY:');
    console.log(`👥 Users created: ${totalUsersCreated}`);
    console.log(`🏠 Addresses created: ${totalAddressesCreated}`);
    console.log(`📍 Locations created: ${totalLocationsCreated}`);
    console.log(`🔒 Locks created: ${totalLocksCreated}`);
    console.log(`🔑 RFID keys created: ${totalRfidKeysCreated}`);
    console.log(`📋 Access logs created: ${totalAccessLogsCreated}`);
    console.log(`📊 Audit logs created: ~${users.length * 10} entries`);
    console.log(`🔐 User permissions created: Multiple per user`);

    // Show sample login credentials
    console.log('\n🔑 SAMPLE LOGIN CREDENTIALS:');
    const sampleUsers = await prisma.user.findMany({
      include: { projectCity: { include: { project: true, city: true } } },
      take: 6
    });

    sampleUsers.forEach(user => {
      if (user.projectCity) {
        console.log(`${user.username} | password: demo123 | project: ${user.projectCity.project.slug} | city: ${user.projectCity.city.name} | role: ${user.role}`);
      }
    });

    console.log('\n✅ All database tables now have comprehensive demo data!');
    console.log('🚀 Your RFID Access Control System is ready for testing and demonstration.');

  } catch (error) {
    console.error('❌ Error creating comprehensive demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createComprehensiveDemoData();