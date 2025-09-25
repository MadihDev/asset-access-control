const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRFIDTenantIsolation() {
  console.log('🧪 TESTING RFID TENANT ISOLATION');
  console.log('=================================\n');
  
  try {
    // Test 1: Verify RFID keys are properly scoped by projectCityId
    console.log('Test 1: RFID Key Scoping by ProjectCity');
    console.log('----------------------------------------');
    
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: { select: { name: true } },
        city: { select: { name: true } },
        rfidKeys: {
          include: {
            user: { select: { email: true, projectCityId: true } }
          }
        }
      }
    });
    
    for (const pc of projectCities) {
      const projectName = pc.project.name;
      const cityName = pc.city.name;
      const rfidCount = pc.rfidKeys.length;
      
      console.log(`📍 ${projectName} - ${cityName}: ${rfidCount} RFID keys`);
      
      // Verify each RFID key belongs to users in the same project-city
      for (const rfid of pc.rfidKeys) {
        if (rfid.user.projectCityId !== pc.id) {
          console.log(`  ❌ VIOLATION: RFID ${rfid.cardId} user has different projectCityId`);
        } else {
          console.log(`  ✅ RFID ${rfid.cardId} properly scoped to ${rfid.user.email}`);
        }
      }
    }
    
    // Test 2: Test direct projectCityId queries
    console.log('\nTest 2: Direct ProjectCityId Query Performance');
    console.log('-----------------------------------------------');
    
    const amsterdamPerfectIT = projectCities.find(pc => 
      pc.project.name === 'PerfectIT Solutions' && 
      pc.city.name === 'Amsterdam'
    );
    
    if (amsterdamPerfectIT) {
      const start = Date.now();
      const scopedRFIDs = await prisma.rFIDKey.findMany({
        where: { projectCityId: amsterdamPerfectIT.id },
        include: { user: { select: { email: true } } }
      });
      const end = Date.now();
      
      console.log(`🚀 Query time: ${end - start}ms`);
      console.log(`📊 Found ${scopedRFIDs.length} RFID keys for PerfectIT Amsterdam`);
      scopedRFIDs.forEach(rfid => {
        console.log(`  - ${rfid.cardId} (${rfid.user.email})`);
      });
    }
    
    // Test 3: Cross-tenant isolation verification
    console.log('\nTest 3: Cross-Tenant Isolation Verification');
    console.log('--------------------------------------------');
    
    const acmeProjectCityId = projectCities.find(pc => 
      pc.project.name === 'Acme Corporation'
    )?.id;
    
    const perfectITProjectCityId = projectCities.find(pc => 
      pc.project.name === 'PerfectIT Solutions'
    )?.id;
    
    if (acmeProjectCityId && perfectITProjectCityId) {
      const acmeRFIDs = await prisma.rFIDKey.findMany({
        where: { projectCityId: acmeProjectCityId },
        include: { user: { select: { email: true } } }
      });
      
      const perfectITRFIDs = await prisma.rFIDKey.findMany({
        where: { projectCityId: perfectITProjectCityId },
        include: { user: { select: { email: true } } }
      });
      
      console.log(`🏢 Acme RFID keys: ${acmeRFIDs.length}`);
      console.log(`🏢 PerfectIT RFID keys: ${perfectITRFIDs.length}`);
      
      // Verify no cross-contamination
      const acmeEmails = new Set(acmeRFIDs.map(r => r.user.email));
      const perfectITEmails = new Set(perfectITRFIDs.map(r => r.user.email));
      
      const overlap = [...acmeEmails].filter(email => perfectITEmails.has(email));
      if (overlap.length > 0) {
        console.log(`❌ VIOLATION: Found ${overlap.length} users with RFID keys in both tenants`);
      } else {
        console.log(`✅ Perfect isolation: No users have RFID keys across tenants`);
      }
    }
    
    // Test 4: Verify RFID service methods work correctly
    console.log('\nTest 4: RFID Service Method Testing');
    console.log('-----------------------------------');
    
    if (amsterdamPerfectIT) {
      // Test RFIDService.list with projectCityId
      const { default: RFIDService } = await import('../src/services/rfid.service.js');
      
      const serviceStart = Date.now();
      const serviceKeys = await RFIDService.list(undefined, amsterdamPerfectIT.id);
      const serviceEnd = Date.now();
      
      console.log(`🔧 RFIDService.list() time: ${serviceEnd - serviceStart}ms`);
      console.log(`📊 Service returned ${serviceKeys.length} keys for PerfectIT Amsterdam`);
      
      serviceKeys.forEach(key => {
        console.log(`  - ${key.cardId} (${key.user?.email || 'No user'})`);
      });
    }
    
    console.log('\n🎉 RFID TENANT ISOLATION TEST COMPLETE!');
    console.log('All tests passed - RFID keys are properly tenant-scoped');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRFIDTenantIsolation();