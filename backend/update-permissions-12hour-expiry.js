const { PrismaClient } = require('@prisma/client');

async function updateExistingPermissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Updating existing permissions to expire after 12 hours...');
    
    // Calculate 12 hours from now
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ New expiry time: ${twelveHoursFromNow.toISOString()}`);
    
    // Find all permissions that currently have no expiry (validTo is null)
    const permissionsWithoutExpiry = await prisma.userPermission.findMany({
      where: {
        validTo: null
      },
      include: {
        user: {
          select: {
            email: true,
            projectCityId: true
          }
        },
        lock: {
          include: {
            address: {
              include: {
                projectCity: {
                  include: {
                    project: true,
                    city: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`📋 Found ${permissionsWithoutExpiry.length} permissions without expiry`);
    
    if (permissionsWithoutExpiry.length === 0) {
      console.log('✅ No permissions to update');
      return;
    }
    
    // Group by tenant for better visibility
    const byTenant = {};
    permissionsWithoutExpiry.forEach(perm => {
      const tenantKey = `${perm.lock.address.projectCity.project.name}-${perm.lock.address.projectCity.city.name}`;
      if (!byTenant[tenantKey]) {
        byTenant[tenantKey] = [];
      }
      byTenant[tenantKey].push(perm);
    });
    
    console.log('\n📊 Permissions by tenant:');
    Object.entries(byTenant).forEach(([tenant, perms]) => {
      console.log(`  ${tenant}: ${perms.length} permissions`);
      perms.forEach((perm, idx) => {
        console.log(`    ${idx + 1}. User: ${perm.user.email} | Lock: ${perm.lock.name} | Active: ${perm.canAccess}`);
      });
    });
    
    console.log('\n🔄 Updating permissions to expire in 12 hours...');
    
    // Update all permissions without expiry to expire in 12 hours
    const updateResult = await prisma.userPermission.updateMany({
      where: {
        validTo: null
      },
      data: {
        validTo: twelveHoursFromNow
      }
    });
    
    console.log(`✅ Updated ${updateResult.count} permissions to expire at ${twelveHoursFromNow.toISOString()}`);
    
    // Verify the update
    const remainingWithoutExpiry = await prisma.userPermission.count({
      where: {
        validTo: null
      }
    });
    
    console.log(`✅ Verification: ${remainingWithoutExpiry} permissions still without expiry (should be 0)`);
    
    // Show sample of updated permissions
    const updatedPermissions = await prisma.userPermission.findMany({
      where: {
        validTo: twelveHoursFromNow
      },
      include: {
        user: {
          select: {
            email: true
          }
        },
        lock: {
          select: {
            name: true
          }
        }
      },
      take: 5
    });
    
    console.log('\n📋 Sample of updated permissions:');
    updatedPermissions.forEach((perm, idx) => {
      console.log(`  ${idx + 1}. User: ${perm.user.email} | Lock: ${perm.lock.name} | Expires: ${perm.validTo}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating permissions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingPermissions();