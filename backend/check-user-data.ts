/**
 * Simple debug script to check user data
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUserData() {
  console.log('🔍 Checking user data in database...')
  
  const users = await prisma.user.findMany({
    include: {
      projectCity: {
        include: {
          project: true,
          city: true
        }
      }
    }
  })
  
  console.log('👥 Users in database:')
  users.forEach(user => {
    console.log(`  ${user.username} (${user.email})`)
    console.log(`    ProjectCity ID: ${user.projectCityId}`)
    if (user.projectCity) {
      console.log(`    Project: ${user.projectCity.project.name} (${user.projectCity.project.slug})`)
      console.log(`    City: ${user.projectCity.city.name}`)
    }
    console.log(`    Role: ${user.role}`)
    console.log()
  })
  
  // Test project city resolution
  console.log('🔍 Testing project city resolution...')
  const projectCities = await prisma.projectCity.findMany({
    include: {
      project: true,
      city: true
    }
  })
  
  console.log('🔗 Project-City combinations:')
  projectCities.forEach(pc => {
    console.log(`  ${pc.id}: ${pc.project.name} (${pc.project.slug}) + ${pc.city.name}`)
  })
  
  await prisma.$disconnect()
}

checkUserData().catch(console.error)