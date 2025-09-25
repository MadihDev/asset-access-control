const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPerfectITScoping() {
  try {
    console.log('🔍 Debugging PerfectIT Administrator Scoping Issues...\n');
    
    // 1. Find the PerfectIT admin user
    const perfectItUser = await prisma.user.findFirst({
      where: { email: 'perfectit_admin@perfectitsolutions.com' },
      include: {
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    });
    
    if (!perfectItUser) {
      console.log('❌ PerfectIT admin user not found');
      return;
    }
    
    console.log('👤 PERFECTIT ADMIN USER:');
    console.log('========================');
    console.log(`   Email: ${perfectItUser.email}`);
    console.log(`   Role: ${perfectItUser.role}`);
    console.log(`   ProjectCityId: ${perfectItUser.projectCityId}`);
    console.log(`   Project: ${perfectItUser.projectCity?.project.name}`);
    console.log(`   City: ${perfectItUser.projectCity?.city.name}\n`);
    
    // 2. Check what the dashboard scoping logic would do
    const isManagerOrAbove = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'].includes(perfectItUser.role);
    console.log(`🎯 Is Manager Or Above: ${isManagerOrAbove}`);
    
    // 3. Determine effective scoping
    const userWhere = isManagerOrAbove ? {} : { projectCityId: perfectItUser.projectCityId };
    const lockWhere = isManagerOrAbove ? {} : { projectCityId: perfectItUser.projectCityId };
    const addressWhere = isManagerOrAbove ? {} : { projectCityId: perfectItUser.projectCityId };
    
    console.log('\n📊 DASHBOARD SCOPING LOGIC:');
    console.log('===========================');
    console.log(`   User WHERE clause: ${JSON.stringify(userWhere)}`);
    console.log(`   Lock WHERE clause: ${JSON.stringify(lockWhere)}`);
    console.log(`   Address WHERE clause: ${JSON.stringify(addressWhere)}\n`);
    
    // 4. Run the same queries as the dashboard
    const [totalUsers, totalLocks, onlineLocks] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.lock.count({ where: lockWhere }),
      prisma.lock.count({ where: { ...lockWhere, isOnline: true } })
    ]);
    
    console.log('📈 DASHBOARD QUERY RESULTS:');
    console.log('============================');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Locks: ${totalLocks}`);
    console.log(`   Online Locks: ${onlineLocks}\n`);
    
    // 5. Show what locks exist for PerfectIT's project-city
    const perfectItLocks = await prisma.lock.findMany({
      where: { projectCityId: perfectItUser.projectCityId },
      include: {
        address: {
          select: { street: true, number: true, zipCode: true }
        }
      }
    });
    
    console.log('🔒 LOCKS FOR PERFECTIT PROJECT-CITY:');
    console.log('====================================');
    if (perfectItLocks.length === 0) {
      console.log('   ❌ No locks found for this project-city!\n');
    } else {
      perfectItLocks.forEach((lock, index) => {
        console.log(`   ${index + 1}. ${lock.name}`);
        console.log(`      ID: ${lock.id}`);
        console.log(`      ProjectCityId: ${lock.projectCityId}`);
        console.log(`      Address: ${lock.address.street} ${lock.address.number}, ${lock.address.zipCode}`);
        console.log(`      Online: ${lock.isOnline}`);
        console.log(`      Active: ${lock.isActive}\n`);
      });
    }
    
    // 6. Show all locks at PerfectIT addresses regardless of projectCityId
    const perfectItAddresses = await prisma.address.findMany({
      where: {
        street: { contains: 'PerfectIT Solutions' }
      },
      include: {
        locks: true
      }
    });
    
    console.log('🏢 ALL LOCKS AT PERFECTIT ADDRESSES:');
    console.log('====================================');
    perfectItAddresses.forEach((address, addressIndex) => {
      console.log(`   📍 Address ${addressIndex + 1}: ${address.street} ${address.number}, ${address.zipCode}`);
      console.log(`      Address ProjectCityId: ${address.projectCityId}`);
      
      if (address.locks.length === 0) {
        console.log(`      ❌ No locks at this address\n`);
      } else {
        address.locks.forEach((lock, lockIndex) => {
          console.log(`      🔒 Lock ${lockIndex + 1}: ${lock.name}`);
          console.log(`         Lock ProjectCityId: ${lock.projectCityId}`);
          console.log(`         Online: ${lock.isOnline}`);
          console.log(`         Active: ${lock.isActive}`);
        });
        console.log('');
      }
    });
    
    // 7. Check access logs with strict scoping
    const accessLogsWithStrictScope = await prisma.accessLog.findMany({
      where: {
        AND: [
          { projectCityId: perfectItUser.projectCityId },
          { lock: { projectCityId: perfectItUser.projectCityId } }
        ]
      },
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        lock: { select: { name: true } }
      }
    });
    
    console.log('📝 ACCESS LOGS WITH STRICT SCOPING:');
    console.log('===================================');
    if (accessLogsWithStrictScope.length === 0) {
      console.log('   ❌ No access logs found with strict scoping\n');
    } else {
      accessLogsWithStrictScope.forEach((log, index) => {
        console.log(`   ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
        console.log(`      User: ${log.user?.firstName} ${log.user?.lastName}`);
        console.log(`      Lock: ${log.lock.name}`);
        console.log(`      Result: ${log.result}\n`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugPerfectITScoping();