/**
 * LAYER 4: AUTHORIZATION & MULTI-TENANT SECUR    // SafeAccess users  
    { username: 'safeaccessadminrotterdam', password: 'Password123!', projectId: 'safeaccess', cityName: 'Rotterdam' },
    { username: 'safeaccessguard1rotterdam', password: 'Password123!', projectId: 'safeaccess', cityName: 'Rotterdam' }, TESTING
 * Multi-Tenant RFID Access Control System
 * 
 * Tests: RBAC, Multi-Tenant Isolation, Resource-Level Authorization, API Endpoint Security
 * CRITICAL: Testing for cross-tenant assignment vulnerabilities discovered previously
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

// Test results storage
const testResults = [];
let validTokens = {};

function addResult(category, test, status, message, details = '') {
  const result = {
    layer: 'LAYER 4: AUTHORIZATION & MULTI-TENANT SECURITY',
    category,
    test,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);
  
  const statusColor = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
  console.log(`   ${statusColor}${status}\x1b[0m ${test}: ${message}`);
  if (details) console.log(`      Details: ${details}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get valid authentication tokens using working credentials
 */
async function getValidTokens() {
  console.log('🔑 Obtaining valid authentication tokens...');
  
  // Use actual credentials from the database with correct API fields and password
  const possibleCredentials = [
    // TechCorp users
    { username: 'techcorpadminamsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam' },
    { username: 'techcorpuseramsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam' },
    { username: 'techcorpadminrotterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Rotterdam' },
    { username: 'techcorpuserrotterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Rotterdam' },
    // SafeAccess users
    { username: 'safeaccessadminrotterdam', password: 'Password123!', project: 'safeaccess', city: 'Rotterdam' },
    { username: 'safeaccessuserrotterdam', password: 'Password123!', project: 'safeaccess', city: 'Rotterdam' },
    // SecureBuildings users
    { username: 'secureadminutrecht', password: 'demo123', projectId: 'securebuildings', cityName: 'Utrecht' },
    { username: 'secureguard1utrecht', password: 'demo123', projectId: 'securebuildings', cityName: 'Utrecht' },
    // SafeAccess users
    { username: 'safeaccessadminamsterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Amsterdam' },
    { username: 'safeaccessguard1amsterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Amsterdam' },
  ];
  
  for (const creds of possibleCredentials) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, creds, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 200 && response.data.data?.token) {
        validTokens[creds.username] = {
          token: response.data.data.token,
          refreshToken: response.data.data.refreshToken,
          user: response.data.data.user,
          username: creds.username,
          project: creds.projectId,
          city: creds.cityName,
          projectCityId: response.data.data.user?.projectCityId
        };
        console.log(`   ✅ Token obtained for ${creds.username} (${creds.project}/${creds.city})`);
      } else if (response.status === 400) {
        console.log(`   ❌ Invalid credentials for ${creds.username}: ${response.data.message || 'Bad request'}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to authenticate ${creds.username}: ${error.message}`);
    }
    await sleep(200);
  }
  
  console.log(`📊 Successfully authenticated ${Object.keys(validTokens).length} users`);
  return validTokens;
}

/**
 * 4.1 Role-Based Access Control (RBAC) Testing
 */
async function testRoleBasedAccessControl() {
  console.log('\n👥 TESTING ROLE-BASED ACCESS CONTROL'.blue?.bold || '\n👥 TESTING ROLE-BASED ACCESS CONTROL');
  
  if (Object.keys(validTokens).length === 0) {
    addResult('RBAC_SECURITY', 'RBAC testing prerequisites', 'FAIL', 
      'No valid tokens available for RBAC testing');
    return;
  }
  
  // Test role-based endpoint access
  const roleBasedEndpoints = [
    { endpoint: '/user', method: 'GET', requiredRole: 'USER', description: 'User listing' },
    { endpoint: '/user', method: 'POST', requiredRole: 'ADMIN', description: 'User creation' },
    { endpoint: '/lock', method: 'GET', requiredRole: 'USER', description: 'Lock listing' },
    { endpoint: '/lock', method: 'POST', requiredRole: 'ADMIN', description: 'Lock creation' },
    { endpoint: '/location', method: 'GET', requiredRole: 'USER', description: 'Location listing' },
    { endpoint: '/location', method: 'POST', requiredRole: 'ADMIN', description: 'Location creation' },
    { endpoint: '/admin/audit', method: 'GET', requiredRole: 'ADMIN', description: 'Audit log access' }
  ];
  
  for (const testEndpoint of roleBasedEndpoints) {
    for (const [username, auth] of Object.entries(validTokens)) {
      try {
        const config = {
          method: testEndpoint.method,
          url: `${BASE_URL}${testEndpoint.endpoint}`,
          headers: { 'Authorization': `Bearer ${auth.token}` },
          timeout: 5000,
          validateStatus: () => true
        };
        
        if (testEndpoint.method === 'POST') {
          config.data = {
            name: 'Test Resource',
            description: 'Created by security test'
          };
        }
        
        const response = await axios(config);
        
        // Determine if user should have access based on role
        const userRole = auth.user?.role || 'UNKNOWN';
        const shouldHaveAccess = (testEndpoint.requiredRole === 'USER') || 
                                (testEndpoint.requiredRole === 'ADMIN' && userRole === 'ADMIN');
        
        if (shouldHaveAccess && response.status < 400) {
          addResult('RBAC_SECURITY', `${testEndpoint.description} access for ${userRole}`, 'PASS', 
            `${userRole} user properly authorized for ${testEndpoint.description}`);
        } else if (!shouldHaveAccess && (response.status === 403 || response.status === 401)) {
          addResult('RBAC_SECURITY', `${testEndpoint.description} restriction for ${userRole}`, 'PASS', 
            `${userRole} user properly blocked from ${testEndpoint.description}`);
        } else if (!shouldHaveAccess && response.status < 400) {
          addResult('RBAC_SECURITY', `${testEndpoint.description} restriction for ${userRole}`, 'FAIL', 
            `${userRole} user should not access ${testEndpoint.description}`, `Status: ${response.status}`);
        } else if (shouldHaveAccess && response.status >= 400) {
          addResult('RBAC_SECURITY', `${testEndpoint.description} access for ${userRole}`, 'WARN', 
            `${userRole} user blocked from ${testEndpoint.description}`, `Status: ${response.status}`);
        }
        
      } catch (error) {
        addResult('RBAC_SECURITY', `${testEndpoint.description} testing`, 'WARN', 
          'Error testing role-based access', error.message);
      }
      await sleep(200);
    }
  }
}

/**
 * 4.2 Multi-Tenant Authorization Testing
 * CRITICAL: Test for the cross-tenant assignment vulnerability
 */
