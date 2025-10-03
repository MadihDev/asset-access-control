// enable-2fa-all-users.ts
// Script to enable 2FA for ALL users in the system

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enable2FAForAllUsers() {
  console.log('🔐 Enabling 2FA for ALL Users in the System...\n');

  try {
    // 1. Find all users in the system
    console.log('🔍 Finding all users in the system...');
    const allUsers = await prisma.user.findMany({
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
        isActive: true,
        projectCity: {
          include: {
            project: true,
            city: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { username: 'asc' }
      ]
    });

    console.log(`✅ Found ${allUsers.length} users in the system`);
    
    // 2. Show current 2FA status for all users
    console.log('\n📊 Current 2FA Status for All Users:');
    allUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.name} (${user.projectCity.city.name})`
        : 'No Project';
      
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project: ${projectInfo}`);
      console.log(`      Phone: ${user.phone || 'Not set'}`);
      console.log(`      Active: ${user.isActive ? '✅' : '❌'}`);
      console.log(`      2FA Enabled: ${user.twoFactorEnabled ? '✅ Yes' : '❌ No'}`);
      console.log(`      2FA Verified: ${user.twoFactorVerifiedAt ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    // 3. Find users who don't have 2FA enabled
    const users2FADisabled = allUsers.filter(user => !user.twoFactorEnabled);
    const users2FAEnabled = allUsers.filter(user => user.twoFactorEnabled);

    console.log(`📊 2FA Status Summary:`);
    console.log(`   Users with 2FA Enabled: ${users2FAEnabled.length}`);
    console.log(`   Users with 2FA Disabled: ${users2FADisabled.length}`);
    console.log(`   Total Users: ${allUsers.length}`);

    if (users2FADisabled.length === 0) {
      console.log('\n🎉 All users already have 2FA enabled!');
      
      // Show all 2FA enabled users
      console.log('\n🔐 All Users with 2FA Enabled:');
      users2FAEnabled.forEach((user, index) => {
        const projectInfo = user.projectCity 
          ? `${user.projectCity.project.slug}/${user.projectCity.city.name}`
          : 'No Project';
        
        console.log(`   ${index + 1}. ${user.username}`);
        console.log(`      Phone: ${user.phone}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Project/City: ${projectInfo}`);
        console.log('');
      });
      
      return;
    }

    // 4. Enable 2FA for users who don't have it
    console.log(`\n🔐 Enabling 2FA for ${users2FADisabled.length} users...`);
    
    const updateResults = [];
    for (const user of users2FADisabled) {
      if (!user.phone) {
        console.log(`⚠️  Skipping ${user.username} - no phone number set`);
        continue;
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date()
        }
      });

      updateResults.push(updatedUser);
      console.log(`✅ Enabled 2FA for ${user.username} (${user.phone})`);
    }

    // 5. Final verification
    console.log('\n🔍 Final 2FA Status Check...');
    const finalUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
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
      },
      orderBy: [
        { role: 'asc' },
        { username: 'asc' }
      ]
    });

    console.log('📱 Final 2FA Status for All Users:');
    finalUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.name} (${user.projectCity.city.name})`
        : 'No Project';
      
      const status2FA = user.twoFactorEnabled ? '✅ ENABLED' : '❌ DISABLED';
      const phoneStatus = user.phone ? user.phone : '❌ NO PHONE';
      
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project: ${projectInfo}`);
      console.log(`      Phone: ${phoneStatus}`);
      console.log(`      2FA Status: ${status2FA}`);
      console.log('');
    });

    // 6. Summary statistics
    const final2FAEnabled = finalUsers.filter(user => user.twoFactorEnabled);
    const final2FADisabled = finalUsers.filter(user => !user.twoFactorEnabled);
    const usersWithoutPhone = finalUsers.filter(user => !user.phone);

    console.log('🎉 2FA Enablement Complete!');
    console.log('=' .repeat(50));
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Users: ${finalUsers.length}`);
    console.log(`   2FA Enabled: ${final2FAEnabled.length} ✅`);
    console.log(`   2FA Disabled: ${final2FADisabled.length} ${final2FADisabled.length === 0 ? '✅' : '❌'}`);
    console.log(`   Users without Phone: ${usersWithoutPhone.length} ${usersWithoutPhone.length === 0 ? '✅' : '⚠️'}`);

    console.log('\n📱 Phone Number Distribution:');
    const phoneDistribution = finalUsers.reduce((acc, user) => {
      const phone = user.phone || 'No Phone';
      acc[phone] = (acc[phone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(phoneDistribution).forEach(([phone, count]) => {
      const flag = phone.startsWith('+212') ? '🇲🇦' : '';
      console.log(`   ${phone} ${flag}: ${count} users`);
    });

    if (final2FAEnabled.length === finalUsers.length) {
      console.log('\n🎉 SUCCESS: All users now have 2FA enabled!');
      console.log('🔐 Your system is fully secured with 2FA for all users!');
    } else {
      console.log('\n⚠️  Some users still have 2FA disabled (likely due to missing phone numbers)');
    }

  } catch (error) {
    console.error('❌ Error enabling 2FA for all users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
enable2FAForAllUsers().catch(console.error);