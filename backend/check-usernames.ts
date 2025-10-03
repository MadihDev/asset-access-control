import prisma from './src/lib/prisma'

async function checkUsernames() {
  try {
    const users = await prisma.user.findMany({
      select: { username: true }
    })
    
    console.log('Current usernames in database:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. "${user.username}"`)
    })
    
    if (users.length === 0) {
      console.log('No users found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsernames()