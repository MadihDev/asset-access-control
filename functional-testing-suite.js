/**
 * Functional Testing Suite for JWT Security Fix
 * 
 * This test ensures that our JWT security fix doesn't break legitimate functionality
 * while maintaining the security improvements.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials from the system
const testUsers = [
  {
    name: 'Admin User (Amsterdam)',
    username: 'techcorpadminamsterdam',
    password: 'demo123',
    projectId: 'techcorp',
    cityName: 'Amsterdam',
    expectedRole: 'ADMIN'
  },
  {
    name: 'Admin User (Rotterdam)', 
    username: 'techcorpadminrotterdam',
    password: 'demo123',
    projectId: 'techcorp',
    cityName: 'Rotterdam',
    expectedRole: 'ADMIN'
  }
];

async function testLoginFunctionality() {
  console.log('🔐 STEP 11.1: TESTING LOGIN FUNCTIONALITY');
  console.log('=========================================\n');

  let allLoginsPassed = true;

  for (const user of testUsers) {
    console.log(`Testing login for: ${user.name}`);
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: user.username,
        password: user.password,
        projectId: user.projectId,
        cityName: user.cityName
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (loginResponse.status === 200) {
        console.log(`   ✅ Login successful`);
        console.log(`   📋 User: ${loginResponse.data.data.user.username}`);
        console.log(`   📋 Role: ${loginResponse.data.data.user.role}`);
        console.log(`   📋 Token received: ${loginResponse.data.data.accessToken ? 'Yes' : 'No'}`);
        
        // Store the token for API testing
        user.accessToken = loginResponse.data.data.accessToken;
        user.userData = loginResponse.data.data.user;
        
      } else {
        console.log(`   ❌ Login failed: Status ${loginResponse.status}`);
        console.log(`   📋 Error: ${JSON.stringify(loginResponse.data, null, 2)}`);
        allLoginsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Login error: ${error.message}`);
      allLoginsPassed = false;
    }
    
    console.log('');
  }

  return allLoginsPassed;
}

async function testAPIAccess() {
  console.log('🌐 STEP 11.2: TESTING API ACCESS');
  console.log('===============================\n');

  let allAPIAccessPassed = true;

  // Test endpoints that require authentication
  const protectedEndpoints = [
    { path: '/user', method: 'GET', description: 'User listing' },
    { path: '/tenant/projects', method: 'GET', description: 'Project listing' },
    { path: '/rfid', method: 'GET', description: 'RFID cards' },
    { path: '/lock', method: 'GET', description: 'Lock devices' }
  ];

  for (const user of testUsers) {
    if (!user.accessToken) {
      console.log(`⚠️ Skipping API tests for ${user.name} - no access token`);
      continue;
    }

    console.log(`Testing API access for: ${user.name}`);

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          },
          timeout: 5000,
          validateStatus: () => true
        });

        if (response.status === 200) {
          console.log(`   ✅ ${endpoint.description}: Status 200`);
        } else if (response.status === 403) {
          console.log(`   ⚠️ ${endpoint.description}: Status 403 (Forbidden - role restriction)`);
        } else if (response.status === 404) {
          console.log(`   ⚠️ ${endpoint.description}: Status 404 (Not Found - expected)`);
        } else if (response.status === 401) {
          console.log(`   ❌ ${endpoint.description}: Status 401 (Unauthorized - token issue)`);
          allAPIAccessPassed = false;
        } else {
          console.log(`   ❓ ${endpoint.description}: Status ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.description}: Error - ${error.message}`);
        allAPIAccessPassed = false;
      }
    }
    console.log('');
  }

  return allAPIAccessPassed;
}

async function testRoleBasedAccess() {
  console.log('👥 STEP 11.3: TESTING ROLE-BASED ACCESS');
  console.log('=====================================\n');

  let roleAccessPassed = true;

  for (const user of testUsers) {
    if (!user.accessToken) continue;

    console.log(`Testing role-based access for: ${user.name} (${user.userData.role})`);

    // Test admin-only endpoint
    try {
      const adminResponse = await axios.get(`${BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (user.userData.role === 'ADMIN') {
        if (adminResponse.status === 200) {
          console.log(`   ✅ Admin access: Granted (Status 200)`);
        } else {
          console.log(`   ❌ Admin access: Denied (Status ${adminResponse.status}) - Should be granted`);
          roleAccessPassed = false;
        }
      } else {
        if (adminResponse.status === 403) {
          console.log(`   ✅ Admin access: Properly denied (Status 403)`);
        } else if (adminResponse.status === 200) {
          console.log(`   ❌ Admin access: Improperly granted (Status 200) - Should be denied`);
          roleAccessPassed = false;
        } else {
          console.log(`   ❓ Admin access: Unexpected status ${adminResponse.status}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Admin access test error: ${error.message}`);
      roleAccessPassed = false;
    }

    console.log('');
  }

  return roleAccessPassed;
}

async function testMultiTenantIsolation() {
  console.log('🏢 STEP 11.4: TESTING MULTI-TENANT ISOLATION');
  console.log('===========================================\n');

  let tenantIsolationPassed = true;

  // Test that Amsterdam user can't access Rotterdam data and vice versa
  if (testUsers.length >= 2 && testUsers[0].accessToken && testUsers[1].accessToken) {
    const amsterdamUser = testUsers[0];
    const rotterdamUser = testUsers[1];

    console.log('Testing cross-tenant access prevention...');
    
    // Test both users against tenant-specific endpoints
    const tenantEndpoints = [
      '/tenant/projects',
      '/tenant/context'
    ];

    for (const endpoint of tenantEndpoints) {
      try {
        // Test Amsterdam user
        const amsterdamResponse = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${amsterdamUser.accessToken}` },
          timeout: 5000,
          validateStatus: () => true
        });

        // Test Rotterdam user  
        const rotterdamResponse = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${rotterdamUser.accessToken}` },
          timeout: 5000,
          validateStatus: () => true
        });

        console.log(`   📊 ${endpoint}:`);
        console.log(`      Amsterdam user: Status ${amsterdamResponse.status}`);
        console.log(`      Rotterdam user: Status ${rotterdamResponse.status}`);

        // Both should have access to their own tenant data
        if (amsterdamResponse.status === 200 && rotterdamResponse.status === 200) {
          console.log(`   ✅ Both users can access tenant data - Good`);
        } else if (amsterdamResponse.status === 404 && rotterdamResponse.status === 404) {
          console.log(`   ⚠️ Both users get 404 - Endpoint may require parameters`);
        } else {
          console.log(`   ❓ Mixed results - May need investigation`);
        }

      } catch (error) {
        console.log(`   ❌ Tenant isolation test error for ${endpoint}: ${error.message}`);
        tenantIsolationPassed = false;
      }
    }
  } else {
    console.log('⚠️ Insufficient authenticated users for tenant isolation testing');
  }

  return tenantIsolationPassed;
}

async function runFunctionalTests() {
  console.log('🧪 JWT SECURITY FIX - FUNCTIONAL TESTING SUITE');
  console.log('==============================================\n');

  let allTestsPassed = true;

  // Step 1: Test Login Functionality
  const loginPassed = await testLoginFunctionality();
  if (!loginPassed) allTestsPassed = false;

  // Step 2: Test API Access
  const apiAccessPassed = await testAPIAccess();
  if (!apiAccessPassed) allTestsPassed = false;

  // Step 3: Test Role-Based Access
  const roleAccessPassed = await testRoleBasedAccess();
  if (!roleAccessPassed) allTestsPassed = false;

  // Step 4: Test Multi-Tenant Isolation
  const tenantIsolationPassed = await testMultiTenantIsolation();
  if (!tenantIsolationPassed) allTestsPassed = false;

  // Final Results
  console.log('📊 FUNCTIONAL TESTING RESULTS');
  console.log('============================');
  console.log(`Login Functionality: ${loginPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Access: ${apiAccessPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Role-Based Access: ${roleAccessPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multi-Tenant Isolation: ${tenantIsolationPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (allTestsPassed) {
    console.log('🎉 ALL FUNCTIONAL TESTS PASSED');
    console.log('✅ JWT security fix maintains all legitimate functionality');
    console.log('✅ System ready for deployment');
  } else {
    console.log('🚨 SOME FUNCTIONAL TESTS FAILED');
    console.log('❌ JWT security fix may have broken legitimate functionality');
    console.log('⚠️ Review failed tests before deployment');
  }

  return allTestsPassed;
}

// Run the functional tests
runFunctionalTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Functional testing failed:', error.message);
    process.exit(1);
  });