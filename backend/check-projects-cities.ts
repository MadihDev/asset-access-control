import prisma from './src/lib/prisma'

async function checkProjectsAndCities() {
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, slug: true }
    })
    
    const cities = await prisma.city.findMany({
      select: { id: true, name: true, country: true }
    })
    
    const projectCities = await prisma.projectCity.findMany({
      select: {
        id: true,
        project: { select: { name: true, slug: true } },
        city: { select: { name: true, country: true } }
      }
    })
    
    console.log('=== PROJECTS ===')
    projects.forEach(p => console.log(`- ${p.name} (${p.slug}) - ID: ${p.id}`))
    
    console.log('\n=== CITIES ===')
    cities.forEach(c => console.log(`- ${c.name}, ${c.country} - ID: ${c.id}`))
    
    console.log('\n=== PROJECT-CITY COMBINATIONS ===')
    projectCities.forEach(pc => {
      console.log(`- ${pc.project.name} / ${pc.city.name} - ID: ${pc.id}`)
    })
    
    console.log(`\nProjects: ${projects.length}, Cities: ${cities.length}, Project-Cities: ${projectCities.length}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkProjectsAndCities()