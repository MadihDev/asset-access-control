import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTenantData() {
  console.log('🔍 Checking Tenant Data...\n')
  
  // Check Projects
  const projects = await prisma.project.findMany()
  console.log('📋 Projects:')
  projects.forEach(p => console.log(`  - ${p.name} (${p.slug})`))
  
  // Check Cities
  const cities = await prisma.city.findMany()
  console.log('\n🏙️ Cities:')
  cities.forEach(c => console.log(`  - ${c.name}`))
  
  // Check Project-City relationships
  const projectCities = await prisma.projectCity.findMany({
    include: {
      project: true,
      city: true
    }
  })
  console.log('\n🔗 Project-City Relationships:')
  projectCities.forEach(pc => console.log(`  - ${pc.project.name} → ${pc.city.name}`))
  
  // Check Users with tenant assignments
  const users = await prisma.user.findMany({
    include: {
      city: true,
      projectCity: {
        include: {
          project: true,
          city: true
        }
      }
    }
  })
  console.log('\n👥 Users with Tenant Assignments:')
  users.forEach(u => {
    const tenant = u.projectCity 
      ? `${u.projectCity.project.name}_${u.projectCity.city.name}`
      : `Legacy: ${u.city?.name || 'No City'}`
    console.log(`  - ${u.username} (${u.role}) → ${tenant}`)
  })
  
  await prisma.$disconnect()
}

checkTenantData().catch(console.error)