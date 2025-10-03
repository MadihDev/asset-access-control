// clear-database.ts
// Script to safely clear all data from database tables

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Start a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      console.log('📋 Clearing database tables in correct order...\n');

      // Delete in reverse dependency order to avoid foreign key constraints
      
      // 1. Clear access logs first (references users, locks, rfid keys)
      const accessLogsCount = await tx.accessLog.count();
      await tx.accessLog.deleteMany({});
      console.log(`✅ Cleared ${accessLogsCount} access logs`);

      // 2. Clear device commands (depends on devices) - Skip if not exists
      try {
        const deviceCommandsCount = await (tx as any).deviceCommand?.count() || 0;
        if (deviceCommandsCount > 0) {
          await (tx as any).deviceCommand.deleteMany({});
          console.log(`✅ Cleared ${deviceCommandsCount} device commands`);
        } else {
          console.log(`✅ No device commands to clear`);
        }
      } catch (error) {
        console.log(`⚠️  Skipped device commands (model may not exist)`);
      }

      // 3. Clear device health metrics (depends on devices) - Skip if not exists
      try {
        const deviceHealthCount = await (tx as any).deviceHealthMetric?.count() || 0;
        if (deviceHealthCount > 0) {
          await (tx as any).deviceHealthMetric.deleteMany({});
          console.log(`✅ Cleared ${deviceHealthCount} device health metrics`);
        } else {
          console.log(`✅ No device health metrics to clear`);
        }
      } catch (error) {
        console.log(`⚠️  Skipped device health metrics (model may not exist)`);
      }

      // 4. Clear two-factor challenges (depends on users)
      const twoFactorChallengesCount = await tx.twoFactorChallenge.count();
      await tx.twoFactorChallenge.deleteMany({});
      console.log(`✅ Cleared ${twoFactorChallengesCount} two-factor challenges`);

      // 5. Clear refresh tokens (depends on users)
      const refreshTokensCount = await tx.refreshToken.count();
      await tx.refreshToken.deleteMany({});
      console.log(`✅ Cleared ${refreshTokensCount} refresh tokens`);

      // 6. Clear user permissions (depends on users and locks)
      const userPermissionsCount = await tx.userPermission.count();
      await tx.userPermission.deleteMany({});
      console.log(`✅ Cleared ${userPermissionsCount} user permissions`);

      // 7. Clear RFID keys (depends on users)
      const rfidKeysCount = await tx.rFIDKey.count();
      await tx.rFIDKey.deleteMany({});
      console.log(`✅ Cleared ${rfidKeysCount} RFID keys`);

      // 8. Clear audit logs (depends on users)
      const auditLogsCount = await tx.auditLog.count();
      await tx.auditLog.deleteMany({});
      console.log(`✅ Cleared ${auditLogsCount} audit logs`);

      // 9. Clear locks (depends on locations, devices)
      const locksCount = await tx.lock.count();
      await tx.lock.deleteMany({});
      console.log(`✅ Cleared ${locksCount} locks`);

      // 10. Clear devices (depends on locations)
      // Note: Device model might not be generated yet, skip for now
      try {
        const devicesCount = await (tx as any).device?.count() || 0;
        if (devicesCount > 0) {
          await (tx as any).device.deleteMany({});
          console.log(`✅ Cleared ${devicesCount} devices`);
        } else {
          console.log(`✅ No devices to clear`);
        }
      } catch (error) {
        console.log(`⚠️  Skipped devices (model may not exist): ${error}`);
      }

      // 11. Clear locations (depends on addresses)
      const locationsCount = await tx.location.count();
      await tx.location.deleteMany({});
      console.log(`✅ Cleared ${locationsCount} locations`);

      // 12. Clear addresses (depends on cities)
      const addressesCount = await tx.address.count();
      await tx.address.deleteMany({});
      console.log(`✅ Cleared ${addressesCount} addresses`);

      // 13. Clear users (depends on project cities)
      const usersCount = await tx.user.count();
      await tx.user.deleteMany({});
      console.log(`✅ Cleared ${usersCount} users`);

      // 14. Clear project cities (depends on projects and cities)
      const projectCitiesCount = await tx.projectCity.count();
      await tx.projectCity.deleteMany({});
      console.log(`✅ Cleared ${projectCitiesCount} project cities`);

      // 15. Clear cities
      const citiesCount = await tx.city.count();
      await tx.city.deleteMany({});
      console.log(`✅ Cleared ${citiesCount} cities`);

      // 16. Clear projects
      const projectsCount = await tx.project.count();
      await tx.project.deleteMany({});
      console.log(`✅ Cleared ${projectsCount} projects`);

      // 17. Clear notification templates
      const notificationTemplatesCount = await tx.notificationTemplate.count();
      await tx.notificationTemplate.deleteMany({});
      console.log(`✅ Cleared ${notificationTemplatesCount} notification templates`);

      // 18. Clear system config
      const systemConfigCount = await tx.systemConfig.count();
      await tx.systemConfig.deleteMany({});
      console.log(`✅ Cleared ${systemConfigCount} system config entries`);

      console.log('\n🎉 Database cleanup completed successfully!');
    });

    // Verify all tables are empty
    console.log('\n📊 Verifying tables are empty...');
    await verifyTablesEmpty();

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyTablesEmpty() {
  const tables = [
    { name: 'ProjectCity', model: prisma.projectCity },
    { name: 'Project', model: prisma.project },
    { name: 'City', model: prisma.city },
    { name: 'User', model: prisma.user },
    { name: 'Address', model: prisma.address },
    { name: 'Location', model: prisma.location },
    { name: 'Lock', model: prisma.lock },
    { name: 'RFIDKey', model: prisma.rFIDKey },
    { name: 'UserPermission', model: prisma.userPermission },
    { name: 'AccessLog', model: prisma.accessLog },
    { name: 'AuditLog', model: prisma.auditLog },
    { name: 'RefreshToken', model: prisma.refreshToken },
    { name: 'TwoFactorChallenge', model: prisma.twoFactorChallenge },
    { name: 'NotificationTemplate', model: prisma.notificationTemplate },
    { name: 'SystemConfig', model: prisma.systemConfig }
  ];

  let allEmpty = true;

  for (const table of tables) {
    const count = await table.model.count();
    const status = count === 0 ? '✅' : '❌';
    console.log(`${status} ${table.name}: ${count} records`);
    
    if (count > 0) {
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
  // In a production environment, you might want to add additional confirmation
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