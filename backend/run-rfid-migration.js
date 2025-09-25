const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔧 RUNNING RFID UNIQUE CONSTRAINT MIGRATION');
  console.log('==========================================\n');
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('./prisma/migrations/add_unique_active_rfid_per_user.sql', 'utf8');
    
    // Split into individual statements (rough approach)
    const statements = migrationSQL
      .split(/;\s*(?=\n|$)/)
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim());
    
    console.log('📋 BEFORE MIGRATION - Checking current state...');
    
    // Check current state
    const beforeMultiCards = await prisma.$queryRaw`
      SELECT 
        "userId",
        COUNT(*) as card_count,
        array_agg("cardId") as card_ids
      FROM "rfid_keys" 
      WHERE "isActive" = true 
      GROUP BY "userId" 
      HAVING COUNT(*) > 1
      ORDER BY card_count DESC;
    `;
    
    console.log(`Users with multiple active cards: ${beforeMultiCards.length}`);
    if (beforeMultiCards.length > 0) {
      beforeMultiCards.forEach(user => {
        console.log(`   - User ${user.userId}: ${user.card_count} cards`);
      });
    }
    
    console.log('\n🔄 RUNNING MIGRATION...');
    
    // Execute the cleanup first
    console.log('1. Cleaning up duplicate active cards...');
    
    // For each user with multiple active cards, keep the most recent one
    for (const user of beforeMultiCards) {
      // Get the most recent card
      const mostRecentCard = await prisma.rFIDKey.findFirst({
        where: {
          userId: user.userId,
          isActive: true
        },
        orderBy: { issuedAt: 'desc' }
      });
      
      if (mostRecentCard) {
        // Deactivate all other cards
        const deactivated = await prisma.rFIDKey.updateMany({
          where: {
            userId: user.userId,
            isActive: true,
            id: { not: mostRecentCard.id }
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });
        
        console.log(`   ✅ User ${user.userId}: Kept card ${mostRecentCard.cardId}, deactivated ${deactivated.count} others`);
      }
    }
    
    console.log('\n2. Creating unique constraint...');
    
    // Create the unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_rfid_keys_user_active_unique
      ON "rfid_keys" ("userId") 
      WHERE "isActive" = true;
    `);
    
    console.log('   ✅ Unique constraint created');
    
    console.log('\n📋 AFTER MIGRATION - Verifying results...');
    
    // Verify no duplicates remain
    const afterMultiCards = await prisma.$queryRaw`
      SELECT 
        "userId",
        COUNT(*) as card_count
      FROM "rfid_keys" 
      WHERE "isActive" = true 
      GROUP BY "userId" 
      HAVING COUNT(*) > 1;
    `;
    
    if (afterMultiCards.length === 0) {
      console.log('✅ SUCCESS: No users have multiple active cards');
    } else {
      console.log(`❌ ERROR: ${afterMultiCards.length} users still have multiple active cards`);
      throw new Error('Migration failed - duplicates remain');
    }
    
    // Check total active cards
    const totalActiveCards = await prisma.rFIDKey.count({
      where: { isActive: true }
    });
    
    const totalUsers = await prisma.user.count();
    
    console.log(`📊 Final state: ${totalActiveCards} active cards for ${totalUsers} total users`);
    
    console.log('\n🎯 MIGRATION COMPLETED SUCCESSFULLY');
    console.log('✅ Each user can now have only one active RFID card');
    console.log('🔒 Database constraint enforces the one-card-per-user rule');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();