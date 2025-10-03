import prisma from './src/lib/prisma'

async function checkUsers() {
  try {
    const userCount = await prisma.user.count()
    console.log('🔍 Users in database:', userCount)
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })
      
      console.log('\nFirst 5 users:')
      users.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - Project: ${user.projectCity?.project?.name || 'None'}, City: ${user.projectCity?.city?.name || 'None'}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()