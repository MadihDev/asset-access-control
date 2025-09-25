const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPerfectitUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        projectCity: {
          project: { name: 'PerfectIT Solutions' },
          city: { name: 'Amsterdam' }
        }
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        username: true
      }
    })
    
    console.log('PerfectIT Users:')
    users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.username}) - ${user.email}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerfectitUsers()