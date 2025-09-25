const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTenantIsolationViolations() {
  try {
    console.log('🔧 Fixing Tenant Isolation Violations...\n');
    
    // 1. Find all cross-tenant permissions
    const violations = await prisma.userPermission.findMany({
      include: {
        user: {
          include: {
            projectCity: {
              include: {
                project: true,
                city: true
              }
            }
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
    
    const crossTenantViolations = violations.filter(perm => {
      // Check if user's projectCityId matches lock's projectCityId
      return perm.user.projectCityId !== perm.lock.projectCityId;
    });
    
    console.log(`🚨 Found ${crossTenantViolations.length} cross-tenant permission violations:\n`);
    
    crossTenantViolations.forEach((violation, index) => {
      const userProject = violation.user.projectCity?.project?.name || 'Unknown';
      const userCity = violation.user.projectCity?.city?.name || 'Unknown';
      const lockProject = violation.lock.address.projectCity.project.name;
      const lockCity = violation.lock.address.projectCity.city.name;
      
      console.log(`   ${index + 1}. ${violation.user.firstName} ${violation.user.lastName}`);
      console.log(`      User: ${userProject} - ${userCity} (${violation.user.projectCityId})`);
      console.log(`      Lock: ${violation.lock.name}`);
      console.log(`      Lock Location: ${lockProject} - ${lockCity} (${violation.lock.projectCityId})`);
      console.log(`      Permission ID: ${violation.id}`);
      console.log('');
    });
    
    if (crossTenantViolations.length === 0) {
      console.log('✅ No cross-tenant violations found!');
      return;
    }
    
    // 2. Ask for confirmation (in real scenario - for demo we'll proceed)
    console.log('🔧 Removing cross-tenant permissions...\n');
    
    // 3. Remove the violations
    const violationIds = crossTenantViolations.map(v => v.id);
    
    const deleteResult = await prisma.userPermission.deleteMany({
      where: {
        id: {
          in: violationIds
        }
      }
    });
    
    console.log(`✅ Removed ${deleteResult.count} cross-tenant permissions\n`);
    
    // 4. Update permission projectCityId to match the lock for remaining permissions
    console.log('🔧 Updating permission projectCityId to match locks...\n');
    
    const remainingPermissions = await prisma.userPermission.findMany({
      include: {
        lock: true
      }
    });
    
    let updatedCount = 0;
    for (const perm of remainingPermissions) {
      if (perm.projectCityId !== perm.lock.projectCityId) {
        await prisma.userPermission.update({
          where: { id: perm.id },
          data: { projectCityId: perm.lock.projectCityId }
        });
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} permission projectCityId values\n`);
    
    // 5. Verify the fix
    console.log('🔍 Verifying tenant isolation...\n');
    
    const remainingViolations = await prisma.userPermission.findMany({
      include: {
        user: true,
        lock: true
      }
    });
    
    const stillViolated = remainingViolations.filter(perm => 
      perm.user.projectCityId !== perm.lock.projectCityId
    );
    
    if (stillViolated.length === 0) {
      console.log('✅ Tenant isolation successfully restored!');
      console.log('   All permissions now respect project-city boundaries.');
    } else {
      console.log(`🚨 Still ${stillViolated.length} violations remaining - manual investigation needed.`);
    }
    
    // 6. Summary of what should be allowed
    console.log('\n📋 TENANT ISOLATION RULES:');
    console.log('==========================');
    console.log('✅ PerfectIT Amsterdam users → PerfectIT Amsterdam locks');
    console.log('✅ PerfectIT Rotterdam users → PerfectIT Rotterdam locks');
    console.log('✅ Acme Amsterdam users → Acme Amsterdam locks');
    console.log('✅ Acme Utrecht users → Acme Utrecht locks');
    console.log('❌ Cross-project access (PerfectIT ↔ Acme)');
    console.log('❌ Cross-city access within same project');
    console.log('❌ Default Project users accessing tenant locks');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTenantIsolationViolations();