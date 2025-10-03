import prisma from './src/lib/prisma'

async function checkUserCredentials() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        password: true, // This will show the hash
        projectCity: {
          select: {
            project: { select: { name: true, slug: true } },
            city: { select: { name: true } }
          }
        }
      }
    })
    
    console.log('=== USER CREDENTIALS ===')
    users.forEach(user => {
      const project = user.projectCity?.project?.slug || 'no-project'
      const city = user.projectCity?.city?.name || 'no-city'
      console.log(`Username: ${user.username}`)
      console.log(`Email: ${user.email}`)
      console.log(`Role: ${user.role}`)
      console.log(`Project: ${project}`)
      console.log(`City: ${city}`)
      console.log(`Password Hash: ${user.password.substring(0, 30)}...`)
      console.log('---')
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkUserCredentials()