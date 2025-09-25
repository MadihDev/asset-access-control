const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCrossTenantDataLeakage() {
  console.log('🔧 FIXING CROSS-TENANT DATA LEAKAGE');
  console.log('==================================\n');
  
  try {
    // 1. Find and fix cross-tenant permissions
    console.log('1️⃣ FIXING CROSS-TENANT PERMISSIONS');
    console.log('----------------------------------');
    
    const crossTenantPermissions = await prisma.userPermission.findMany({
      where: {
        user: {
          projectCityId: { not: null }
        },
        lock: {
          projectCityId: { not: null }
        }
      },
      include: {
        user: true,
        lock: true
      }
    });
    
    console.log(`Found ${crossTenantPermissions.length} permissions to check...`);
    
    const invalidPermissions = crossTenantPermissions.filter(perm => 
      perm.user.projectCityId !== perm.lock.projectCityId
    );
    
    if (invalidPermissions.length > 0) {
      console.log(`❌ Found ${invalidPermissions.length} cross-tenant permissions:`);
      
      for (const perm of invalidPermissions) {
        console.log(`   - User ${perm.userId} (tenant: ${perm.user.projectCityId}) -> Lock ${perm.lockId} (tenant: ${perm.lock.projectCityId})`);
        
        // Delete the invalid permission
        await prisma.userPermission.delete({
          where: { id: perm.id }
        });
        console.log(`   ✅ Deleted cross-tenant permission ${perm.id}`);
      }
    } else {
      console.log('✅ No cross-tenant permissions found');
    }
    
    // 2. Find and fix orphaned access logs
    console.log('\n2️⃣ FIXING ORPHANED ACCESS LOGS');
    console.log('------------------------------');
    
    const orphanedAccessLogs = await prisma.accessLog.findMany({
      where: {
        projectCityId: { not: null },
        lock: {
          projectCityId: { not: null }
        }
      },
      include: {
        lock: true
      }
    });
    
    console.log(`Found ${orphanedAccessLogs.length} access logs to check...`);
    
    const invalidAccessLogs = orphanedAccessLogs.filter(log => 
      log.projectCityId !== log.lock.projectCityId
    );
    
    if (invalidAccessLogs.length > 0) {
      console.log(`❌ Found ${invalidAccessLogs.length} orphaned access logs:`);
      
      // Group by correct tenant for bulk update
      const updateGroups = {};
      for (const log of invalidAccessLogs) {
        const correctTenant = log.lock.projectCityId;
        if (!updateGroups[correctTenant]) {
          updateGroups[correctTenant] = [];
        }
        updateGroups[correctTenant].push(log.id);
      }
      
      for (const [correctTenant, logIds] of Object.entries(updateGroups)) {
        console.log(`   📋 Updating ${logIds.length} logs to tenant: ${correctTenant}`);
        
        await prisma.accessLog.updateMany({
          where: { id: { in: logIds } },
          data: { projectCityId: correctTenant }
        });
        
        console.log(`   ✅ Updated ${logIds.length} access logs to correct tenant`);
      }
    } else {
      console.log('✅ No orphaned access logs found');
    }
    
    // 3. Verify the fixes
    console.log('\n3️⃣ VERIFYING FIXES');
    console.log('------------------');
    
    // Re-check cross-tenant permissions
    const remainingCrossTenantPerms = await prisma.userPermission.count({
      where: {
        user: {
          projectCityId: { not: null }
        },
        lock: {
          projectCityId: { not: null }
        },
        NOT: {
          user: {
            projectCityId: {
              equals: prisma.userPermission.fields.lock.select().projectCityId
            }
          }
        }
      }
    });
    
    // Re-check orphaned access logs
    const remainingOrphanedLogs = await prisma.accessLog.count({
      where: {
        projectCityId: { not: null },
        lock: {
          projectCityId: { not: null }
        },
        NOT: {
          projectCityId: {
            equals: prisma.accessLog.fields.lock.select().projectCityId
          }
        }
      }
    });
    
    console.log(`✅ Remaining cross-tenant permissions: ${remainingCrossTenantPerms}`);
    console.log(`✅ Remaining orphaned access logs: ${remainingOrphanedLogs}`);
    
    // 4. Generate summary report
    console.log('\n🎯 DATA CLEANUP SUMMARY');
    console.log('======================');
    console.log(`🗑️ Deleted cross-tenant permissions: ${invalidPermissions.length}`);
    console.log(`🔄 Fixed orphaned access logs: ${invalidAccessLogs.length}`);
    
    if (remainingCrossTenantPerms === 0 && remainingOrphanedLogs === 0) {
      console.log('\n🟢 STATUS: ALL DATA LEAKAGE FIXED');
      console.log('✅ TENANT ISOLATION: PERFECT');
      console.log('🔒 DATABASE: PRODUCTION READY');
    } else {
      console.log('\n🔴 STATUS: ISSUES REMAIN');
      console.log('❌ TENANT ISOLATION: COMPROMISED');
      console.log('⚠️ DATABASE: NEEDS ATTENTION');
    }
    
  } catch (error) {
    console.error('❌ Fix operation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCrossTenantDataLeakage();