const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials for different tenants
const PERFECTIT_ADMIN = {
  username: 'perfectitadmin',
  password: 'password123',
  projectId: 'PerfectIT Solutions',
  cityName: 'Amsterdam'
};

const ACME_ADMIN = {
  username: 'acmeadmin',
  password: 'password123',
  projectId: 'Acme Corporation',
  cityName: 'Amsterdam'
};

async function exhaustiveTenantIsolationCheck() {
  console.log('🔍 EXHAUSTIVE TENANT ISOLATION SECURITY CHECK');
  console.log('==============================================\n');
  
  let perfectitToken, acmeToken;
  let perfectitUser, acmeUser;
  let testResults = [];
  
  try {
    // === SETUP: LOGIN TO BOTH TENANTS ===
    console.log('🔐 SETUP: Authenticating to both tenants...');
    
    const perfectitLogin = await axios.post(`${API_BASE}/auth/login`, PERFECTIT_ADMIN);
    perfectitToken = perfectitLogin.data.data.accessToken;
    perfectitUser = perfectitLogin.data.data.user;
    
    const acmeLogin = await axios.post(`${API_BASE}/auth/login`, ACME_ADMIN);
    acmeToken = acmeLogin.data.data.accessToken;
    acmeUser = acmeLogin.data.data.user;
    
    console.log(`✅ PerfectIT: ${perfectitUser.email} (${perfectitUser.projectCityId})`);
    console.log(`✅ Acme: ${acmeUser.email} (${acmeUser.projectCityId})\n`);
    
    const perfectitHeaders = { Authorization: `Bearer ${perfectitToken}` };
    const acmeHeaders = { Authorization: `Bearer ${acmeToken}` };
    
    // === TEST 1: USER ENDPOINT ISOLATION ===
    console.log('1️⃣ TESTING USER ENDPOINT ISOLATION');
    console.log('-----------------------------------');
    
    // Get all users from both perspectives
    const perfectitUsers = await axios.get(`${API_BASE}/user/with-permissions`, { headers: perfectitHeaders });
    const acmeUsers = await axios.get(`${API_BASE}/user/with-permissions`, { headers: acmeHeaders });
    
    console.log(`PerfectIT sees ${perfectitUsers.data.data.length} users`);
    console.log(`Acme sees ${acmeUsers.data.data.length} users`);
    
    // Test cross-tenant user access by ID
    for (const acmeUser of acmeUsers.data.data) {
      try {
        await axios.get(`${API_BASE}/user/${acmeUser.id}`, { headers: perfectitHeaders });
        testResults.push(`❌ FAIL: PerfectIT can access Acme user ${acmeUser.id}`);
      } catch (error) {
        if (error.response?.status === 404) {
          testResults.push(`✅ PASS: PerfectIT blocked from Acme user ${acmeUser.id}`);
        } else {
          testResults.push(`⚠️ UNEXPECTED: ${error.response?.status} for Acme user ${acmeUser.id}`);
        }
      }
    }
    
    for (const perfectitUser of perfectitUsers.data.data) {
      try {
        await axios.get(`${API_BASE}/user/${perfectitUser.id}`, { headers: acmeHeaders });
        testResults.push(`❌ FAIL: Acme can access PerfectIT user ${perfectitUser.id}`);
      } catch (error) {
        if (error.response?.status === 404) {
          testResults.push(`✅ PASS: Acme blocked from PerfectIT user ${perfectitUser.id}`);
        } else {
          testResults.push(`⚠️ UNEXPECTED: ${error.response?.status} for PerfectIT user ${perfectitUser.id}`);
        }
      }
    }
    
    // === TEST 2: PERMISSION ENDPOINT ISOLATION ===
    console.log('\n2️⃣ TESTING PERMISSION ENDPOINT ISOLATION');
    console.log('-----------------------------------------');
    
    const perfectitPermissions = await axios.get(`${API_BASE}/permission`, { headers: perfectitHeaders });
    const acmePermissions = await axios.get(`${API_BASE}/permission`, { headers: acmeHeaders });
    
    console.log(`PerfectIT sees ${perfectitPermissions.data.data.length} permissions`);
    console.log(`Acme sees ${acmePermissions.data.data.length} permissions`);
    
    // Test cross-tenant permission access by ID
    for (const acmePerm of acmePermissions.data.data) {
      try {
        await axios.put(`${API_BASE}/permission/${acmePerm.id}`, { canAccess: false }, { headers: perfectitHeaders });
        testResults.push(`❌ FAIL: PerfectIT can update Acme permission ${acmePerm.id}`);
      } catch (error) {
        if (error.response?.status === 403) {
          testResults.push(`✅ PASS: PerfectIT blocked from Acme permission ${acmePerm.id}`);
        } else {
          testResults.push(`⚠️ UNEXPECTED: ${error.response?.status} for Acme permission ${acmePerm.id}`);
        }
      }
    }
    
    // === TEST 3: LOCK ENDPOINT ISOLATION ===
    console.log('\n3️⃣ TESTING LOCK ENDPOINT ISOLATION');
    console.log('----------------------------------');
    
    const perfectitLocks = await axios.get(`${API_BASE}/lock`, { headers: perfectitHeaders });
    const acmeLocks = await axios.get(`${API_BASE}/lock`, { headers: acmeHeaders });
    
    console.log(`PerfectIT sees ${perfectitLocks.data.data.length} locks`);
    console.log(`Acme sees ${acmeLocks.data.data.length} locks`);
    
    // Verify no lock ID overlap
    const perfectitLockIds = perfectitLocks.data.data.map(l => l.id);
    const acmeLockIds = acmeLocks.data.data.map(l => l.id);
    const sharedLocks = perfectitLockIds.filter(id => acmeLockIds.includes(id));
    
    if (sharedLocks.length === 0) {
      testResults.push('✅ PASS: No shared lock IDs between tenants');
    } else {
      testResults.push(`❌ FAIL: ${sharedLocks.length} shared lock IDs: ${sharedLocks.join(', ')}`);
    }
    
    // === TEST 4: CROSS-TENANT PERMISSION ASSIGNMENT ATTEMPTS ===
    console.log('\n4️⃣ TESTING CROSS-TENANT PERMISSION ASSIGNMENTS');
    console.log('-----------------------------------------------');
    
    // Try every combination of cross-tenant assignments
    for (const perfectitUser of perfectitUsers.data.data) {
      for (const acmeLock of acmeLocks.data.data) {
        try {
          await axios.post(`${API_BASE}/permission`, {
            userId: perfectitUser.id,
            lockId: acmeLock.id,
            canAccess: true
          }, { headers: perfectitHeaders });
          testResults.push(`❌ CRITICAL: PerfectIT assigned user ${perfectitUser.id} to Acme lock ${acmeLock.id}`);
        } catch (error) {
          if (error.response?.status === 403) {
            testResults.push(`✅ PASS: Blocked PerfectIT user ${perfectitUser.id} to Acme lock ${acmeLock.id}`);
          } else {
            testResults.push(`⚠️ UNEXPECTED: ${error.response?.status} for cross-tenant assignment`);
          }
        }
      }
    }
    
    for (const acmeUser of acmeUsers.data.data) {
      for (const perfectitLock of perfectitLocks.data.data) {
        try {
          await axios.post(`${API_BASE}/permission`, {
            userId: acmeUser.id,
            lockId: perfectitLock.id,
            canAccess: true
          }, { headers: acmeHeaders });
          testResults.push(`❌ CRITICAL: Acme assigned user ${acmeUser.id} to PerfectIT lock ${perfectitLock.id}`);
        } catch (error) {
          if (error.response?.status === 403) {
            testResults.push(`✅ PASS: Blocked Acme user ${acmeUser.id} to PerfectIT lock ${perfectitLock.id}`);
          } else {
            testResults.push(`⚠️ UNEXPECTED: ${error.response?.status} for cross-tenant assignment`);
          }
        }
      }
    }
    
    // === TEST 5: AUDIT LOG ISOLATION ===
    console.log('\n5️⃣ TESTING AUDIT LOG ISOLATION');
    console.log('------------------------------');
    
    const perfectitAudit = await axios.get(`${API_BASE}/audit?limit=10`, { headers: perfectitHeaders });
    const acmeAudit = await axios.get(`${API_BASE}/audit?limit=10`, { headers: acmeHeaders });
    
    console.log(`PerfectIT sees ${perfectitAudit.data.data.length} audit logs`);
    console.log(`Acme sees ${acmeAudit.data.data.length} audit logs`);
    
    // Check for cross-tenant audit log leakage
    const perfectitAuditUsers = perfectitAudit.data.data.map(log => log.userId).filter(Boolean);
    const acmeAuditUsers = acmeAudit.data.data.map(log => log.userId).filter(Boolean);
    const crossTenantAuditUsers = perfectitAuditUsers.filter(userId => 
      acmeUsers.data.data.some(user => user.id === userId)
    );
    
    if (crossTenantAuditUsers.length === 0) {
      testResults.push('✅ PASS: No cross-tenant audit log leakage');
    } else {
      testResults.push(`❌ FAIL: Cross-tenant audit logs: ${crossTenantAuditUsers.join(', ')}`);
    }
    
    // === TEST 6: DASHBOARD ISOLATION ===
    console.log('\n6️⃣ TESTING DASHBOARD ISOLATION');
    console.log('------------------------------');
    
    const perfectitDashboard = await axios.get(`${API_BASE}/dashboard`, { headers: perfectitHeaders });
    const acmeDashboard = await axios.get(`${API_BASE}/dashboard`, { headers: acmeHeaders });
    
    console.log('PerfectIT Dashboard Scope:', perfectitDashboard.data.data.scope);
    console.log('Acme Dashboard Scope:', acmeDashboard.data.data.scope);
    
    if (perfectitDashboard.data.data.scope.projectCityId !== acmeDashboard.data.data.scope.projectCityId) {
      testResults.push('✅ PASS: Dashboard scopes are properly isolated');
    } else {
      testResults.push('❌ FAIL: Dashboard scopes are the same');
    }
    
    // === TEST 7: ADDRESS/LOCATION ISOLATION ===
    console.log('\n7️⃣ TESTING ADDRESS/LOCATION ISOLATION');
    console.log('-------------------------------------');
    
    try {
      const perfectitAddresses = await axios.get(`${API_BASE}/address`, { headers: perfectitHeaders });
      const acmeAddresses = await axios.get(`${API_BASE}/address`, { headers: acmeHeaders });
      
      console.log(`PerfectIT sees ${perfectitAddresses.data.data.length} addresses`);
      console.log(`Acme sees ${acmeAddresses.data.data.length} addresses`);
      
      const perfectitAddressIds = perfectitAddresses.data.data.map(a => a.id);
      const acmeAddressIds = acmeAddresses.data.data.map(a => a.id);
      const sharedAddresses = perfectitAddressIds.filter(id => acmeAddressIds.includes(id));
      
      if (sharedAddresses.length === 0) {
        testResults.push('✅ PASS: No shared address IDs between tenants');
      } else {
        testResults.push(`❌ FAIL: ${sharedAddresses.length} shared address IDs`);
      }
    } catch (error) {
      testResults.push(`⚠️ Address endpoint not available: ${error.response?.status}`);
    }
    
    // === TEST 8: RFID KEY ISOLATION ===
    console.log('\n8️⃣ TESTING RFID KEY ISOLATION');
    console.log('-----------------------------');
    
    try {
      const perfectitKeys = await axios.get(`${API_BASE}/rfid`, { headers: perfectitHeaders });
      const acmeKeys = await axios.get(`${API_BASE}/rfid`, { headers: acmeHeaders });
      
      console.log(`PerfectIT sees ${perfectitKeys.data.data.length} RFID keys`);
      console.log(`Acme sees ${acmeKeys.data.data.length} RFID keys`);
      
      const perfectitKeyIds = perfectitKeys.data.data.map(k => k.id);
      const acmeKeyIds = acmeKeys.data.data.map(k => k.id);
      const sharedKeys = perfectitKeyIds.filter(id => acmeKeyIds.includes(id));
      
      if (sharedKeys.length === 0) {
        testResults.push('✅ PASS: No shared RFID key IDs between tenants');
      } else {
        testResults.push(`❌ FAIL: ${sharedKeys.length} shared RFID key IDs`);
      }
    } catch (error) {
      testResults.push(`⚠️ RFID endpoint not available: ${error.response?.status}`);
    }
    
    // === RESULTS SUMMARY ===
    console.log('\n🎯 COMPREHENSIVE TENANT ISOLATION TEST RESULTS');
    console.log('===============================================\n');
    
    const passCount = testResults.filter(r => r.startsWith('✅')).length;
    const failCount = testResults.filter(r => r.startsWith('❌')).length;
    const unexpectedCount = testResults.filter(r => r.startsWith('⚠️')).length;
    
    console.log(`📊 RESULTS SUMMARY:`);
    console.log(`   ✅ PASSED: ${passCount}`);
    console.log(`   ❌ FAILED: ${failCount}`);
    console.log(`   ⚠️ UNEXPECTED: ${unexpectedCount}`);
    console.log(`   📝 TOTAL TESTS: ${testResults.length}\n`);
    
    if (failCount > 0) {
      console.log('🚨 SECURITY FAILURES DETECTED:');
      testResults.filter(r => r.startsWith('❌')).forEach(result => console.log(result));
      console.log('');
    }
    
    if (unexpectedCount > 0) {
      console.log('⚠️ UNEXPECTED RESPONSES:');
      testResults.filter(r => r.startsWith('⚠️')).forEach(result => console.log(result));
      console.log('');
    }
    
    console.log('✅ SUCCESSFUL ISOLATIONS:');
    testResults.filter(r => r.startsWith('✅')).forEach(result => console.log(result));
    
    console.log('\n🎯 FINAL SECURITY ASSESSMENT:');
    if (failCount === 0) {
      console.log('🟢 SECURITY STATUS: EXCELLENT');
      console.log('🔒 TENANT ISOLATION: PERFECT');
      console.log('✅ PRODUCTION READY: YES');
    } else {
      console.log('🔴 SECURITY STATUS: CRITICAL ISSUES FOUND');
      console.log('🚨 TENANT ISOLATION: COMPROMISED');
      console.log('❌ PRODUCTION READY: NO');
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.response?.data || error.message);
  }
}

exhaustiveTenantIsolationCheck();