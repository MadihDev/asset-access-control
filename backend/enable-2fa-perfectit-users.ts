// enable-2fa-perfectit-users.ts
// Script to enable 2FA for Perfect IT users

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enable2FAForPerfectITUsers() {
  console.log('🔐 Enabling 2FA for Perfect IT Users...\n');

  try {
    // 1. Find Perfect IT users
    console.log('🔍 Finding Perfect IT users...');
    const perfectITUsers = await prisma.user.findMany({
      where: {
        username: {
          in: ['perfectitadmin', 'perfectituser']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true,
        role: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    });

    if (perfectITUsers.length === 0) {
      console.log('❌ No Perfect IT users found');
      return;
    }

    console.log(`✅ Found ${perfectITUsers.length} Perfect IT users`);
    
    // 2. Show current status
    console.log('\n📊 Current 2FA Status:');
    perfectITUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Phone: ${user.phone}`);
      console.log(`      2FA Enabled: ${user.twoFactorEnabled ? '✅ Yes' : '❌ No'}`);
      console.log(`      2FA Verified: ${user.twoFactorVerifiedAt ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    // 3. Enable 2FA for all Perfect IT users
    console.log('🔐 Enabling 2FA for Perfect IT users...');
    
    const updateResults = [];
    for (const user of perfectITUsers) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date() // Mark as verified
        }
      });

      updateResults.push(updatedUser);
      console.log(`✅ Enabled 2FA for ${user.username}`);
    }

    // 4. Verify the updates
    console.log('\n🔍 Verifying 2FA updates...');
    const verifiedUsers = await prisma.user.findMany({
      where: {
        username: {
          in: ['perfectitadmin', 'perfectituser']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true,
        role: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      }
    });

    console.log('📱 Updated 2FA Status:');
    verifiedUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.name} (${user.projectCity.city.name})`
        : 'No Project';
      
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project: ${projectInfo}`);
      console.log(`      Phone: ${user.phone}`);
      console.log(`      2FA Enabled: ${user.twoFactorEnabled ? '✅ YES' : '❌ NO'}`);
      console.log(`      2FA Verified: ${user.twoFactorVerifiedAt ? '✅ YES' : '❌ NO'}`);
      console.log(`      Verified At: ${user.twoFactorVerifiedAt?.toISOString() || 'N/A'}`);
      console.log('');
    });

    // 5. Show all users with 2FA enabled
    console.log('🔐 All Users with 2FA Enabled:');
    const all2FAUsers = await prisma.user.findMany({
      where: {
        twoFactorEnabled: true
      },
      select: {
        username: true,
        phone: true,
        role: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      },
      orderBy: { role: 'asc' }
    });

    all2FAUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.slug}/${user.projectCity.city.name}`
        : 'No Project';
      
      console.log(`   ${index + 1}. ${user.username}`);
      console.log(`      Phone: ${user.phone}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project/City: ${projectInfo}`);
      console.log('');
    });

    console.log('🎉 2FA Enabled for Perfect IT Users Successfully!');
    console.log('=' .repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   Users Updated: ${updateResults.length}`);
    console.log(`   Total 2FA Users: ${all2FAUsers.length}`);
    console.log('\n🧪 Test 2FA Login for Perfect IT Users:');
    
    verifiedUsers.forEach(user => {
      const projectSlug = user.projectCity?.project.slug || 'unknown';
      const cityName = user.projectCity?.city.name || 'unknown';
      
      console.log(`\n   ${user.username}:`);
      console.log('   POST http://localhost:5000/api/auth/login');
      console.log('   {');
      console.log(`     "username": "${user.username}",`);
      console.log('     "password": "PerfectIT123!",');
      console.log(`     "projectId": "${projectSlug}",`);
      console.log(`     "cityName": "${cityName}"`);
      console.log('   }');
      console.log(`   SMS will be sent to: ${user.phone}`);
    });

    console.log('\n✅ All Perfect IT users now have 2FA enabled!');

  } catch (error) {
    console.error('❌ Error enabling 2FA:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
enable2FAForPerfectITUsers().catch(console.error);