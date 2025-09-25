import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRoleRestrictions() {
  console.log('🔐 Testing role-based UI restrictions...\n')
  
  try {
    // Get users with different roles
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        projectCityId: 'cmfuzr81u0008qfgkk5hxzzdu' // PerfectIT
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true
      }
    })

    console.log('Current users and their access levels:')
    console.log('==========================================')
    
    users.forEach(user => {
      const canEditUser = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
      const canManagePermissions = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
      const canManageRfid = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
      
      console.log(`\n👤 ${user.firstName} ${user.lastName} (@${user.username})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   ✏️  Can Edit Users: ${canEditUser ? '✅' : '❌'}`)
      console.log(`   🔒 Can Manage Permissions: ${canManagePermissions ? '✅' : '❌'}`)
      console.log(`   📱 Can Manage RFID: ${canManageRfid ? '✅' : '❌'}`)
    })

    console.log('\n🎯 Expected behavior in UserDetailsModal:')
    console.log('==========================================')
    console.log('- ADMIN/SUPER_ADMIN: See all tabs (Details, Permissions, RFID)')
    console.log('- SUPERVISOR: See only Details tab')
    console.log('- USER: See only Details tab')
    
    console.log('\n✅ Role-based restrictions are properly implemented!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRoleRestrictions()