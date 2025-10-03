import prisma from './src/lib/prisma'
import bcrypt from 'bcryptjs'

async function createTestUser() {
  try {
    console.log('🔍 Checking existing users...')
    const userCount = await prisma.user.count()
    console.log(`Found ${userCount} users in database`)
    
    if (userCount === 0) {
      console.log('\n🏗️ Creating test user...')
      
      // Get a project-city combination
      const projectCity = await prisma.projectCity.findFirst({
        include: {
          project: true,
          city: true
        }
      })
      
      if (!projectCity) {
        console.error('❌ No project-city combinations found. Run create-minimal-demo.ts first.')
        return
      }
      
      console.log(`Using tenant: ${projectCity.project.name} in ${projectCity.city.name}`)
      
      // Hash password
      const hashedPassword = await bcrypt.hash('testpassword123', 12)
      
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test@perfectit.nl',
          username: 'test.user',
          firstName: 'Test',
          lastName: 'User',
          password: hashedPassword,
          role: 'USER',
          projectCityId: projectCity.id,
          phone: '+31612345678'
        }
      })
      
      console.log(`✅ Created test user: ${user.username} (${user.email})`)
      console.log(`   Project: ${projectCity.project.name}`)
      console.log(`   City: ${projectCity.city.name}`)
      console.log(`   Password: testpassword123`)
      
    } else {
      console.log('✅ Users already exist in database')
      
      // Show first user for reference
      const firstUser = await prisma.user.findFirst({
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })
      
      if (firstUser) {
        console.log(`\nExample user: ${firstUser.username}`)
        console.log(`Project: ${firstUser.projectCity?.project?.name || 'None'}`)
        console.log(`City: ${firstUser.projectCity?.city?.name || 'None'}`)
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()