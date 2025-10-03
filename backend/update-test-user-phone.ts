// update-test-user-phone.ts
// Script to update the test user's phone number for 2FA testing

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function updatePhoneNumber() {
  try {
    console.log('📱 Update Test User Phone Number for 2FA\n');
    
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { username: 'testuser2fa' }
    });

    if (!testUser) {
      console.log('❌ Test user not found. Run complete-2fa-setup.ts first.');
      return;
    }

    console.log(`Current user: ${testUser.username} (${testUser.email})`);
    console.log(`Current phone: ${testUser.phone}\n`);

    const phoneNumber = await askQuestion('Enter your phone number (with country code, e.g., +1234567890): ');

    if (!phoneNumber.trim()) {
      console.log('❌ Phone number is required');
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      console.log('❌ Invalid phone number format. Use international format like +1234567890');
      return;
    }

    // Update the phone number
    const updatedUser = await prisma.user.update({
      where: { username: 'testuser2fa' },
      data: { phone: phoneNumber.trim() }
    });

    console.log('\n✅ Phone number updated successfully!');
    console.log(`New phone: ${updatedUser.phone}`);
    console.log('\n🧪 You can now test 2FA login with this phone number.');
    console.log('The system will send SMS verification codes to this number.');

  } catch (error) {
    console.error('❌ Error updating phone number:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
updatePhoneNumber().catch(console.error);