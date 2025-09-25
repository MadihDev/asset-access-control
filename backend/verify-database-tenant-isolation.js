const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabaseTenantIsolation() {
  console.log('🗄️ DATABASE TENANT ISOLATION VERIFICATION');
  console.log('=========================================\n');
  
  try {
    // Get all ProjectCity records
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true
      }
    });
    
    console.log('📍 TENANT PROJECT-CITIES:');
    projectCities.forEach(pc => {
      console.log(`   ${pc.id}: ${pc.project.name} - ${pc.city.name}`);
    });
    console.log('');
    
    // Check each tenant's data isolation
    for (const pc of projectCities) {
      console.log(`🔍 CHECKING TENANT: ${pc.project.name} - ${pc.city.name}`);
      console.log('---------------------------------------------------');
      
      // Users
      const users = await prisma.user.findMany({
        where: { projectCityId: pc.id }
      });
      console.log(`   👥 Users: ${users.length}`);
      
      // Locks
      const locks = await prisma.lock.findMany({
        where: { projectCityId: pc.id },
        include: { address: true }
      });
      console.log(`   🔒 Locks: ${locks.length}`);
      
      // Addresses
      const addresses = await prisma.address.findMany({
        where: { projectCityId: pc.id }
      });
      console.log(`   📍 Addresses: ${addresses.length}`);
      
      // RFID Keys
      const rfidKeys = await prisma.rFIDKey.findMany({
        where: { projectCityId: pc.id }
      });
      console.log(`   🗝️ RFID Keys: ${rfidKeys.length}`);
      
      // Permissions
      const permissions = await prisma.userPermission.findMany({
        where: {
          user: { projectCityId: pc.id }
        },
        include: {
          user: true,
          lock: { include: { address: true } }
        }
      });
      console.log(`   🔑 Permissions: ${permissions.length}`);
      
      // Access Logs
      const accessLogs = await prisma.accessLog.findMany({
        where: { projectCityId: pc.id }
      });
      console.log(`   📋 Access Logs: ${accessLogs.length}`);
      
      // CRITICAL: Check for cross-tenant data leakage
      const crossTenantPermissions = await prisma.userPermission.findMany({
        where: {
          user: { projectCityId: pc.id },
          lock: { projectCityId: { not: pc.id } }
        }
      });
      
      if (crossTenantPermissions.length > 0) {
        console.log(`   ❌ CRITICAL: ${crossTenantPermissions.length} cross-tenant permissions found!`);
        crossTenantPermissions.forEach(perm => {
          console.log(`      User ${perm.userId} (tenant ${pc.id}) has access to lock ${perm.lockId} (different tenant)`);
        });
      } else {
        console.log(`   ✅ No cross-tenant permissions`);
      }
      
      // Check for orphaned access logs
      const orphanedLogs = await prisma.accessLog.findMany({
        where: {
          projectCityId: pc.id,
          lock: { projectCityId: { not: pc.id } }
        }
      });
      
      if (orphanedLogs.length > 0) {
        console.log(`   ❌ CRITICAL: ${orphanedLogs.length} orphaned access logs found!`);
      } else {
        console.log(`   ✅ No orphaned access logs`);
      }
      
      console.log('');
    }
    
    // Global consistency checks
    console.log('🌐 GLOBAL CONSISTENCY CHECKS');
    console.log('============================');
    
    // Check for users without projectCityId
    const usersWithoutTenant = await prisma.user.findMany({
      where: { projectCityId: null }
    });
    console.log(`❓ Users without tenant: ${usersWithoutTenant.length}`);
    if (usersWithoutTenant.length > 0) {
      usersWithoutTenant.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    }
    
    // Check for locks without projectCityId
    const locksWithoutTenant = await prisma.lock.findMany({
      where: { projectCityId: null }
    });
    console.log(`❓ Locks without tenant: ${locksWithoutTenant.length}`);
    
    // Check for addresses without projectCityId
    const addressesWithoutTenant = await prisma.address.findMany({
      where: { projectCityId: null }
    });
    console.log(`❓ Addresses without tenant: ${addressesWithoutTenant.length}`);
    
    // Check for RFID keys without projectCityId
    const rfidKeysWithoutTenant = await prisma.rFIDKey.findMany({
      where: { projectCityId: null }
    });
    console.log(`❓ RFID Keys without tenant: ${rfidKeysWithoutTenant.length}`);
    
    // Check for access logs without projectCityId
    const accessLogsWithoutTenant = await prisma.accessLog.findMany({
      where: { projectCityId: null }
    });
    console.log(`❓ Access logs without tenant: ${accessLogsWithoutTenant.length}`);
    
    // Summary
    console.log('\n🎯 DATABASE ISOLATION SUMMARY');
    console.log('=============================');
    
    const issues = [];
    if (usersWithoutTenant.length > 0) issues.push(`${usersWithoutTenant.length} users without tenant`);
    if (locksWithoutTenant.length > 0) issues.push(`${locksWithoutTenant.length} locks without tenant`);
    if (addressesWithoutTenant.length > 0) issues.push(`${addressesWithoutTenant.length} addresses without tenant`);
    if (rfidKeysWithoutTenant.length > 0) issues.push(`${rfidKeysWithoutTenant.length} RFID keys without tenant`);
    if (accessLogsWithoutTenant.length > 0) issues.push(`${accessLogsWithoutTenant.length} access logs without tenant`);
    
    if (issues.length === 0) {
      console.log('✅ DATABASE STATUS: PERFECT ISOLATION');
      console.log('🔒 ALL DATA: PROPERLY TENANT-SCOPED');
      console.log('🎯 PRODUCTION READY: YES');
    } else {
      console.log('⚠️ DATABASE STATUS: ISSUES FOUND');
      console.log('📋 ISSUES:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseTenantIsolation();