/**
 * CLEAN DEMO DATA SETUP FOR MULTI-TENANT SECURITY TESTING
 * 
 * Creates fresh demo data with alphanumeric identifiers for reliable testing
 * Run: npx ts-node setup-demo-data.ts
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Clean alphanumeric demo data structure
const DEMO_DATA = {
  // Cities with simple alphanumeric IDs
  cities: [
    { id: 'city1', name: 'Amsterdam', country: 'Netherlands' },
    { id: 'city2', name: 'Rotterdam', country: 'Netherlands' },
    { id: 'city3', name: 'Utrecht', country: 'Netherlands' }
  ],
  
  // Projects with simple alphanumeric IDs
  projects: [
    { id: 'proj1', name: 'TechCorp Solutions', slug: 'techcorp' },
    { id: 'proj2', name: 'SafeAccess Ltd', slug: 'safeaccess' },
    { id: 'proj3', name: 'SecureBuildings Inc', slug: 'securebuildings' }
  ],
  
  // ProjectCity combinations with predictable IDs
  projectCities: [
    { id: 'pc1', projectId: 'proj1', cityId: 'city1' }, // TechCorp + Amsterdam
    { id: 'pc2', projectId: 'proj1', cityId: 'city2' }, // TechCorp + Rotterdam  
    { id: 'pc3', projectId: 'proj2', cityId: 'city2' }, // SafeAccess + Rotterdam
    { id: 'pc4', projectId: 'proj2', cityId: 'city3' }, // SafeAccess + Utrecht
    { id: 'pc5', projectId: 'proj3', cityId: 'city1' }, // SecureBuildings + Amsterdam
  ],
  
  // Test users for each tenant
  users: [
    {
      id: 'user1',
      email: 'admin@techcorp.com',
      username: 'techcorp_admin',
      firstName: 'Tech',
      lastName: 'Admin',
      password: 'demo123', // Will be hashed
      role: UserRole.ADMIN,
      projectCityId: 'pc1', // TechCorp + Amsterdam
      phone: '+31612345001'
    },
    {
      id: 'user2', 
      email: 'user@techcorp.com',
      username: 'techcorp_user',
      firstName: 'Tech',
      lastName: 'User',
      password: 'demo123',
      role: UserRole.USER,
      projectCityId: 'pc1', // TechCorp + Amsterdam
      phone: '+31612345002'
    },
    {
      id: 'user3',
      email: 'admin@safeaccess.com',
      username: 'safeaccess_admin',
      firstName: 'Safe',
      lastName: 'Admin',
      password: 'demo123',
      role: UserRole.ADMIN,
      projectCityId: 'pc3', // SafeAccess + Rotterdam
      phone: '+31612345003'
    },
    {
      id: 'user4',
      email: 'admin@securebuildings.com',
      username: 'secure_admin',
      firstName: 'Secure',
      lastName: 'Admin',
      password: 'demo123',
      role: UserRole.ADMIN,
      projectCityId: 'pc5', // SecureBuildings + Amsterdam
      phone: '+31612345004'
    }
  ]
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...')
  
  // Delete in reverse dependency order - most dependent tables first
  await prisma.accessLog.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.rFIDKey.deleteMany()
  await prisma.lock.deleteMany()
  await prisma.location.deleteMany()
  await prisma.address.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.twoFactorChallenge.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.projectCity.deleteMany()
  await prisma.project.deleteMany()
  await prisma.city.deleteMany()
  
  console.log('✅ Database cleared')
}

async function createDemoData() {
  console.log('🚀 Creating demo data...')
  
  // 1. Create Cities
  console.log('📍 Creating cities...')
  for (const city of DEMO_DATA.cities) {
    await prisma.city.create({ data: city })
    console.log(`   ✅ City: ${city.name}`)
  }
  
  // 2. Create Projects
  console.log('🏢 Creating projects...')
  for (const project of DEMO_DATA.projects) {
    await prisma.project.create({ data: project })
    console.log(`   ✅ Project: ${project.name}`)
  }
  
  // 3. Create ProjectCity combinations
  console.log('🔗 Creating project-city combinations...')
  for (const pc of DEMO_DATA.projectCities) {
    await prisma.projectCity.create({ data: pc })
    const project = DEMO_DATA.projects.find(p => p.id === pc.projectId)
    const city = DEMO_DATA.cities.find(c => c.id === pc.cityId)
    console.log(`   ✅ Combination: ${project?.name} + ${city?.name} (${pc.id})`)
  }
  
  // 4. Create Users
  console.log('👥 Creating users...')
  for (const userData of DEMO_DATA.users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword
      }
    })
    
    const pc = DEMO_DATA.projectCities.find(p => p.id === userData.projectCityId)
    const project = DEMO_DATA.projects.find(p => p.id === pc?.projectId)
    const city = DEMO_DATA.cities.find(c => c.id === pc?.cityId)
    
    console.log(`   ✅ User: ${userData.username} (${project?.name} + ${city?.name})`)
  }
  
  console.log('🎉 Demo data created successfully!')
}

async function validateDemoData() {
  console.log('🔍 Validating demo data...')
  
  const projectCount = await prisma.project.count()
  const cityCount = await prisma.city.count()
  const projectCityCount = await prisma.projectCity.count()
  const userCount = await prisma.user.count()
  
  console.log(`📊 Summary:`)
  console.log(`   Projects: ${projectCount}`)
  console.log(`   Cities: ${cityCount}`)
  console.log(`   ProjectCity combinations: ${projectCityCount}`)
  console.log(`   Users: ${userCount}`)
  
  // Test a specific login combination
  console.log('\n🧪 Testing login data structure:')
  const testUser = await prisma.user.findUnique({
    where: { username: 'techcorp_admin' },
    include: {
      projectCity: {
        include: {
          project: true,
          city: true
        }
      }
    }
  })
  
  if (testUser?.projectCity) {
    console.log(`✅ Test User Login Data:`)
    console.log(`   Username: ${testUser.username}`)
    console.log(`   Email: ${testUser.email}`)
    console.log(`   Password: demo123 (plain text for testing)`)
    console.log(`   Project ID: ${testUser.projectCity.projectId}`)
    console.log(`   Project Name: ${testUser.projectCity.project.name}`)
    console.log(`   City Name: ${testUser.projectCity.city.name}`)
    console.log(`   ProjectCity ID: ${testUser.projectCityId}`)
  }
  
  console.log('✅ Validation complete!')
}

async function setupDemoData() {
  try {
    await clearDatabase()
    await createDemoData()
    await validateDemoData()
    
    console.log('\n🎯 DEMO DATA READY FOR TESTING!')
    console.log('================================================================')
    console.log('TEST CREDENTIALS:')
    console.log('• Username: techcorp_admin')
    console.log('• Email: admin@techcorp.com') 
    console.log('• Password: demo123')
    console.log('• Project ID: proj1')
    console.log('• City Name: Amsterdam')
    console.log('================================================================')
    
  } catch (error) {
    console.error('❌ Failed to setup demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export the demo data structure for use in tests
export { DEMO_DATA }

// Run setup if called directly
if (require.main === module) {
  setupDemoData()
    .then(() => {
      console.log('✅ Demo data setup complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Demo data setup failed:', error)
      process.exit(1)
    })
}