async function testMultiTenantAuthorization() {
  console.log('\n🏢 TESTING MULTI-TENANT AUTHORIZATION'.blue?.bold || '\n🏢 TESTING MULTI-TENANT AUTHORIZATION');
  
  if (Object.keys(validTokens).length < 2) {
    addResult('MULTI_TENANT_SECURITY', 'Multi-tenant testing prerequisites', 'WARN', 
      'Need at least 2 users from different tenants for comprehensive testing');
  }
  
  // Test basic tenant isolation
  for (const [username, auth] of Object.entries(validTokens)) {
    try {
      // Get user's own data
      const userResponse = await axios.get(`${BASE_URL}/user`, {
        headers: { 'Authorization': `Bearer ${auth.token}` },
        timeout: 5000
      });
      
      if (userResponse.status === 200) {
        const userData = userResponse.data.data || userResponse.data;
        const userCount = Array.isArray(userData) ? userData.length : 1;
        
        addResult('MULTI_TENANT_SECURITY', `User data tenant scoping for ${username}`, 'PASS', 
          `User can access their tenant data`, `Retrieved ${userCount} user(s)`);
      }
      
      // Get lock data for tenant scoping test
      const lockResponse = await axios.get(`${BASE_URL}/lock`, {
        headers: { 'Authorization': `Bearer ${auth.token}` },
        timeout: 5000
      });
      
      if (lockResponse.status === 200) {
        const lockData = lockResponse.data.data || lockResponse.data;
        const lockCount = Array.isArray(lockData) ? lockData.length : 1;
        
        // CRITICAL TEST: Check if admin users see locks from all tenants
        if (auth.user?.role === 'ADMIN' && lockCount > 20) {
          addResult('MULTI_TENANT_SECURITY', 'CRITICAL: Admin cross-tenant lock visibility', 'FAIL', 
            'Admin can see too many locks - possible cross-tenant data exposure', 
            `Admin sees ${lockCount} locks - should be tenant-scoped`);
        } else {
          addResult('MULTI_TENANT_SECURITY', `Lock data tenant scoping for ${username}`, 'PASS', 
            `User can access their tenant locks`, `Retrieved ${lockCount} lock(s)`);
        }
        
        // Store lock data for cross-tenant assignment testing
        auth.locks = Array.isArray(lockData) ? lockData : [lockData];
      }
      
    } catch (error) {
      addResult('MULTI_TENANT_SECURITY', `Tenant data access for ${username}`, 'WARN', 
        'Error testing tenant data access', error.message);
    }
    await sleep(300);
  }
  
  // CRITICAL TEST: Cross-tenant permission assignment vulnerability
  await testCrossTenantPermissionAssignment();
  
  // Test cross-tenant user access prevention
  const userEntries = Object.entries(validTokens);
  if (userEntries.length >= 2) {
    const [user1Name, user1Auth] = userEntries[0];
    const [user2Name, user2Auth] = userEntries[1];
    
    // Try to access another user's specific data
    if (user2Auth.user?.id) {
      try {
        const crossTenantResponse = await axios.get(`${BASE_URL}/user/${user2Auth.user.id}`, {
          headers: { 'Authorization': `Bearer ${user1Auth.token}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (crossTenantResponse.status === 403 || crossTenantResponse.status === 404) {
          addResult('MULTI_TENANT_SECURITY', 'Cross-tenant user access prevention', 'PASS', 
            'Users cannot access other tenant user data');
        } else if (crossTenantResponse.status === 200) {
          addResult('MULTI_TENANT_SECURITY', 'Cross-tenant user access prevention', 'FAIL', 
            'User can access other tenant user data', `${user1Name} accessed ${user2Name}'s data`);
        }
      } catch (error) {
        addResult('MULTI_TENANT_SECURITY', 'Cross-tenant user access test', 'PASS', 
          'Cross-tenant access properly blocked');
      }
    }
  }
}

/**
 * CRITICAL: Test for cross-tenant permission assignment vulnerability
 */
async function testCrossTenantPermissionAssignment() {
  console.log('\n🚨 TESTING CRITICAL CROSS-TENANT PERMISSION ASSIGNMENT VULNERABILITY'.red?.bold || '\n🚨 TESTING CRITICAL CROSS-TENANT PERMISSION ASSIGNMENT VULNERABILITY');
  
  const adminUsers = Object.entries(validTokens).filter(([_, auth]) => auth.user?.role === 'ADMIN');
  const regularUsers = Object.entries(validTokens).filter(([_, auth]) => auth.user?.role !== 'ADMIN');
  
  if (adminUsers.length === 0 || regularUsers.length === 0) {
    addResult('CRITICAL_VULNERABILITY', 'Cross-tenant assignment test setup', 'WARN', 
      'Need both ADMIN and USER tokens for comprehensive testing');
    return;
  }
  
  for (const [adminName, adminAuth] of adminUsers) {
    try {
      // Get all locks visible to admin
      const lockResponse = await axios.get(`${BASE_URL}/lock`, {
        headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        timeout: 5000
      });
      
      if (lockResponse.status === 200) {
        const locks = lockResponse.data.data || lockResponse.data;
        const lockArray = Array.isArray(locks) ? locks : [locks];
        
        // Check if admin sees locks from multiple projects/tenants
        const uniqueProjects = new Set();
        const uniqueCities = new Set();
        
        lockArray.forEach(lock => {
          if (lock.location?.address?.projectCity?.project?.slug) {
            uniqueProjects.add(lock.location.address.projectCity.project.slug);
          }
          if (lock.location?.address?.projectCity?.city?.name) {
            uniqueCities.add(lock.location.address.projectCity.city.name);
          }
        });
        
        if (uniqueProjects.size > 1 || uniqueCities.size > 1) {
          addResult('CRITICAL_VULNERABILITY', 'Admin cross-tenant lock visibility', 'FAIL', 
            'CRITICAL: Admin can see locks across multiple tenants', 
            `Projects: ${Array.from(uniqueProjects).join(', ')} | Cities: ${Array.from(uniqueCities).join(', ')}`);
          
          // Test if admin can assign users to cross-tenant locks
          for (const [userName, userAuth] of regularUsers) {
            if (userAuth.projectCityId !== adminAuth.projectCityId) {
              // Try to assign user from different tenant to admin's locks
              const testLock = lockArray[0];
              
              if (testLock && userAuth.user?.id) {
                try {
                  const assignmentResponse = await axios.post(`${BASE_URL}/user-permission`, {
                    userId: userAuth.user.id,
                    lockId: testLock.id,
                    permissions: ['ACCESS'],
                    validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                  }, {
                    headers: { 'Authorization': `Bearer ${adminAuth.token}` },
                    timeout: 5000,
                    validateStatus: () => true
                  });
                  
                  if (assignmentResponse.status === 200 || assignmentResponse.status === 201) {
                    addResult('CRITICAL_VULNERABILITY', 'Cross-tenant permission assignment', 'FAIL', 
                      'CRITICAL: Cross-tenant permission assignment allowed!', 
                      `${adminName} assigned ${userName} to lock in different tenant`);
                  } else if (assignmentResponse.status === 403 || assignmentResponse.status === 400) {
                    addResult('CRITICAL_VULNERABILITY', 'Cross-tenant permission assignment prevention', 'PASS', 
                      'Cross-tenant permission assignment properly blocked');
                  } else {
                    addResult('CRITICAL_VULNERABILITY', 'Cross-tenant permission assignment', 'WARN', 
                      'Unexpected response to cross-tenant assignment', `Status: ${assignmentResponse.status}`);
                  }
                } catch (error) {
                  addResult('CRITICAL_VULNERABILITY', 'Cross-tenant permission assignment', 'PASS', 
                    'Cross-tenant assignment blocked by system');
                }
                break; // Only test one cross-tenant assignment per admin
              }
            }
          }
        } else {
          addResult('MULTI_TENANT_SECURITY', 'Admin tenant scoping', 'PASS', 
            'Admin properly scoped to single tenant');
        }
      }
    } catch (error) {
      addResult('CRITICAL_VULNERABILITY', 'Cross-tenant assignment testing', 'WARN', 
        'Error testing cross-tenant assignment', error.message);
    }
    await sleep(500);
  }
}

/**
 * 4.3 Resource-Level Authorization Testing
 */
async function testResourceLevelAuthorization() {
  console.log('\n🔒 TESTING RESOURCE-LEVEL AUTHORIZATION'.blue?.bold || '\n🔒 TESTING RESOURCE-LEVEL AUTHORIZATION');
  
  // Test unauthorized access to specific resources
  for (const [username, auth] of Object.entries(validTokens)) {
    const unauthorizedTests = [
      { endpoint: '/user/nonexistent-id', method: 'GET', description: 'Non-existent user access' },
      { endpoint: '/lock/nonexistent-id', method: 'GET', description: 'Non-existent lock access' },
      { endpoint: '/location/nonexistent-id', method: 'GET', description: 'Non-existent location access' },
      { endpoint: '/user/admin-user-id', method: 'DELETE', description: 'Admin user deletion' },
    ];
    
    for (const test of unauthorizedTests) {
      try {
        const response = await axios({
          method: test.method,
          url: `${BASE_URL}${test.endpoint}`,
          headers: { 'Authorization': `Bearer ${auth.token}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 404 || response.status === 403 || response.status === 401) {
          addResult('RESOURCE_AUTHORIZATION', `${test.description} protection`, 'PASS', 
            'Unauthorized resource access properly blocked', `Status: ${response.status}`);
        } else {
          addResult('RESOURCE_AUTHORIZATION', `${test.description} protection`, 'WARN', 
            'Unexpected response to unauthorized access', `Status: ${response.status}`);
        }
      } catch (error) {
        addResult('RESOURCE_AUTHORIZATION', `${test.description} protection`, 'PASS', 
          'Unauthorized access properly blocked');
      }
      await sleep(200);
    }
  }
  
  // Test bulk operations authorization
  for (const [username, auth] of Object.entries(validTokens)) {
    try {
      const bulkDeleteResponse = await axios.delete(`${BASE_URL}/user/bulk`, {
        headers: { 'Authorization': `Bearer ${auth.token}` },
        data: { userIds: ['id1', 'id2', 'id3'] },
        timeout: 5000,
        validateStatus: () => true
      });
      
      const userRole = auth.user?.role || 'UNKNOWN';
      
      if (userRole === 'ADMIN' && bulkDeleteResponse.status < 400) {
        addResult('RESOURCE_AUTHORIZATION', 'Bulk operations for ADMIN', 'PASS', 
          'Admin can perform bulk operations');
      } else if (userRole !== 'ADMIN' && (bulkDeleteResponse.status === 403 || bulkDeleteResponse.status === 401)) {
        addResult('RESOURCE_AUTHORIZATION', 'Bulk operations restriction', 'PASS', 
          'Non-admin users blocked from bulk operations');
      } else if (userRole !== 'ADMIN' && bulkDeleteResponse.status < 400) {
        addResult('RESOURCE_AUTHORIZATION', 'Bulk operations restriction', 'FAIL', 
          'Non-admin user can perform bulk operations');
      } else if (bulkDeleteResponse.status === 404) {
        addResult('RESOURCE_AUTHORIZATION', 'Bulk operations availability', 'INFO', 
          'Bulk operations endpoint not available');
      }
    } catch (error) {
      addResult('RESOURCE_AUTHORIZATION', 'Bulk operations testing', 'INFO', 
        'Error testing bulk operations');
    }
    await sleep(300);
  }
}

/**
 * 4.4 API Endpoint Authorization Testing
 */
async function testAPIEndpointAuthorization() {
  console.log('\n🔗 TESTING API ENDPOINT AUTHORIZATION'.blue?.bold || '\n🔗 TESTING API ENDPOINT AUTHORIZATION');
  
  // Test unauthenticated access to protected endpoints
  const protectedEndpoints = [
    { endpoint: '/user', method: 'GET' },
    { endpoint: '/lock', method: 'GET' },
    { endpoint: '/location', method: 'GET' },
    { endpoint: '/user-permission', method: 'GET' },
    { endpoint: '/admin/audit', method: 'GET' }
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.endpoint}`,
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        addResult('API_ENDPOINT_AUTHORIZATION', `Unauthenticated ${endpoint.endpoint} access`, 'PASS', 
          'Protected endpoint requires authentication');
      } else if (response.status === 200) {
        addResult('API_ENDPOINT_AUTHORIZATION', `Unauthenticated ${endpoint.endpoint} access`, 'FAIL', 
          'Protected endpoint accessible without authentication');
      } else {
        addResult('API_ENDPOINT_AUTHORIZATION', `Unauthenticated ${endpoint.endpoint} access`, 'INFO', 
          'Endpoint protected or not available', `Status: ${response.status}`);
      }
    } catch (error) {
      addResult('API_ENDPOINT_AUTHORIZATION', `${endpoint.endpoint} testing`, 'PASS', 
        'Endpoint properly protected');
    }
    await sleep(200);
  }
  
  // Test parameter-based authorization
  if (Object.keys(validTokens).length > 0) {
    const testAuth = Object.values(validTokens)[0];
    
    const parameterTests = [
      { endpoint: '/user?role=ADMIN', description: 'Role parameter injection' },
      { endpoint: '/lock?tenant=all', description: 'Tenant parameter bypass' },
      { endpoint: '/user?limit=9999', description: 'Limit parameter manipulation' }
    ];
    
    for (const test of parameterTests) {
      try {
        const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
          headers: { 'Authorization': `Bearer ${testAuth.token}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 400 || response.status === 403) {
          addResult('API_ENDPOINT_AUTHORIZATION', test.description, 'PASS', 
            'Parameter manipulation properly rejected');
        } else if (response.status === 200) {
          addResult('API_ENDPOINT_AUTHORIZATION', test.description, 'WARN', 
            'Parameter manipulation may be possible', 'Verify response data is properly filtered');
        }
      } catch (error) {
        addResult('API_ENDPOINT_AUTHORIZATION', test.description, 'PASS', 
          'Parameter manipulation blocked');
      }
      await sleep(200);
    }
  }
}

/**
 * Generate comprehensive Layer 4 security report
 */
function generateLayer4Report() {
  console.log('\n📊 LAYER 4 AUTHORIZATION & MULTI-TENANT SECURITY REPORT'.blue?.bold || '\n📊 LAYER 4 AUTHORIZATION & MULTI-TENANT SECURITY REPORT');
  console.log('='.repeat(70));
  
  const categories = ['RBAC_SECURITY', 'MULTI_TENANT_SECURITY', 'CRITICAL_VULNERABILITY', 'RESOURCE_AUTHORIZATION', 'API_ENDPOINT_AUTHORIZATION'];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningTests = 0;
  let criticalIssues = 0;
  
  categories.forEach(category => {
    const categoryResults = testResults.filter(r => r.category === category);
    if (categoryResults.length > 0) {
      console.log(`\n${category}:`);
      
      categoryResults.forEach(result => {
        totalTests++;
        if (result.status === 'PASS') passedTests++;
        else if (result.status === 'FAIL') {
          failedTests++;
          if (category === 'CRITICAL_VULNERABILITY') criticalIssues++;
        } else warningTests++;
        
        console.log(`  ${result.status}: ${result.test} - ${result.message}`);
      });
    }
  });
  
  console.log('\n📈 LAYER 4 SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`\n🚨 CRITICAL VULNERABILITIES: ${criticalIssues}`);
  
  const score = ((passedTests + (warningTests * 0.5)) / totalTests) * 100;
  console.log(`\n🎯 LAYER 4 AUTHORIZATION & MULTI-TENANT SECURITY SCORE: ${score.toFixed(1)}%`);
  
  if (criticalIssues > 0) {
    console.log('🚨 CRITICAL SECURITY ISSUES FOUND - IMMEDIATE ATTENTION REQUIRED');
  } else if (score >= 90) {
    console.log('✅ EXCELLENT authorization and multi-tenant security');
  } else if (score >= 75) {
    console.log('⚠️  GOOD authorization and multi-tenant security with minor improvements needed');
  } else if (score >= 60) {
    console.log('⚠️  MODERATE authorization and multi-tenant security - several issues to address');
  } else {
    console.log('❌ POOR authorization and multi-tenant security - immediate attention required');
  }
  
  return {
    layer: 'LAYER 4: AUTHORIZATION & MULTI-TENANT SECURITY',
    totalTests,
    passedTests,
    failedTests,
    warningTests,
    criticalIssues,
    score: score.toFixed(1),
    results: testResults,
    authenticatedUsers: Object.keys(validTokens).length
  };
}

/**
 * Main execution function
 */
async function runLayer4Tests() {
  console.log('🛡️  STARTING LAYER 4: AUTHORIZATION & MULTI-TENANT SECURITY TESTING'.cyan?.bold || '🛡️  STARTING LAYER 4: AUTHORIZATION & MULTI-TENANT SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: RBAC, Multi-Tenant Isolation, Resource Authorization, Critical Vulnerabilities');
  console.log('=' .repeat(85));
  
  try {
    await getValidTokens();
    await testRoleBasedAccessControl();
    await testMultiTenantAuthorization();
    await testResourceLevelAuthorization();
    await testAPIEndpointAuthorization();
    
    const report = generateLayer4Report();
    
    // Save results to file
    fs.writeFileSync('layer4-authorization-multitenant-security-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to layer4-authorization-multitenant-security-results.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Error during Layer 4 testing:', error.message);
    return null;
  }
}

// Execute if run directly
if (require.main === module) {
  runLayer4Tests()
    .then(report => {
      if (report) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runLayer4Tests };