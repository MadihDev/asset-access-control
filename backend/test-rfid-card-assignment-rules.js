const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

// Test credentials
const PERFECTIT_ADMIN = {
  username: 'perfectitadmin',
  password: 'password123',
  projectId: 'PerfectIT Solutions',
  cityName: 'Amsterdam'
};

async function testRFIDCardAssignmentRules() {
  console.log('🔐 TESTING RFID CARD ASSIGNMENT RULES');
  console.log('=====================================\n');
  
  let adminToken, testUser;
  
  try {
    // === SETUP: LOGIN AS ADMIN ===
    console.log('🔐 SETUP: Authenticating as admin...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, PERFECTIT_ADMIN);
    adminToken = adminLogin.data.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    // Get a test user from PerfectIT tenant
    const users = await axios.get(`${API_BASE}/user/with-permissions`, { headers: adminHeaders });
    testUser = users.data.data.find(u => u.role !== 'ADMIN');
    
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    
    console.log(`✅ Using test user: ${testUser.email} (${testUser.id})\n`);
    
    // === TEST 1: CHECK CURRENT RFID CARDS FOR USER ===
    console.log('1️⃣ CHECKING CURRENT RFID CARDS');
    console.log('------------------------------');
    
    const currentCards = await axios.get(`${API_BASE}/rfid?userId=${testUser.id}`, { headers: adminHeaders });
    console.log(`Current RFID cards for user: ${currentCards.data.data.length}`);
    
    if (currentCards.data.data.length > 0) {
      console.log('Current cards:');
      currentCards.data.data.forEach((card, index) => {
        console.log(`   ${index + 1}. Card ID: ${card.cardId}, Active: ${card.isActive}, Name: ${card.name || 'N/A'}`);
      });
    }
    
    // === TEST 2: TRY TO ASSIGN MULTIPLE CARDS TO SAME USER ===
    console.log('\n2️⃣ TESTING MULTIPLE CARD ASSIGNMENT');
    console.log('-----------------------------------');
    
    const testCardIds = [
      `TEST_CARD_${Date.now()}_1`,
      `TEST_CARD_${Date.now()}_2`,
      `TEST_CARD_${Date.now()}_3`
    ];
    
    const assignmentResults = [];
    
    for (let i = 0; i < testCardIds.length; i++) {
      const cardId = testCardIds[i];
      try {
        console.log(`Attempting to assign card ${i + 1}: ${cardId}`);
        
        const response = await axios.post(`${API_BASE}/rfid/assign`, {
          cardId,
          userId: testUser.id,
          name: `Test Card ${i + 1}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }, { headers: adminHeaders });
        
        assignmentResults.push({
          cardId,
          success: true,
          response: response.data
        });
        
        console.log(`✅ Successfully assigned card ${i + 1}`);
        
      } catch (error) {
        assignmentResults.push({
          cardId,
          success: false,
          error: error.response?.data || error.message
        });
        
        console.log(`❌ Failed to assign card ${i + 1}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // === TEST 3: CHECK FINAL CARD COUNT ===
    console.log('\n3️⃣ CHECKING FINAL CARD COUNT');
    console.log('----------------------------');
    
    const finalCards = await axios.get(`${API_BASE}/rfid?userId=${testUser.id}`, { headers: adminHeaders });
    console.log(`Final RFID cards for user: ${finalCards.data.data.length}`);
    
    if (finalCards.data.data.length > 0) {
      console.log('Final cards:');
      finalCards.data.data.forEach((card, index) => {
        console.log(`   ${index + 1}. Card ID: ${card.cardId}, Active: ${card.isActive}, Name: ${card.name || 'N/A'}`);
      });
    }
    
    // === TEST 4: DATABASE VERIFICATION ===
    console.log('\n4️⃣ DATABASE VERIFICATION');
    console.log('------------------------');
    
    const dbCards = await prisma.rFIDKey.findMany({
      where: { userId: testUser.id },
      select: {
        id: true,
        cardId: true,
        name: true,
        isActive: true,
        expiresAt: true,
        projectCityId: true
      }
    });
    
    console.log(`Database shows ${dbCards.length} cards for user ${testUser.id}:`);
    dbCards.forEach((card, index) => {
      console.log(`   ${index + 1}. ${card.cardId} (Active: ${card.isActive}, Tenant: ${card.projectCityId})`);
    });
    
    // === TEST 5: CHECK SCHEMA CONSTRAINTS ===
    console.log('\n5️⃣ SCHEMA CONSTRAINT ANALYSIS');
    console.log('-----------------------------');
    
    // Check if there's a unique constraint on userId in RFIDKey table
    const schemaInfo = await prisma.$queryRaw`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        confupdtype,
        confdeltype,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE t.relname = 'rfid_keys'
      AND n.nspname = 'public'
      ORDER BY conname;
    `;
    
    console.log('RFID Keys table constraints:');
    schemaInfo.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });
    
    // Check if there are multiple active cards per user across all users
    const multiCardUsers = await prisma.$queryRaw`
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
    
    console.log(`\nUsers with multiple active RFID cards: ${multiCardUsers.length}`);
    if (multiCardUsers.length > 0) {
      multiCardUsers.forEach(user => {
        console.log(`   - User ${user.userId}: ${user.card_count} cards (${user.card_ids.join(', ')})`);
      });
    }
    
    // === TEST 6: ACCESS LOGIC TEST ===
    console.log('\n6️⃣ ACCESS LOGIC VERIFICATION');
    console.log('----------------------------');
    
    // Check how access control works with multiple cards
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: testUser.id },
      include: {
        lock: {
          select: {
            id: true,
            name: true,
            deviceId: true
          }
        }
      }
    });
    
    console.log(`User has permissions for ${userPermissions.length} locks:`);
    userPermissions.forEach(perm => {
      console.log(`   - Lock: ${perm.lock.name} (${perm.lock.deviceId}), Access: ${perm.canAccess}`);
    });
    
    if (finalCards.data.data.length > 1) {
      console.log('\n⚠️  MULTIPLE CARDS DETECTED - Each card would provide access to ALL permitted locks');
      console.log('   This means the user has multiple physical access methods');
    } else if (finalCards.data.data.length === 1) {
      console.log('\n✅ SINGLE CARD - Card provides access to all permitted locks');
    } else {
      console.log('\n❌ NO CARDS - User has no physical access method');
    }
    
    // === CLEANUP: Remove test cards ===
    console.log('\n7️⃣ CLEANUP');
    console.log('----------');
    
    for (const result of assignmentResults) {
      if (result.success) {
        try {
          await axios.post(`${API_BASE}/rfid/revoke`, {
            cardId: result.cardId
          }, { headers: adminHeaders });
          console.log(`✅ Revoked test card: ${result.cardId}`);
        } catch (error) {
          console.log(`⚠️  Failed to revoke test card ${result.cardId}: ${error.response?.data?.error || error.message}`);
        }
      }
    }
    
    // === RESULTS SUMMARY ===
    console.log('\n🎯 RFID CARD ASSIGNMENT ANALYSIS');
    console.log('=================================');
    
    const successfulAssignments = assignmentResults.filter(r => r.success).length;
    const canHaveMultipleCards = successfulAssignments > 1;
    
    console.log(`📊 ASSIGNMENT RESULTS:`);
    console.log(`   ✅ Successful assignments: ${successfulAssignments}/${testCardIds.length}`);
    console.log(`   ❌ Failed assignments: ${testCardIds.length - successfulAssignments}/${testCardIds.length}`);
    console.log(`   🔗 Users with multiple cards in DB: ${multiCardUsers.length}`);
    
    console.log(`\n📋 CURRENT BEHAVIOR:`);
    if (canHaveMultipleCards) {
      console.log(`   🔴 MULTIPLE CARDS ALLOWED - User can have ${successfulAssignments} cards simultaneously`);
      console.log(`   🚨 SECURITY CONCERN - Multiple physical access methods per user`);
      console.log(`   ⚠️  REVOCATION COMPLEXITY - Need to revoke all cards to remove access`);
    } else {
      console.log(`   🟢 SINGLE CARD ENFORCED - User can only have one active card`);
      console.log(`   ✅ SECURITY GOOD - Single physical access method per user`);
      console.log(`   ✅ REVOCATION SIMPLE - Revoke one card removes all access`);
    }
    
    console.log(`\n🎯 RECOMMENDATION:`);
    if (canHaveMultipleCards) {
      console.log(`   📝 IMPLEMENT: Add unique constraint on (userId, isActive=true) in RFIDKey table`);
      console.log(`   📝 UPDATE: Modify assign logic to revoke existing active cards before assigning new one`);
      console.log(`   📝 ENSURE: Only one active RFID card per user for security and simplicity`);
    } else {
      console.log(`   ✅ CURRENT IMPLEMENTATION: Properly enforces one card per user`);
      console.log(`   ✅ SECURITY: Meets requirement for single card access`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRFIDCardAssignmentRules();