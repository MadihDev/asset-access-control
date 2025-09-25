const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTenantIsolation() {
  try {
    console.log('🔒 Debugging Tenant Isolation Issues...\n');
    
    // 1. Find all project-cities and their users
    console.log('🏢 PROJECT-CITIES AND USERS:');
    console.log('============================');
    
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    projectCities.forEach((pc, index) => {
      console.log(`   ${index + 1}. ${pc.project.name} - ${pc.city.name}`);
      console.log(`      ProjectCity ID: ${pc.id}`);
      console.log(`      Users: ${pc.users.length}`);
      pc.users.forEach(user => {
        console.log(`         - ${user.firstName} ${user.lastName} (${user.email}) [${user.role}]`);
      });
      console.log('');
    });
    
    // 2. Find PerfectIT locks and check who has permissions
    const perfectItLocks = await prisma.lock.findMany({
      where: {
        address: {
          street: { contains: 'PerfectIT Solutions' }
        }
      },
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
        },
        permissions: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                projectCityId: true,
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
    
    console.log('🔐 PERFECTIT LOCKS AND PERMISSIONS:');
    console.log('===================================');
    
    perfectItLocks.forEach((lock, index) => {
      console.log(`   🔒 Lock ${index + 1}: ${lock.name}`);
      console.log(`      Lock ProjectCityId: ${lock.projectCityId}`);
      console.log(`      Address: ${lock.address.street} ${lock.address.number}, ${lock.address.zipCode}`);
      console.log(`      Address ProjectCityId: ${lock.address.projectCityId}`);
      console.log(`      Address Project: ${lock.address.projectCity.project.name}`);
      console.log(`      Address City: ${lock.address.projectCity.city.name}`);
      console.log(`      Permissions: ${lock.permissions.length}`);
      
      lock.permissions.forEach(perm => {
        const user = perm.user;
        const userProject = user.projectCity?.project?.name || 'Unknown';
        const userCity = user.projectCity?.city?.name || 'Unknown';
        const isWrongTenant = user.projectCityId !== lock.projectCityId;
        const warningIcon = isWrongTenant ? '⚠️' : '✅';
        
        console.log(`         ${warningIcon} ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`            User ProjectCityId: ${user.projectCityId}`);
        console.log(`            User Project-City: ${userProject} - ${userCity}`);
        console.log(`            Can Access: ${perm.canAccess}`);
        console.log(`            Valid From: ${perm.validFrom}`);
        console.log(`            Valid To: ${perm.validTo || 'Never'}`);
        console.log(`            Cross-Tenant Access: ${isWrongTenant ? 'YES (PROBLEM!)' : 'No'}`);
        console.log('');
      });
      console.log('');
    });
    
    // 3. Find cross-tenant access attempts
    console.log('🚨 CROSS-TENANT ACCESS ATTEMPTS:');
    console.log('=================================');
    
    const crossTenantAccess = await prisma.accessLog.findMany({
      where: {
        lock: {
          address: {
            street: { contains: 'PerfectIT Solutions' }
          }
        }
      },
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
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    crossTenantAccess.forEach((log, index) => {
      const userProject = log.user?.projectCity?.project?.name || 'Unknown';
      const lockProject = log.lock.address.projectCity.project.name;
      const isCrossTenant = userProject !== lockProject;
      const warningIcon = isCrossTenant ? '🚨' : '✅';
      
      console.log(`   ${warningIcon} ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`      User: ${log.user?.firstName} ${log.user?.lastName} (${userProject})`);
      console.log(`      Lock: ${log.lock.name} (${lockProject})`);
      console.log(`      Result: ${log.result}`);
      console.log(`      Cross-Tenant: ${isCrossTenant ? 'YES (VIOLATION!)' : 'No'}`);
      console.log('');
    });
    
    // 4. Summary
    const totalCrossTenantPermissions = perfectItLocks.reduce((sum, lock) => {
      return sum + lock.permissions.filter(perm => 
        perm.user.projectCityId !== lock.projectCityId
      ).length;
    }, 0);
    
    const totalCrossTenantAttempts = crossTenantAccess.filter(log => {
      const userProject = log.user?.projectCity?.project?.name || 'Unknown';
      const lockProject = log.lock.address.projectCity.project.name;
      return userProject !== lockProject;
    }).length;
    
    console.log('📊 TENANT ISOLATION SUMMARY:');
    console.log('============================');
    console.log(`   Cross-Tenant Permissions: ${totalCrossTenantPermissions}`);
    console.log(`   Cross-Tenant Access Attempts: ${totalCrossTenantAttempts}`);
    console.log(`   Total PerfectIT Locks: ${perfectItLocks.length}`);
    console.log('');
    
    if (totalCrossTenantPermissions > 0 || totalCrossTenantAttempts > 0) {
      console.log('🚨 TENANT ISOLATION VIOLATIONS DETECTED!');
      console.log('Action needed: Remove cross-tenant permissions and investigate how they were created.');
    } else {
      console.log('✅ Tenant isolation appears to be working correctly.');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTenantIsolation();