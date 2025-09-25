const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixLockProjectCityIds() {
  try {
    console.log('🔧 Fixing Lock ProjectCityId Mismatches...\n');
    
    // Find all addresses with their correct projectCityId
    const addresses = await prisma.address.findMany({
      include: {
        locks: true
      }
    });
    
    console.log(`📍 Found ${addresses.length} addresses to check...\n`);
    
    let fixedCount = 0;
    
    for (const address of addresses) {
      if (address.locks.length > 0) {
        for (const lock of address.locks) {
          if (lock.projectCityId !== address.projectCityId) {
            console.log(`🔧 Fixing lock: ${lock.name}`);
            console.log(`   Address ProjectCityId: ${address.projectCityId}`);
            console.log(`   Lock ProjectCityId (OLD): ${lock.projectCityId}`);
            
            // Update the lock's projectCityId to match its address
            await prisma.lock.update({
              where: { id: lock.id },
              data: { projectCityId: address.projectCityId }
            });
            
            console.log(`   Lock ProjectCityId (NEW): ${address.projectCityId}`);
            console.log(`   ✅ Fixed!\n`);
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`🎯 SUMMARY: Fixed ${fixedCount} locks with mismatched projectCityIds\n`);
    
    // Verify the fix by checking PerfectIT locks specifically
    const perfectItAddresses = await prisma.address.findMany({
      where: {
        street: { contains: 'PerfectIT Solutions' },
        projectCityId: 'cmfvb6y2x0008t23ffud3qe4x' // PerfectIT Amsterdam projectCityId
      },
      include: {
        locks: true
      }
    });
    
    console.log('🏢 PERFECTIT LOCKS AFTER FIX:');
    console.log('=============================');
    perfectItAddresses.forEach((address, index) => {
      console.log(`   📍 Address ${index + 1}: ${address.street} ${address.number}, ${address.zipCode}`);
      console.log(`      Address ProjectCityId: ${address.projectCityId}`);
      
      address.locks.forEach((lock, lockIndex) => {
        console.log(`      🔒 Lock ${lockIndex + 1}: ${lock.name}`);
        console.log(`         Lock ProjectCityId: ${lock.projectCityId}`);
        console.log(`         Match: ${lock.projectCityId === address.projectCityId ? '✅' : '❌'}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixLockProjectCityIds();