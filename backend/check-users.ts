import prisma from './src/lib/prisma'

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        role: true,
        projectCity: {
          select: {
            project: { select: { name: true } },
            city: { select: { name: true } }
          }
        }
      }
    })
    
    console.log('=== EXISTING USERS ===')
    if (users.length === 0) {
      console.log('No users found in database')
    } else {
      users.forEach(user => {
        const project = user.projectCity?.project?.name || 'No Project'
        const city = user.projectCity?.city?.name || 'No City'
        console.log(`- ${user.username} (${user.email}) - ${user.role} - ${project}/${city}`)
      })
    }
    
    console.log(`\nTotal users: ${users.length}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkUsers()