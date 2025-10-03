const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenantAssignmentIssue() {
  try {
    console.log('🔍 INVESTIGATING CROSS-TENANT ASSIGNMENT ISSUE');
    console.log('=' * 60);
    
    // Find SafeAccess admin user
    const safeAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { username: { contains: 'safeaccess' } },
          { firstName: { contains: 'SafeAccess' } }
        ],
        role: 'ADMIN' 
      },
      include: { projectCity: { include: { project: true, city: true } } }
    });
    
    console.log('\n👤 SAFEACCESS ADMIN USER:');
    if (safeAdmin) {
      console.log(`   Name: ${safeAdmin.firstName} ${safeAdmin.lastName}`);
      console.log(`   Username: ${safeAdmin.username}`);
      console.log(`   Project: ${safeAdmin.projectCity?.project?.name} (${safeAdmin.projectCity?.project?.slug})`);
      console.log(`   City: ${safeAdmin.projectCity?.city?.name}`);
      console.log(`   ProjectCityId: ${safeAdmin.projectCityId}`);
    } else {
      console.log('   ❌ SafeAccess admin not found');
    }
    
    // Find GATE Lock 2
    const gateLock = await prisma.lock.findFirst({
      where: { name: { contains: 'GATE Lock 2' } },
      include: { 
        location: {
          include: {
            address: {
              include: {
                projectCity: { include: { project: true, city: true } }
              }
            }
          }
        },
        projectCity: { include: { project: true, city: true } }
      }
    });
    
    console.log('\n🔒 GATE LOCK 2:');
    if (gateLock) {
      console.log(`   Name: ${gateLock.name}`);
      console.log(`   Device ID: ${gateLock.deviceId}`);
      console.log(`   Address: ${gateLock.location?.address?.street} ${gateLock.location?.address?.number}`);
      console.log(`   Project: ${gateLock.projectCity?.project?.name} (${gateLock.projectCity?.project?.slug})`);
      console.log(`   City: ${gateLock.projectCity?.city?.name}`);
      console.log(`   ProjectCityId: ${gateLock.projectCityId}`);
      console.log(`   Location: ${gateLock.location?.name || 'No location'}`);
    } else {
      console.log('   ❌ GATE Lock 2 not found');
    }
    
    // Check tenant isolation
    console.log('\n🛡️ TENANT ISOLATION ANALYSIS:');
    if (safeAdmin && gateLock) {
      const sameProjectCity = safeAdmin.projectCityId === gateLock.projectCityId;
      const sameProject = safeAdmin.projectCity?.project?.slug === gateLock.projectCity?.project?.slug;
      const sameCity = safeAdmin.projectCity?.city?.name === gateLock.projectCity?.city?.name;
      
      console.log(`   Same ProjectCity ID: ${sameProjectCity} (${safeAdmin.projectCityId} vs ${gateLock.projectCityId})`);
      console.log(`   Same Project: ${sameProject} (${safeAdmin.projectCity?.project?.slug} vs ${gateLock.projectCity?.project?.slug})`);
      console.log(`   Same City: ${sameCity} (${safeAdmin.projectCity?.city?.name} vs ${gateLock.projectCity?.city?.name})`);
      
      if (sameProjectCity) {
        console.log('   ✅ ASSIGNMENT IS VALID - Same tenant context');
      } else {
        console.log('   🚨 SECURITY ISSUE - Cross-tenant assignment possible!');
      }
    }
    
    // Check all SafeAccess locks
    console.log('\n📊 ALL SAFEACCESS LOCKS:');
    if (safeAdmin) {
      const safeAccessLocks = await prisma.lock.findMany({
        where: { projectCityId: safeAdmin.projectCityId },
        include: { location: { include: { address: true } } }
      });
      
      console.log(`   Found ${safeAccessLocks.length} locks in SafeAccess tenant:`);
      safeAccessLocks.forEach((lock, index) => {
        console.log(`   ${index + 1}. ${lock.name} - ${lock.location?.address?.street} ${lock.location?.address?.number}`);
      });
    }
    
    // Check if there are locks from other tenants
    console.log('\n🔍 LOCKS FROM OTHER TENANTS:');
    const allLocks = await prisma.lock.findMany({
      where: { name: { contains: 'GATE' } },
      include: { 
        projectCity: { include: { project: true, city: true } }
      }
    });
    
    console.log(`   Found ${allLocks.length} GATE locks across all tenants:`);
    allLocks.forEach((lock, index) => {
      const tenant = `${lock.projectCity?.project?.slug}-${lock.projectCity?.city?.name}`;
      console.log(`   ${index + 1}. ${lock.name} - Tenant: ${tenant}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenantAssignmentIssue();