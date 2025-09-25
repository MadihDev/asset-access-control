import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function addPerfectITUsers() {
  console.log('👥 Adding PerfectIT users with RFID cards...\n')
  
  try {
    // Get PerfectIT project and Amsterdam city
    const perfectIT = await prisma.project.findUnique({
      where: { slug: 'perfectit-solutions' }
    })
    
    if (!perfectIT) {
      console.error('❌ PerfectIT project not found. Please run create-multi-tenant-demo.ts first.')
      return
    }
    
    const amsterdam = await prisma.city.findFirst({
      where: { name: 'Amsterdam' }
    })
    
    if (!amsterdam) {
      console.error('❌ Amsterdam city not found.')
      return
    }
    
    // Get PerfectIT-Amsterdam project-city relationship
    const perfectIT_Amsterdam = await prisma.projectCity.findFirst({
      where: {
        projectId: perfectIT.id,
        cityId: amsterdam.id
      }
    })
    
    if (!perfectIT_Amsterdam) {
      console.error('❌ PerfectIT-Amsterdam relationship not found.')
      return
    }
    
    // Hash password that meets validation requirements
    const hashedPassword = await bcrypt.hash('Password123!', 10)
    
    // User 1: John Smith - Admin
    const johnSmith = await prisma.user.upsert({
      where: { username: 'john.smith' },
      create: {
        username: 'john.smith',
        email: 'john.smith@perfectit.com',
        firstName: 'John',
        lastName: 'Smith',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created user: ${johnSmith.firstName} ${johnSmith.lastName} (Admin)`)
    
    // User 2: Sarah Johnson - Supervisor
    const sarahJohnson = await prisma.user.upsert({
      where: { username: 'sarah.johnson' },
      create: {
        username: 'sarah.johnson',
        email: 'sarah.johnson@perfectit.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        password: hashedPassword,
        role: 'SUPERVISOR',
        isActive: true,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created user: ${sarahJohnson.firstName} ${sarahJohnson.lastName} (Supervisor)`)
    
    // User 3: Mike Davis - User
    const mikeDavis = await prisma.user.upsert({
      where: { username: 'mike.davis' },
      create: {
        username: 'mike.davis',
        email: 'mike.davis@perfectit.com',
        firstName: 'Mike',
        lastName: 'Davis',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        projectCityId: perfectIT_Amsterdam.id
      },
      update: {
        projectCityId: perfectIT_Amsterdam.id
      }
    })
    console.log(`✅ Created user: ${mikeDavis.firstName} ${mikeDavis.lastName} (User)`)
    
    console.log('\n🏷️ Creating RFID cards...\n')
    
    // RFID Card 1: John Smith
    const johnCard = await prisma.rFIDKey.upsert({
      where: { cardId: 'CARD001-JOHN' },
      create: {
        cardId: 'CARD001-JOHN',
        name: 'John Smith - Admin Card',
        isActive: true,
        userId: johnSmith.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      update: {
        userId: johnSmith.id,
        isActive: true
      }
    })
    console.log(`✅ Created RFID card: ${johnCard.cardId} for ${johnSmith.firstName} ${johnSmith.lastName}`)
    
    // RFID Card 2: Sarah Johnson
    const sarahCard = await prisma.rFIDKey.upsert({
      where: { cardId: 'CARD002-SARAH' },
      create: {
        cardId: 'CARD002-SARAH',
        name: 'Sarah Johnson - Supervisor Card',
        isActive: true,
        userId: sarahJohnson.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      update: {
        userId: sarahJohnson.id,
        isActive: true
      }
    })
    console.log(`✅ Created RFID card: ${sarahCard.cardId} for ${sarahJohnson.firstName} ${sarahJohnson.lastName}`)
    
    // RFID Card 3: Mike Davis
    const mikeCard = await prisma.rFIDKey.upsert({
      where: { cardId: 'CARD003-MIKE' },
      create: {
        cardId: 'CARD003-MIKE',
        name: 'Mike Davis - User Card',
        isActive: true,
        userId: mikeDavis.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      update: {
        userId: mikeDavis.id,
        isActive: true
      }
    })
    console.log(`✅ Created RFID card: ${mikeCard.cardId} for ${mikeDavis.firstName} ${mikeDavis.lastName}`)
    
    console.log('\n🎉 Successfully added PerfectIT users with RFID cards!')
    console.log('\n📋 Summary:')
    console.log('┌─────────────────┬──────────────────────────────┬─────────────┬──────────────────┐')
    console.log('│ Name            │ Email                        │ Role        │ RFID Card        │')
    console.log('├─────────────────┼──────────────────────────────┼─────────────┼──────────────────┤')
    console.log(`│ John Smith      │ john.smith@perfectit.com     │ ADMIN       │ CARD001-JOHN     │`)
    console.log(`│ Sarah Johnson   │ sarah.johnson@perfectit.com  │ SUPERVISOR  │ CARD002-SARAH    │`)
    console.log(`│ Mike Davis      │ mike.davis@perfectit.com     │ USER        │ CARD003-MIKE     │`)
    console.log('└─────────────────┴──────────────────────────────┴─────────────┴──────────────────┘')
    console.log('\n🔐 All users have password: Password123!')
    console.log('🏢 All users are assigned to PerfectIT project in Amsterdam')
    console.log('📅 All RFID cards expire in 1 year')
    
  } catch (error) {
    console.error('❌ Error adding users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addPerfectITUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })