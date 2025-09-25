const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateRFIDTenantScoping() {
  console.log('🔍 VALIDATING RFID TENANT SCOPING');
  console.log('==================================\n');
  
  try {
    // Get all RFID keys with their user and project-city info
    const rfidKeys = await prisma.rFIDKey.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            projectCityId: true,
            projectCity: {
              select: {
                project: { select: { name: true } },
                city: { select: { name: true } }
              }
            }
          }
        },
        projectCity: {
          select: {
            project: { select: { name: true } },
            city: { select: { name: true } }
          }
        }
      }
    });
    
    console.log(`📊 Total RFID keys to validate: ${rfidKeys.length}\n`);
    
    let validKeys = 0;
    let invalidKeys = 0;
    let missingProjectCity = 0;
    
    const issues = [];
    
    for (const key of rfidKeys) {
      const userProjectCityId = key.user.projectCityId;
      const keyProjectCityId = key.projectCityId;
      
      if (!keyProjectCityId) {
        console.log(`❌ RFID key ${key.cardId} missing projectCityId`);
        console.log(`   User: ${key.user.email}`);
        console.log(`   User ProjectCityId: ${userProjectCityId}\n`);
        missingProjectCity++;
        issues.push(`Missing projectCityId: ${key.cardId}`);
        continue;
      }
      
      if (userProjectCityId !== keyProjectCityId) {
        console.log(`🚨 RFID key ${key.cardId} has MISMATCHED projectCityId`);
        console.log(`   User: ${key.user.email}`);
        console.log(`   User ProjectCityId: ${userProjectCityId}`);
        console.log(`   Key ProjectCityId: ${keyProjectCityId}`);
        
        const userProjectCity = key.user.projectCity;
        const keyProjectCity = key.projectCity;
        
        if (userProjectCity) {
          console.log(`   User Project-City: ${userProjectCity.project.name} - ${userProjectCity.city.name}`);
        }
        if (keyProjectCity) {
          console.log(`   Key Project-City: ${keyProjectCity.project.name} - ${keyProjectCity.city.name}`);
        }
        console.log('');
        
        invalidKeys++;
        issues.push(`Mismatched projectCityId: ${key.cardId}`);
        continue;
      }
      
      // Valid key
      const projectCity = key.user.projectCity;
      const projectName = projectCity?.project?.name || 'Unknown';
      const cityName = projectCity?.city?.name || 'Unknown';
      
      console.log(`✅ RFID key ${key.cardId} correctly scoped`);
      console.log(`   User: ${key.user.email}`);
      console.log(`   Project-City: ${projectName} - ${cityName}`);
      console.log(`   ProjectCityId: ${keyProjectCityId}\n`);
      
      validKeys++;
    }
    
    // Summary
    console.log('📊 VALIDATION SUMMARY:');
    console.log('======================');
    console.log(`✅ Valid RFID keys: ${validKeys}`);
    console.log(`❌ Invalid RFID keys: ${invalidKeys}`);
    console.log(`⚠️  Missing projectCityId: ${missingProjectCity}`);
    console.log(`📊 Total keys: ${rfidKeys.length}\n`);
    
    if (invalidKeys === 0 && missingProjectCity === 0) {
      console.log('🎉 ALL RFID KEYS HAVE PERFECT TENANT SCOPING!');
      console.log('✅ No cross-tenant violations detected');
      console.log('✅ All keys properly linked to their user\'s project-city');
    } else {
      console.log('🚨 TENANT ISOLATION VIOLATIONS DETECTED:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\nRecommendation: Run the migration script again or investigate data inconsistencies');
    }
    
    // Test query performance
    console.log('\n⚡ PERFORMANCE TEST:');
    console.log('===================');
    
    const testProjectCityId = rfidKeys[0]?.projectCityId;
    if (testProjectCityId) {
      const start = Date.now();
      const scopedKeys = await prisma.rFIDKey.findMany({
        where: { projectCityId: testProjectCityId },
        include: { user: { select: { email: true } } }
      });
      const end = Date.now();
      
      console.log(`🚀 Direct projectCityId query: ${end - start}ms`);
      console.log(`📊 Found ${scopedKeys.length} keys for project-city: ${testProjectCityId.slice(-6)}`);
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateRFIDTenantScoping();