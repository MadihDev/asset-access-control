const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixLockProjectCityIds() {
  console.log('🔧 Fixing Lock projectCityId values...');
  
  try {
    // Get all locks with their addresses
    const locks = await prisma.lock.findMany({
      include: {
        address: {
          select: {
            projectCityId: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${locks.length} locks to check`);
    
    let updateCount = 0;
    
    for (const lock of locks) {
      const currentLockProjectCityId = lock.projectCityId;
      const correctProjectCityId = lock.address?.projectCityId;
      
      if (correctProjectCityId && currentLockProjectCityId !== correctProjectCityId) {
        await prisma.lock.update({
          where: { id: lock.id },
          data: { projectCityId: correctProjectCityId }
        });
        
        updateCount++;
        console.log(`✅ Updated ${lock.name}`);
        console.log(`   From: ${currentLockProjectCityId || 'null'} → To: ${correctProjectCityId}`);
      }
    }
    
    console.log(`🎉 Successfully updated ${updateCount} locks`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedLocks = await prisma.lock.findMany({
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
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 Updated locks:');
    updatedLocks.forEach((lock, i) => {
      const lockProject = lock.projectCity?.project?.name || 'None';
      const addressProject = lock.address?.projectCity?.project?.name || 'None';
      const match = lockProject === addressProject ? '✅' : '❌';
      
      console.log(`${i+1}. ${lock.name}`);
      console.log(`   Lock Project: ${lockProject} | Address Project: ${addressProject} ${match}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLockProjectCityIds();