import prisma from './src/lib/prisma'

async function checkCombinations() {
  try {
    const combos = await prisma.projectCity.findMany({
      include: {
        project: true,
        city: true
      }
    })
    
    console.log('Project-City Combinations:')
    combos.forEach((pc: any) => {
      console.log(`- ${pc.project.name} / ${pc.city.name} (projectId: ${pc.projectId})`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCombinations()