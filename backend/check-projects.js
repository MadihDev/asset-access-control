const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProjects() {
  try {
    console.log('🔍 Checking all Projects and Cities...')
    
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, isActive: true }
    })
    
    const cities = await prisma.city.findMany({
      select: { id: true, name: true, isActive: true }
    })
    
    console.log('\n📁 Projects:')
    projects.forEach(p => console.log(`  - ${p.name} (${p.id}) - Active: ${p.isActive}`))
    
    console.log('\n🌍 Cities:')
    cities.forEach(c => console.log(`  - ${c.name} (${c.id}) - Active: ${c.isActive}`))
    
    // Show all ProjectCities
    const projectCities = await prisma.projectCity.findMany({
      include: {
        project: { select: { name: true } },
        city: { select: { name: true } }
      }
    })
    
    console.log('\n🏢 ProjectCities:')
    projectCities.forEach(pc => console.log(`  - ${pc.project.name} + ${pc.city.name} (${pc.id})`))
    
    // Check for any PerfectIT-like projects
    const perfectitProjects = await prisma.project.findMany({
      where: {
        name: { contains: 'Perfect', mode: 'insensitive' }
      }
    })
    
    console.log('\n🔎 Projects containing "Perfect":')
    perfectitProjects.forEach(p => console.log(`  - ${p.name} (${p.id})`))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProjects()