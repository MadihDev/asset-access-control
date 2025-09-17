// Simple database connection test
import { PrismaClient } from '@prisma/client';
import process from 'node:process';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5433/rfid_access_control"
    }
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Test the connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    const lockCount = await prisma.lock.count();
    console.log(`🔒 Found ${lockCount} locks in database`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
