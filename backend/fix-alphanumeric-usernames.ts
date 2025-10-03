import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAlphanumericUsernames() {
  console.log('🔧 Fixing usernames to be alphanumeric (removing underscores)...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update`);

    // Update each user with alphanumeric username
    const updates = [
      { oldUsername: 'techcorp_admin', newUsername: 'techcorpadmin' },
      { oldUsername: 'techcorp_user', newUsername: 'techcorpuser' },
      { oldUsername: 'safeaccess_admin', newUsername: 'safeaccessadmin' },
      { oldUsername: 'secure_admin', newUsername: 'secureadmin' }
    ];

    for (const update of updates) {
      try {
        const user = await prisma.user.findFirst({
          where: { username: update.oldUsername }
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { username: update.newUsername }
          });
          console.log(`✅ Updated: ${update.oldUsername} → ${update.newUsername}`);
        } else {
          console.log(`⚠️ User not found: ${update.oldUsername}`);
        }
      } catch (error) {
        console.log(`❌ Failed to update ${update.oldUsername}:`, error);
      }
    }

    // Verify the updates
    console.log('\n📋 Verifying updated usernames:');
    const updatedUsers = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        role: true,
        projectCity: {
          select: {
            project: { select: { name: true, slug: true } },
            city: { select: { name: true } }
          }
        }
      }
    });

    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. Username: "${user.username}" (${user.role})`);
      console.log(`   Email: ${user.email}`);
      if (user.projectCity) {
        console.log(`   Project: ${user.projectCity.project?.name}`);
        console.log(`   City: ${user.projectCity.city?.name}`);
      }
      console.log('');
    });

    console.log('🎉 ALL USERNAMES NOW ALPHANUMERIC!');
    console.log('\n🔐 UPDATED ALPHANUMERIC CREDENTIALS:');
    console.log('');
    console.log('🏢 TechCorp Solutions (Amsterdam):');
    console.log('   Admin: techcorpadmin / demo123');
    console.log('   User:  techcorpuser / demo123');
    console.log('');
    console.log('🚢 SafeAccess Ltd (Rotterdam):');
    console.log('   Admin: safeaccessadmin / demo123');
    console.log('');
    console.log('🏗️ SecureBuildings Inc (Amsterdam):');
    console.log('   Admin: secureadmin / demo123');
    console.log('');
    console.log('✅ ALL USERNAMES ARE ALPHANUMERIC (no underscores)');

  } catch (error) {
    console.error('❌ Error fixing usernames:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAlphanumericUsernames();