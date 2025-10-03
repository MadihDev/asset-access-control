import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugLogin() {
  console.log('🔍 Debugging Login Issues...\n')
  
  // 1. Check ProjectCity combinations
  console.log('1️⃣ Available ProjectCity combinations:')
  const projectCities = await prisma.projectCity.findMany({
    include: {
      project: true,
      city: true
    }
  })
  
  projectCities.forEach(pc => {
    console.log(`   ${pc.project.name} (${pc.project.id}) + ${pc.city.name} = ${pc.id}`)
  })
  
  // 2. Check users and their projectCityId
  console.log('\n2️⃣ Users and their tenant assignments:')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      projectCityId: true,
      projectCity: {
        include: {
          project: true,
          city: true
        }
      }
    }
  })
  
  users.forEach(user => {
    console.log(`   ${user.username} (${user.email}):`)
    if (user.projectCity) {
      console.log(`     Tenant: ${user.projectCity.project.name} / ${user.projectCity.city.name}`)
      console.log(`     ProjectCityId: ${user.projectCityId}`)
      console.log(`     ProjectId needed: ${user.projectCity.project.id}`)
      console.log(`     CityName needed: ${user.projectCity.city.name}`)
    } else {
      console.log(`     No tenant assigned (projectCityId: ${user.projectCityId})`)
    }
    console.log()
  })
  
  // 3. Test the TenantService.resolveProjectCity method
  console.log('3️⃣ Testing TenantService.resolveProjectCity:')
  
  // Import TenantService
  const TenantService = (await import('./src/services/tenant.service')).default
  
  for (const pc of projectCities) {
    console.log(`   Testing: projectId=${pc.project.id}, cityName=${pc.city.name}`)
    try {
      const resolved = await TenantService.resolveProjectCity(pc.project.id, pc.city.name)
      console.log(`   ✅ Result: ${resolved?.projectCityId || 'null'}`)
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  await prisma.$disconnect()
}

debugLogin().catch(console.error)