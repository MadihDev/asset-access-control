const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRFIDData() {
  console.log('🔧 Migrating existing RFID keys to include projectCityId...\n');
  
  try {
    // Get all RFID keys that don't have projectCityId set
    const rfidKeysWithoutProjectCity = await prisma.rFIDKey.findMany({
      where: {
        projectCityId: null
      },
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
        }
      }
    });
    
    console.log(`📊 Found ${rfidKeysWithoutProjectCity.length} RFID keys to migrate\n`);
    
    if (rfidKeysWithoutProjectCity.length === 0) {
      console.log('✅ No RFID keys need migration - all already have projectCityId');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    
    for (const rfidKey of rfidKeysWithoutProjectCity) {
      try {
        if (!rfidKey.user.projectCityId) {
          console.log(`⚠️  RFID key ${rfidKey.cardId} belongs to user ${rfidKey.user.email} who has no projectCityId`);
          errors++;
          continue;
        }
        
        await prisma.rFIDKey.update({
          where: { id: rfidKey.id },
          data: { projectCityId: rfidKey.user.projectCityId }
        });
        
        const projectName = rfidKey.user.projectCity?.project?.name || 'Unknown';
        const cityName = rfidKey.user.projectCity?.city?.name || 'Unknown';
        
        console.log(`✅ Updated RFID key ${rfidKey.cardId} for ${rfidKey.user.email}`);
        console.log(`   ProjectCity: ${projectName} - ${cityName}`);
        console.log(`   ProjectCityId: ${rfidKey.user.projectCityId}\n`);
        
        updated++;
      } catch (error) {
        console.log(`❌ Error updating RFID key ${rfidKey.cardId}:`, error.message);
        errors++;
      }
    }
    
    console.log('📊 MIGRATION SUMMARY:');
    console.log('====================');
    console.log(`✅ Successfully updated: ${updated} RFID keys`);
    console.log(`❌ Errors encountered: ${errors} RFID keys`);
    
    if (errors === 0) {
      console.log('\n🎉 All RFID keys successfully migrated with proper tenant scoping!');
    } else {
      console.log('\n⚠️  Some RFID keys could not be migrated - please review errors above');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRFIDData();