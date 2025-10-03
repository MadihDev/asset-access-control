const prisma = require('./src/lib/prisma').default;

async function checkSecureBuildings() {
  try {
    // Check if securebuildings project exists
    const project = await prisma.project.findUnique({ 
      where: { slug: 'securebuildings' }, 
      include: { projectCities: { include: { city: true } } } 
    });
    console.log('SecureBuildings Project:', JSON.stringify(project, null, 2));
    
    // Check securebuildings users
    const users = await prisma.user.findMany({ 
      where: { username: { contains: 'secure' } },
      include: { projectCity: { include: { project: true, city: true } } }
    });
    console.log('SecureBuildings Users:', JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSecureBuildings();