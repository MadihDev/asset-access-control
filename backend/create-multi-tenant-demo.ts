import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createMultiTenantDemo() {
  console.log('🏢 Creating Multi-Tenant Demo Data...\n')
  
  // Create PerfectIT project
  const perfectIT = await prisma.project.upsert({
    where: { slug: 'perfectit' },
    create: { 
      name: 'PerfectIT Solutions', 
      slug: 'perfectit',
      isActive: true 
    },
    update: {},
  })
  console.log(`✅ Created project: ${perfectIT.name}`)

  // Create AcmeCorp project
  const acmeCorp = await prisma.project.upsert({
    where: { slug: 'acmecorp' },
    create: { 
      name: 'Acme Corporation', 
      slug: 'acmecorp',
      isActive: true 
    },
    update: {},
  })
  console.log(`✅ Created project: ${acmeCorp.name}`)

  // Get some cities
  const cities = await prisma.city.findMany()
  const amsterdam = cities.find(c => c.name === 'Amsterdam')!
  const rotterdam = cities.find(c => c.name === 'Rotterdam')!
  const utrecht = cities.find(c => c.name === 'Utrecht')!

  // Create project-city relationships for PerfectIT
  const perfectIT_Amsterdam = await prisma.projectCity.upsert({
    where: { 
      projectId_cityId: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      }
    },
    create: {
      projectId: perfectIT.id,
      cityId: amsterdam.id
    },
    update: {}
  })
  
  const perfectIT_Rotterdam = await prisma.projectCity.upsert({
    where: { 
      projectId_cityId: {
        projectId: perfectIT.id,
        cityId: rotterdam.id
      }
    },
    create: {
      projectId: perfectIT.id,
      cityId: rotterdam.id
    },
    update: {}
  })

  // Create project-city relationships for AcmeCorp
  const acme_Amsterdam = await prisma.projectCity.upsert({
    where: { 
      projectId_cityId: {
        projectId: acmeCorp.id,
        cityId: amsterdam.id
      }
    },
    create: {
      projectId: acmeCorp.id,
      cityId: amsterdam.id
    },
    update: {}
  })

  const acme_Utrecht = await prisma.projectCity.upsert({
    where: { 
      projectId_cityId: {
        projectId: acmeCorp.id,
        cityId: utrecht.id
      }
    },
    create: {
      projectId: acmeCorp.id,
      cityId: utrecht.id
    },
    update: {}
  })

  console.log('✅ Created project-city relationships')

  // Create users for different tenants
  const hashedPassword = await bcrypt.hash('Password123!', 10)

  // PerfectIT users
  await prisma.user.upsert({
    where: { username: 'perfectit_admin' },
    create: {
      username: 'perfectit_admin',
      email: 'admin@perfectit.com',
      firstName: 'Perfect',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      cityId: amsterdam.id,
      projectCityId: perfectIT_Amsterdam.id
    },
    update: {}
  })

  await prisma.user.upsert({
    where: { username: 'perfectit_user' },
    create: {
      username: 'perfectit_user',
      email: 'user@perfectit.com',
      firstName: 'Perfect',
      lastName: 'User',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      cityId: rotterdam.id,
      projectCityId: perfectIT_Rotterdam.id
    },
    update: {}
  })

  // AcmeCorp users (same usernames to test isolation!)
  await prisma.user.upsert({
    where: { username: 'acme_admin' },
    create: {
      username: 'acme_admin', 
      email: 'admin@acme.com',
      firstName: 'Acme',
      lastName: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      cityId: amsterdam.id,
      projectCityId: acme_Amsterdam.id
    },
    update: {}
  })

  await prisma.user.upsert({
    where: { username: 'acme_user' },
    create: {
      username: 'acme_user',
      email: 'user@acme.com', 
      firstName: 'Acme',
      lastName: 'User',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      cityId: utrecht.id,
      projectCityId: acme_Utrecht.id
    },
    update: {}
  })

  console.log('✅ Created tenant-specific users')

  // Create tenant-specific addresses and locks
  // PerfectIT Amsterdam Office
  const perfectIT_address = await prisma.address.create({
    data: {
      street: 'PerfectIT Headquarters',
      number: '100',
      zipCode: '1001AB',
      cityId: amsterdam.id,
      projectCityId: perfectIT_Amsterdam.id
    }
  })

  await prisma.lock.create({
    data: {
      name: 'PerfectIT Main Entrance',
      description: 'Main office entrance',
      deviceId: 'PERFECTIT_MAIN_001',
      secretKey: 'perfectit_secret_key_001',
      lockType: 'DOOR',
      isActive: true,
      isOnline: true,
      addressId: perfectIT_address.id,
      projectCityId: perfectIT_Amsterdam.id
    }
  })

  // AcmeCorp Amsterdam Office
  const acme_address = await prisma.address.create({
    data: {
      street: 'Acme Corporate Center',
      number: '200', 
      zipCode: '1002AB',
      cityId: amsterdam.id,
      projectCityId: acme_Amsterdam.id
    }
  })

  await prisma.lock.create({
    data: {
      name: 'Acme Main Entrance',
      description: 'Main office entrance',
      deviceId: 'ACME_MAIN_001',
      secretKey: 'acme_secret_key_001',
      lockType: 'DOOR',
      isActive: true,
      isOnline: true,
      addressId: acme_address.id,
      projectCityId: acme_Amsterdam.id
    }
  })

  console.log('✅ Created tenant-specific addresses and locks')

  console.log('\n🎉 Multi-Tenant Demo Data Created!')
  console.log('\n📋 New Login Credentials:')
  console.log('🏢 PerfectIT Solutions:')
  console.log('  • Admin: project=perfectit, city=Amsterdam, username=perfectit_admin, password=password123')
  console.log('  • User:  project=perfectit, city=Rotterdam, username=perfectit_user, password=password123')
  console.log('\n🏢 Acme Corporation:')
  console.log('  • Admin: project=acmecorp, city=Amsterdam, username=acme_admin, password=password123')
  console.log('  • User:  project=acmecorp, city=Utrecht, username=acme_user, password=password123')

  await prisma.$disconnect()
}

createMultiTenantDemo().catch(console.error)