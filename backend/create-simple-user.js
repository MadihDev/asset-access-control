const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createSimpleUser() {
  try {
    console.log('👤 Creating simple user for testing...')
    
    // Get PerfectIT project and Amsterdam city
    const perfectIT = await prisma.project.findUnique({
      where: { slug: 'perfectit-solutions' }
    })
    
    const amsterdam = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    
    const perfectIT_Amsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      }
    })
    
    // Hash password
    const hashedPassword = await bcrypt.hash('Password123!', 10)
    
    // Create simple user with alphanumeric username
    const testUser = await prisma.user.upsert({
      where: { username: 'testuser123' },
      create: {
        username: 'testuser123',
        email: 'testuser@perfectit.com',
        firstName: 'Test',
        lastName: 'User',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id,
        password: hashedPassword,
        isActive: true
      }
    })
    
    console.log(`✅ Created test user: ${testUser.firstName} ${testUser.lastName} (${testUser.username})`)
    console.log('🔐 Password: Password123!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createSimpleUser()