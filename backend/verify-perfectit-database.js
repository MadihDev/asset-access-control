const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPerfectITDatabase() {
  console.log('🔍 Verifying PerfectIT Database Content...\n');
  
  try {
    // 1. Find PerfectIT project
    const perfectItProject = await prisma.project.findFirst({
      where: { name: 'PerfectIT Solutions' }
    });
    
    if (!perfectItProject) {
      throw new Error('PerfectIT Solutions project not found');
    }
    
    // 2. Find Amsterdam city
    const amsterdamCity = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    });
    
    if (!amsterdamCity) {
      throw new Error('Amsterdam city not found');
    }
    
    console.log(`🏢 Project: ${perfectItProject.name} (ID: ${perfectItProject.id})`);
    console.log(`🌍 City: ${amsterdamCity.name} (ID: ${amsterdamCity.id})`);
    
    // 2. Find the ProjectCity combination
    const projectCity = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectItProject.id,
        cityId: amsterdamCity.id
      }
    });
    
    if (!projectCity) {
      throw new Error('ProjectCity combination not found');
    }
    
    console.log(`🔗 ProjectCity ID: ${projectCity.id}\n`);
    
    // 3. Count users in this project-city
    const userCount = await prisma.user.count({
      where: { projectCityId: projectCity.id }
    });
    
    console.log(`👥 Users in PerfectIT Amsterdam: ${userCount}`);
    
    // 4. Find all addresses in this city  
    const addresses = await prisma.address.findMany({
      where: { cityId: amsterdamCity.id },
      include: {
        locks: {
          include: {
            accessLogs: true
          }
        }
      }
    });
    
    console.log(`📍 Total addresses in Amsterdam: ${addresses.length}`);
    
    // Debug: Let's see the actual address data
    console.log('🔍 DEBUG: Address data found in Amsterdam:');
    addresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. Address ID: ${addr.id}`);
      console.log(`      Name: "${addr.name}" (null/undefined)`);
      console.log(`      Street: "${addr.street}"`);
      console.log(`      Number: "${addr.number}"`);
      console.log(`      ZipCode: "${addr.zipCode}"`);
      console.log(`      Full Address: "${addr.street} ${addr.number}, ${addr.zipCode}"`);
      console.log('');
    });
    
    // Filter PerfectIT addresses - let's check by the formatted name
    const perfectItAddresses = addresses.filter(addr => {
      const fullName = `${addr.street} ${addr.number}, ${addr.zipCode}`;
      return fullName && fullName.includes('PerfectIT Solutions');
    });
    
    console.log(`📍 PerfectIT addresses in Amsterdam: ${perfectItAddresses.length}\n`);
    
    // Get keys with the same logic as the dashboard
    // PerfectIT admin is ADMIN role, so dashboard shows ALL keys (no scoping)
    const now = new Date();
    const isManagerOrAbove = true; // PerfectIT admin is ADMIN role
    
    let keyWhere = { isActive: true };
    keyWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    
    // For non-managers, scope to their project-city (but PerfectIT admin is manager, so no scoping)
    if (!isManagerOrAbove && projectCity.id) {
      keyWhere.user = { projectCityId: projectCity.id };
    }
    
    const keyCount = await prisma.rFIDKey.count({ where: keyWhere });
    
    // 5. Calculate dashboard stats for PerfectIT
    let totalLocks = 0;
    let onlineLocks = 0;
    let totalAccessAttempts = 0;
    
    console.log('🏢 PERFECTIT ADDRESSES IN DATABASE:');
    console.log('===================================');
    
    perfectItAddresses.forEach((address, index) => {
      const locks = address.locks || [];
      const activeLocks = locks.filter(lock => lock.isOnline).length;
      
      // Count access attempts for this address
      const accessAttempts = locks.reduce((sum, lock) => {
        return sum + (lock.accessLogs?.length || 0);
      }, 0);
      
      totalLocks += locks.length;
      onlineLocks += activeLocks;
      totalAccessAttempts += accessAttempts;
      
      console.log(`   📍 Address ${index + 1}:`);
      console.log(`      Name: ${address.name}`);
      console.log(`      ID: ${address.id}`);
      console.log(`      Locks: ${locks.length} (${activeLocks} online)`);
      console.log(`      Access Attempts: ${accessAttempts}\n`);
    });
    
    // 6. Get recent access logs for PerfectIT
    const recentAccessLogs = await prisma.accessLog.findMany({
      where: {
        lock: {
          address: {
            cityId: amsterdamCity.id,
            street: {
              contains: 'PerfectIT Solutions'
            }
          }
        }
      },
      include: {
        user: true,
        lock: {
          include: {
            address: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    console.log('📊 DATABASE SUMMARY FOR PERFECTIT:');
    console.log('===================================');
    console.log(`   - Total Users: ${userCount}`);
    console.log(`   - Total Locks: ${totalLocks}`);
    console.log(`   - Online Locks: ${onlineLocks}`);
    console.log(`   - Total Keys: ${keyCount}`);
    console.log(`   - Total Access Attempts: ${totalAccessAttempts}`);
    console.log(`   - Recent Access Logs: ${recentAccessLogs.length}\n`);
    
    if (recentAccessLogs.length > 0) {
      console.log('📝 RECENT ACCESS LOGS FROM DATABASE:');
      console.log('====================================');
      recentAccessLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
        console.log(`      User: ${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'}`);
        console.log(`      Lock: ${log.lock.name}`);
        console.log(`      Address: ${log.lock.address.name}`);
        console.log(`      Result: ${log.result}`);
        console.log(`      Type: ${log.accessType}\n`);
      });
    } else {
      console.log('📝 No access logs found in database for PerfectIT\n');
    }
    
    console.log('🎯 COMPARISON NOTES:');
    console.log('====================');
    console.log('- Dashboard should match these database numbers exactly');
    console.log('- All data should be filtered to PerfectIT Solutions + Amsterdam');
    console.log('- Tenant isolation should prevent seeing other companies\' data');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPerfectITDatabase();