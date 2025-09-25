const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLockProjectCityIds() {
  console.log('🔍 Analyzing Lock projectCityId assignments...');
  
  try {
    // Get all locks with their project city information
    const locks = await prisma.lock.findMany({
      include: {
        address: {
          include: {
            city: true,
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
    
    console.log(`📊 Found ${locks.length} locks total\n`);
    
    locks.forEach((lock, i) => {
      const lockProjectCity = lock.projectCity;
      const addressProjectCity = lock.address?.projectCity;
      
      console.log(`${i+1}. ${lock.name}`);
      console.log(`   Lock ProjectCityId: ${lock.projectCityId || 'None'}`);
      console.log(`   Lock Project: ${lockProjectCity?.project?.name || 'None'}`);
      console.log(`   Lock City: ${lockProjectCity?.city?.name || 'None'}`);
      console.log(`   Address ProjectCityId: ${lock.address?.projectCityId || 'None'}`);
      console.log(`   Address Project: ${addressProjectCity?.project?.name || 'None'}`);
      console.log(`   Address City: ${addressProjectCity?.city?.name || lock.address?.city?.name || 'None'}`);
      console.log('');
    });
    
    // Check if locks have project names in their names but wrong projectCityId
    console.log('🔍 Analyzing lock names vs projectCityId...');
    locks.forEach(lock => {
      const lockName = lock.name;
      const projectFromName = lockName.includes('PerfectIT Solutions') ? 'PerfectIT Solutions' : 
                             lockName.includes('Acme Corporation') ? 'Acme Corporation' :
                             lockName.includes('Default Project') ? 'Default Project' : 'Unknown';
      
      const actualProject = lock.projectCity?.project?.name || 'None';
      
      if (projectFromName !== actualProject && projectFromName !== 'Unknown') {
        console.log(`❌ MISMATCH: ${lockName}`);
        console.log(`   Name suggests: ${projectFromName}`);
        console.log(`   ProjectCity says: ${actualProject}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLockProjectCityIds();