import prisma from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function testPasswords() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'techcorpadminamsterdam' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Password hash starts with:', user.password.substring(0, 10));
    
    const testPasswords = ['password123', 'Password123!', 'admin', 'demo', 'test', 'techcorp123', 'amsterdam123'];
    
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      if (match) {
        console.log(`✅ Password is: "${pwd}"`);
        break;
      } else {
        console.log(`❌ Not: "${pwd}"`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswords();