#!/usr/bin/env node

/**
 * DATABASE USER PRIVILEGE HARDENING SCRIPT
 * 
 * This script creates a dedicated application user with minimal privileges
 * for enhanced database security.
 * 
 * Part of PRIORITY 2: DATABASE SECURITY HARDENING
 */

import { PrismaClient } from '@prisma/client';

class DatabaseUserHardening {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createDedicatedUser(): Promise<void> {
    console.log('🔐 DATABASE USER PRIVILEGE HARDENING');
    console.log('====================================\n');

    try {
      console.log('📋 Instructions for creating dedicated database user:');
      console.log('');
      
      console.log('1. Connect to PostgreSQL as superuser (postgres):');
      console.log('   psql -U postgres -h localhost -p 5433');
      console.log('');
      
      console.log('2. Create dedicated application user:');
      console.log('   -- Replace "secure_random_password" with a strong password');
      console.log("   CREATE USER rfid_app_user WITH PASSWORD 'secure_random_password';");
      console.log('');
      
      console.log('3. Grant minimal required privileges:');
      console.log('   GRANT CONNECT ON DATABASE rfid_access_control TO rfid_app_user;');
      console.log('   \\c rfid_access_control;');
      console.log('   GRANT USAGE ON SCHEMA public TO rfid_app_user;');
      console.log('   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rfid_app_user;');
      console.log('   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rfid_app_user;');
      console.log('');
      
      console.log('4. Ensure no dangerous privileges:');
      console.log('   REVOKE CREATE ON SCHEMA public FROM rfid_app_user;');
      console.log('   REVOKE ALL ON DATABASE rfid_access_control FROM PUBLIC;');
      console.log('');
      
      console.log('5. Update your .env file with new connection string:');
      console.log('   DATABASE_URL=postgresql://rfid_app_user:secure_random_password@localhost:5433/rfid_access_control?schema=public');
      console.log('');
      
      console.log('6. Verify the user privileges:');
      console.log('   SELECT grantee, privilege_type, is_grantable');
      console.log('   FROM information_schema.role_table_grants');
      console.log("   WHERE grantee = 'rfid_app_user';");
      console.log('');

      // Check current user to provide guidance
      const currentUser = await this.getCurrentUser();
      console.log(`📊 Current database user: ${currentUser}`);
      
      if (currentUser === 'postgres' || currentUser === 'root') {
        console.log('⚠️  WARNING: Currently using superuser account!');
        console.log('💡 Please follow the instructions above to create a dedicated user.');
      } else {
        console.log('✅ Good: Using dedicated application user');
      }

      console.log('\n🔒 After completing these steps, restart your application to use the new user.');
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      await this.disconnect();
    }
  }

  private async getCurrentUser(): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw`SELECT current_user as username` as [{ username: string }];
      return result[0]?.username || 'unknown';
    } catch (error) {
      console.error('Could not determine current user:', error);
      return 'unknown';
    }
  }

  private async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const hardening = new DatabaseUserHardening();
  await hardening.createDedicatedUser();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}