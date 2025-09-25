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

async function testCardRevocationImpact() {
  console.log('🔐 TESTING CARD REVOCATION PHYSICAL ACCESS IMPACT');
  console.log('=================================================\n');
  
  let adminToken, testUser;
  let testCardId;
  
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
    
    // === STEP 1: VERIFY USER HAS LOCK PERMISSIONS ===
    console.log('1️⃣ VERIFY: User lock permissions');
    console.log('-------------------------------');
    
    const permissions = await prisma.userPermission.findMany({
      where: { 
        userId: testUser.id,
        canAccess: true
      },
      include: {
        lock: {
          select: {
            id: true,
            name: true,
            deviceId: true,
            isActive: true
          }
        }
      }
    });
    
    console.log(`User has access permissions for ${permissions.length} locks:`);
    permissions.forEach(perm => {
      console.log(`   - ${perm.lock.name} (${perm.lock.deviceId}): ${perm.canAccess ? 'ALLOWED' : 'DENIED'}`);
    });
    
    if (permissions.length === 0) {
      console.log('❌ Test user has no lock permissions - cannot test access impact');
      return;
    }
    
    // === STEP 2: ASSIGN RFID CARD TO USER ===
    console.log('\n2️⃣ ASSIGN: RFID card to user');
    console.log('----------------------------');
    
    testCardId = `ACCESS_TEST_CARD_${Date.now()}`;
    
    try {
      const assignResponse = await axios.post(`${API_BASE}/rfid/assign`, {
        cardId: testCardId,
        userId: testUser.id,
        name: 'Access Test Card',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, { headers: adminHeaders });
      
      console.log(`✅ Card assigned: ${testCardId}`);
      console.log(`   Status: ${assignResponse.data.data.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   Expiry: ${assignResponse.data.data.expiresAt}`);
      
    } catch (error) {
      console.log(`❌ Failed to assign card: ${error.response?.data?.error || error.message}`);
      return;
    }
    
    // === STEP 3: VERIFY PHYSICAL ACCESS CAPABILITY ===
    console.log('\n3️⃣ VERIFY: Physical access capability with active card');
    console.log('-----------------------------------------------------');
    
    // Simulate physical access checks for each permitted lock
    console.log('Simulating physical access attempts...');
    
    for (const perm of permissions) {
      // Check if the RFID card would grant access to this lock
      const accessCheck = await prisma.rFIDKey.findFirst({
        where: {
          cardId: testCardId,
          userId: testUser.id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          user: {
            include: {
              permissions: {
                where: {
                  lockId: perm.lockId,
                  canAccess: true,
                  OR: [
                    { validTo: null },
                    { validTo: { gt: new Date() } }
                  ]
                }
              }
            }
          }
        }
      });
      
      const hasPhysicalAccess = accessCheck && accessCheck.user.permissions.length > 0;
      
      console.log(`   🔒 ${perm.lock.name}: ${hasPhysicalAccess ? '🟢 ACCESS GRANTED' : '🔴 ACCESS DENIED'}`);
      
      if (hasPhysicalAccess) {
        console.log(`      └─ Card: ${testCardId} + Permission: Valid`);
      }
    }
    
    // === STEP 4: REVOKE THE RFID CARD ===
    console.log('\n4️⃣ REVOKE: RFID card');
    console.log('-------------------');
    
    try {
      const revokeResponse = await axios.post(`${API_BASE}/rfid/revoke`, {
        cardId: testCardId
      }, { headers: adminHeaders });
      
      console.log(`✅ Card revoked: ${testCardId}`);
      console.log(`   Status: ${revokeResponse.data.data.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   Revoked at: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.log(`❌ Failed to revoke card: ${error.response?.data?.error || error.message}`);
      return;
    }
    
    // === STEP 5: VERIFY IMMEDIATE ACCESS LOSS ===
    console.log('\n5️⃣ VERIFY: Immediate physical access loss');
    console.log('----------------------------------------');
    
    console.log('Re-simulating physical access attempts after card revocation...');
    
    let accessLostCount = 0;
    
    for (const perm of permissions) {
      // Re-check if the RFID card would grant access to this lock
      const accessCheck = await prisma.rFIDKey.findFirst({
        where: {
          cardId: testCardId,
          userId: testUser.id,
          isActive: true, // This should now be false
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          user: {
            include: {
              permissions: {
                where: {
                  lockId: perm.lockId,
                  canAccess: true,
                  OR: [
                    { validTo: null },
                    { validTo: { gt: new Date() } }
                  ]
                }
              }
            }
          }
        }
      });
      
      const hasPhysicalAccess = accessCheck && accessCheck.user.permissions.length > 0;
      
      console.log(`   🔒 ${perm.lock.name}: ${hasPhysicalAccess ? '🔴 STILL HAS ACCESS (ERROR!)' : '🟢 ACCESS REVOKED'}`);
      
      if (!hasPhysicalAccess) {
        accessLostCount++;
        console.log(`      └─ Card: REVOKED + Permission: Valid but no physical access`);
      } else {
        console.log(`      └─ ERROR: Physical access still possible despite card revocation!`);
      }
    }
    
    // === STEP 6: DATABASE VERIFICATION ===
    console.log('\n6️⃣ VERIFY: Database state consistency');
    console.log('------------------------------------');
    
    // Check card status in database
    const cardInDb = await prisma.rFIDKey.findUnique({
      where: { cardId: testCardId },
      select: {
        id: true,
        cardId: true,
        isActive: true,
        userId: true,
        expiresAt: true,
        updatedAt: true
      }
    });
    
    console.log('Card status in database:');
    console.log(`   Card ID: ${cardInDb.cardId}`);
    console.log(`   Active: ${cardInDb.isActive}`);
    console.log(`   User ID: ${cardInDb.userId}`);
    console.log(`   Last Updated: ${cardInDb.updatedAt}`);
    
    // Check if user still has any active cards
    const userActiveCards = await prisma.rFIDKey.findMany({
      where: {
        userId: testUser.id,
        isActive: true
      }
    });
    
    console.log(`\nUser's remaining active cards: ${userActiveCards.length}`);
    if (userActiveCards.length > 0) {
      console.log('⚠️  WARNING: User still has other active cards!');
      userActiveCards.forEach(card => {
        console.log(`   - ${card.cardId} (Active: ${card.isActive})`);
      });
    } else {
      console.log('✅ CONFIRMED: User has no active cards remaining');
    }
    
    // === STEP 7: PERMISSION STATUS CHECK ===
    console.log('\n7️⃣ VERIFY: Permission status (should remain valid)');
    console.log('-------------------------------------------------');
    
    const currentPermissions = await prisma.userPermission.findMany({
      where: { userId: testUser.id },
      include: {
        lock: {
          select: {
            name: true,
            deviceId: true
          }
        }
      }
    });
    
    console.log('User permission status (logical permissions should remain):');
    currentPermissions.forEach(perm => {
      const isValid = perm.canAccess && (perm.validTo === null || perm.validTo > new Date());
      console.log(`   🔑 ${perm.lock.name}: ${isValid ? 'PERMISSION VALID' : 'PERMISSION INVALID'}`);
      console.log(`      └─ BUT: ${userActiveCards.length === 0 ? 'NO PHYSICAL ACCESS (no active card)' : 'PHYSICAL ACCESS POSSIBLE (has active card)'}`);
    });
    
    // === RESULTS ANALYSIS ===
    console.log('\n🎯 CARD REVOCATION IMPACT ANALYSIS');
    console.log('==================================');
    
    const totalPermissions = permissions.length;
    const successfulRevocations = accessLostCount;
    
    console.log(`📊 REVOCATION RESULTS:`);
    console.log(`   🔒 Total locks user had access to: ${totalPermissions}`);
    console.log(`   ✅ Physical access lost: ${successfulRevocations}/${totalPermissions}`);
    console.log(`   ❌ Physical access retained: ${totalPermissions - successfulRevocations}/${totalPermissions}`);
    console.log(`   🗃️ Logical permissions unchanged: ${currentPermissions.length} (as expected)`);
    
    console.log(`\n📋 SECURITY MODEL VERIFICATION:`);
    console.log(`   🔑 Logical Permissions: PERSISTENT (remain in database)`);
    console.log(`   🗝️  Physical Access Method: ${userActiveCards.length === 0 ? 'REMOVED (no active card)' : 'STILL AVAILABLE (active cards exist)'}`);
    console.log(`   🚪 Actual Door Access: ${userActiveCards.length === 0 ? 'BLOCKED' : 'POSSIBLE'}`);
    
    console.log(`\n🎯 REQUIREMENT COMPLIANCE:`);
    if (successfulRevocations === totalPermissions && userActiveCards.length === 0) {
      console.log(`✅ FULLY COMPLIANT: Card revocation immediately removed physical access`);
      console.log(`✅ ONE-CARD MODEL: Single card provided access to all locks`);
      console.log(`✅ REVOCATION IMPACT: Removing card blocked all physical access`);
      console.log(`✅ PERMISSION MODEL: Logical permissions preserved for future card assignment`);
    } else {
      console.log(`❌ NON-COMPLIANT: Issues detected with revocation impact`);
      if (successfulRevocations < totalPermissions) {
        console.log(`   - Physical access not fully revoked (${totalPermissions - successfulRevocations} locks still accessible)`);
      }
      if (userActiveCards.length > 0) {
        console.log(`   - User still has ${userActiveCards.length} active cards`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test framework error:', error);
  } finally {
    // Cleanup
    if (testCardId) {
      try {
        await axios.post(`${API_BASE}/rfid/revoke`, { cardId: testCardId }, { 
          headers: { Authorization: `Bearer ${adminToken}` } 
        });
        console.log(`\n🧹 Cleanup: Test card ${testCardId} revoked`);
      } catch (error) {
        console.log(`⚠️  Cleanup warning: ${error.response?.data?.error || error.message}`);
      }
    }
    
    await prisma.$disconnect();
  }
}

testCardRevocationImpact();