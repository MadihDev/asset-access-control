import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('🔍 Checking database contents...\n')
  
  try {
    // Check projects
    const projects = await prisma.project.findMany()
    console.log('📁 Projects:')
    projects.forEach(project => {
      console.log(`  • ${project.name} (slug: ${project.slug})`)
    })
    
    // Check cities
    const cities = await prisma.city.findMany()
    console.log('\n🏙️ Cities:')
    cities.forEach(city => {
      console.log(`  • ${city.name}`)
    })
    
    // Check existing users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })
    console.log('\n👥 Existing Users:')
    users.forEach(user => {
      console.log(`  • ${user.firstName} ${user.lastName} (${user.username}) - ${user.role}`)
    })
    
    // Check RFID cards
    const rfidCards = await prisma.rFIDKey.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    console.log('\n🏷️ RFID Cards:')
    rfidCards.forEach(card => {
      console.log(`  • ${card.cardId} - ${card.user.firstName} ${card.user.lastName}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()