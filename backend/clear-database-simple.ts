// clear-database-simple.ts
// Simplified script to safely clear all data from database tables

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    console.log('📋 Clearing database tables in correct order...\n');

    // Delete in reverse dependency order to avoid foreign key constraints
    
    // 1. Clear access logs first (references users, locks, rfid keys)
    const accessLogsCount = await prisma.accessLog.count();
    await prisma.accessLog.deleteMany({});
    console.log(`✅ Cleared ${accessLogsCount} access logs`);

    // 2. Clear two-factor challenges (depends on users)
    const twoFactorChallengesCount = await prisma.twoFactorChallenge.count();
    await prisma.twoFactorChallenge.deleteMany({});
    console.log(`✅ Cleared ${twoFactorChallengesCount} two-factor challenges`);

    // 3. Clear refresh tokens (depends on users)
    const refreshTokensCount = await prisma.refreshToken.count();
    await prisma.refreshToken.deleteMany({});
    console.log(`✅ Cleared ${refreshTokensCount} refresh tokens`);

    // 4. Clear user permissions (depends on users and locks)
    const userPermissionsCount = await prisma.userPermission.count();
    await prisma.userPermission.deleteMany({});
    console.log(`✅ Cleared ${userPermissionsCount} user permissions`);

    // 5. Clear RFID keys (depends on users)
    const rfidKeysCount = await prisma.rFIDKey.count();
    await prisma.rFIDKey.deleteMany({});
    console.log(`✅ Cleared ${rfidKeysCount} RFID keys`);

    // 6. Clear audit logs (depends on users)
    const auditLogsCount = await prisma.auditLog.count();
    await prisma.auditLog.deleteMany({});
    console.log(`✅ Cleared ${auditLogsCount} audit logs`);

    // 7. Clear locks (depends on locations)
    const locksCount = await prisma.lock.count();
    await prisma.lock.deleteMany({});
    console.log(`✅ Cleared ${locksCount} locks`);

    // 8. Clear locations (depends on addresses)
    const locationsCount = await prisma.location.count();
    await prisma.location.deleteMany({});
    console.log(`✅ Cleared ${locationsCount} locations`);

    // 9. Clear addresses (depends on cities)
    const addressesCount = await prisma.address.count();
    await prisma.address.deleteMany({});
    console.log(`✅ Cleared ${addressesCount} addresses`);

    // 10. Clear users (depends on project cities)
    const usersCount = await prisma.user.count();
    await prisma.user.deleteMany({});
    console.log(`✅ Cleared ${usersCount} users`);

    // 11. Clear project cities (depends on projects and cities)
    const projectCitiesCount = await prisma.projectCity.count();
    await prisma.projectCity.deleteMany({});
    console.log(`✅ Cleared ${projectCitiesCount} project cities`);

    // 12. Clear cities
    const citiesCount = await prisma.city.count();
    await prisma.city.deleteMany({});
    console.log(`✅ Cleared ${citiesCount} cities`);

    // 13. Clear projects
    const projectsCount = await prisma.project.count();
    await prisma.project.deleteMany({});
    console.log(`✅ Cleared ${projectsCount} projects`);

    // 14. Clear notification templates
    const notificationTemplatesCount = await prisma.notificationTemplate.count();
    await prisma.notificationTemplate.deleteMany({});
    console.log(`✅ Cleared ${notificationTemplatesCount} notification templates`);

    // 15. Clear system config
    const systemConfigCount = await prisma.systemConfig.count();
    await prisma.systemConfig.deleteMany({});
    console.log(`✅ Cleared ${systemConfigCount} system config entries`);

    console.log('\n🎉 Database cleanup completed successfully!');

    // Verify all tables are empty
    console.log('\n📊 Verifying main tables are empty...');
    await verifyTablesEmpty();

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyTablesEmpty() {
  const checks = [
    { name: 'ProjectCity', count: await prisma.projectCity.count() },
    { name: 'Project', count: await prisma.project.count() },
    { name: 'City', count: await prisma.city.count() },
    { name: 'User', count: await prisma.user.count() },
    { name: 'Address', count: await prisma.address.count() },
    { name: 'Location', count: await prisma.location.count() },
    { name: 'Lock', count: await prisma.lock.count() },
    { name: 'RFIDKey', count: await prisma.rFIDKey.count() },
    { name: 'UserPermission', count: await prisma.userPermission.count() },
    { name: 'AccessLog', count: await prisma.accessLog.count() },
    { name: 'AuditLog', count: await prisma.auditLog.count() },
    { name: 'RefreshToken', count: await prisma.refreshToken.count() },
    { name: 'TwoFactorChallenge', count: await prisma.twoFactorChallenge.count() },
    { name: 'NotificationTemplate', count: await prisma.notificationTemplate.count() },
    { name: 'SystemConfig', count: await prisma.systemConfig.count() }
  ];

  let allEmpty = true;

  for (const check of checks) {
    const status = check.count === 0 ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.count} records`);
    
    if (check.count > 0) {
      allEmpty = false;
    }
  }

  if (allEmpty) {
    console.log('\n🎯 All tables are empty - database cleanup successful!');
  } else {
    console.log('\n⚠️  Some tables still contain data - cleanup may be incomplete');
  }
}

async function confirmClearDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('⚠️  This action cannot be undone!');
  console.log('⚠️  Make sure you have a backup if needed.\n');
  
  // For automation, we'll proceed directly
  // In interactive mode, you might want to prompt for confirmation
  
  return true;
}

// Main execution
async function main() {
  try {
    console.log('🗑️  DATABASE CLEANUP UTILITY');
    console.log('============================\n');
    
    const confirmed = await confirmClearDatabase();
    
    if (confirmed) {
      await clearDatabase();
    } else {
      console.log('❌ Database cleanup cancelled');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { clearDatabase, verifyTablesEmpty };

// Run if called directly
if (require.main === module) {
  main();
}