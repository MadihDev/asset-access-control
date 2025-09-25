const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugActiveKeysCount() {
  try {
    console.log('🔑 Debugging Active Keys Count Discrepancy...\n');
    
    // 1. Find the PerfectIT admin user first
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
    console.log(`   ProjectCityId: ${perfectItUser.projectCityId}\n`);
    
    // 2. Dashboard logic for active keys (from dashboard controller)
    const isManagerOrAbove = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'].includes(perfectItUser.role);
    console.log(`🎯 Is Manager Or Above: ${isManagerOrAbove}\n`);
    
    // Dashboard key counting logic
    const rfidKeyWhere = { isActive: true };
    const now = new Date();
    rfidKeyWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    
    // For non-managers, scope to their project-city
    if (!isManagerOrAbove && perfectItUser?.projectCityId) {
      rfidKeyWhere.user = { projectCityId: perfectItUser.projectCityId };
    }
    
    console.log('📊 DASHBOARD ACTIVE KEYS LOGIC:');
    console.log('===============================');
    console.log(`   WHERE clause: ${JSON.stringify(rfidKeyWhere, null, 2)}\n`);
    
    // Run dashboard query
    const dashboardActiveKeys = await prisma.rFIDKey.count({ where: rfidKeyWhere });
    console.log(`📈 Dashboard Query Result: ${dashboardActiveKeys} active keys\n`);
    
    // 3. Database verification logic (scoped to PerfectIT project-city)
    const databaseActiveKeys = await prisma.rFIDKey.count({
      where: {
        user: {
          projectCityId: perfectItUser.projectCityId
        }
      }
    });
    console.log(`📊 Database Verification Result: ${databaseActiveKeys} active keys\n`);
    
    // 4. Show all RFID keys in detail
    console.log('🔑 ALL RFID KEYS IN SYSTEM:');
    console.log('===========================');
    const allKeys = await prisma.rFIDKey.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            projectCityId: true
          }
        }
      }
    });
    
    allKeys.forEach((key, index) => {
      console.log(`   🔑 Key ${index + 1}: ${key.cardId}`);
      console.log(`      Name: ${key.name || 'N/A'}`);
      console.log(`      User: ${key.user.firstName} ${key.user.lastName} (${key.user.email})`);
      console.log(`      User ProjectCityId: ${key.user.projectCityId}`);
      console.log(`      Is Active: ${key.isActive}`);
      console.log(`      Expires At: ${key.expiresAt || 'Never'}`);
      console.log(`      Is Expired: ${key.expiresAt && key.expiresAt < now ? 'Yes' : 'No'}`);
      console.log(`      Matches Dashboard Criteria: ${key.isActive && (!key.expiresAt || key.expiresAt > now) ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // 5. Count keys by different criteria
    console.log('🔢 KEY COUNTS BY DIFFERENT CRITERIA:');
    console.log('====================================');
    
    const totalKeys = await prisma.rFIDKey.count();
    console.log(`   Total Keys: ${totalKeys}`);
    
    const activeKeys = await prisma.rFIDKey.count({ where: { isActive: true } });
    console.log(`   Active Keys (isActive=true): ${activeKeys}`);
    
    const nonExpiredKeys = await prisma.rFIDKey.count({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    });
    console.log(`   Non-Expired Keys: ${nonExpiredKeys}`);
    
    const activeAndNonExpiredKeys = await prisma.rFIDKey.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    });
    console.log(`   Active AND Non-Expired Keys: ${activeAndNonExpiredKeys}`);
    
    // Keys for PerfectIT project-city users
    const perfectItUserKeys = await prisma.rFIDKey.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        user: { projectCityId: perfectItUser.projectCityId }
      }
    });
    console.log(`   Keys for PerfectIT ProjectCity Users: ${perfectItUserKeys}\n`);
    
    // 6. Show the scoping difference
    console.log('🎯 SCOPING EXPLANATION:');
    console.log('=======================');
    console.log('Dashboard (Admin role): Shows ALL active keys in the system (no scoping)');
    console.log('Database verification: Shows only keys for PerfectIT project-city users');
    console.log('');
    console.log('This explains the discrepancy:');
    console.log(`- Dashboard: ${dashboardActiveKeys} (all active keys across all tenants)`);
    console.log(`- Database: ${databaseActiveKeys} (only keys for PerfectIT project-city users)`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugActiveKeysCount();