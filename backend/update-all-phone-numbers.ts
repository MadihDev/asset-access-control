// update-all-phone-numbers.ts
// Script to update all user phone numbers to Moroccan numbers

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAllPhoneNumbers() {
  console.log('📱 Updating All User Phone Numbers to Moroccan Numbers...\n');

  // The two Moroccan phone numbers provided
  const phoneNumbers = ['+212606475149', '+212727817167'];

  try {
    // 1. Get all users in the system
    console.log('🔍 Finding all users in the system...');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
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

    console.log(`✅ Found ${allUsers.length} users in the system`);

    if (allUsers.length === 0) {
      console.log('No users found to update.');
      return;
    }

    // 2. Show current users and their phone numbers
    console.log('\n📊 Current Users and Phone Numbers:');
    allUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.name} (${user.projectCity.city.name})`
        : 'No Project';
      
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project: ${projectInfo}`);
      console.log(`      Current Phone: ${user.phone || 'Not set'}`);
      console.log('');
    });

    // 3. Update phone numbers (alternating between the two numbers)
    console.log('🔄 Updating phone numbers...');
    
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const phoneNumber = phoneNumbers[i % phoneNumbers.length]; // Alternate between the two numbers
      
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: phoneNumber }
      });

      console.log(`✅ Updated ${user.username}: ${phoneNumber}`);
    }

    // 4. Verify the updates
    console.log('\n🔍 Verifying updates...');
    const updatedUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
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

    console.log('\n📱 Updated Users and Phone Numbers:');
    updatedUsers.forEach((user, index) => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.name} (${user.projectCity.city.name})`
        : 'No Project';
      
      const phoneStatus = phoneNumbers.includes(user.phone!) ? '✅' : '❌';
      
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username})`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Project: ${projectInfo}`);
      console.log(`      Phone: ${user.phone} ${phoneStatus}`);
      console.log(`      2FA: ${user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
      console.log('');
    });

    // 5. Phone number distribution summary
    console.log('📊 Phone Number Distribution:');
    const phoneDistribution = updatedUsers.reduce((acc, user) => {
      const phone = user.phone!;
      acc[phone] = (acc[phone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(phoneDistribution).forEach(([phone, count]) => {
      console.log(`   ${phone}: ${count} users`);
    });

    console.log('\n🎉 All Phone Numbers Updated Successfully!');
    console.log('=' .repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   Total Users Updated: ${updatedUsers.length}`);
    console.log(`   Phone Numbers Used:`);
    console.log(`   • ${phoneNumbers[0]} (Moroccan)`);
    console.log(`   • ${phoneNumbers[1]} (Moroccan)`);
    console.log('\n📱 All users now have valid Moroccan phone numbers!');

    // 6. 2FA Ready users
    const twoFAEnabledUsers = updatedUsers.filter(user => user.twoFactorEnabled);
    console.log(`\n🔐 Users with 2FA Enabled: ${twoFAEnabledUsers.length}`);
    
    if (twoFAEnabledUsers.length > 0) {
      twoFAEnabledUsers.forEach(user => {
        console.log(`   • ${user.username}: ${user.phone}`);
      });
      console.log('\n📲 These users are ready for SMS 2FA testing!');
    }

    // 7. Show test credentials for major users
    console.log('\n🧪 Key Test Users with Moroccan Phone Numbers:');
    
    const keyUsers = updatedUsers.filter(user => 
      ['testuser2fa', 'perfectitadmin', 'perfectituser'].includes(user.username)
    );

    keyUsers.forEach(user => {
      const projectInfo = user.projectCity 
        ? `${user.projectCity.project.slug}/${user.projectCity.city.name}`
        : 'No Project';
      
      console.log(`   Username: ${user.username}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Project/City: ${projectInfo}`);
      console.log(`   2FA: ${user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error updating phone numbers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateAllPhoneNumbers().catch(console.error);