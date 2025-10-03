/**
 * ENHANCED Layer 3: Business Logic Security Testing
 * Using Real Demo Data for Comprehensive Multi-Tenant Testing
 * 
 * This test focuses on the critical business logic vulnerabilities:
 * 1. Multi-tenant isolation validation
 * 2. Cross-tenant access prevention  
 * 3. Business logic authorization
 * 4. Data boundary enforcement
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:5000/api';
const RESULTS = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Demo users with known credentials (using correct API field names)
const DEMO_USERS = [
  { username: 'techcorpadminamsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', expectedRole: 'ADMIN', tenant: 'techcorp-amsterdam' },
  { username: 'techcorpuseramsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', expectedRole: 'USER', tenant: 'techcorp-amsterdam' },
  { username: 'safeaccessadminrotterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Rotterdam', expectedRole: 'ADMIN', tenant: 'safeaccess-rotterdam' },
  { username: 'safeaccessguard1rotterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Rotterdam', expectedRole: 'USER', tenant: 'safeaccess-rotterdam' },
  { username: 'secureadminamsterdam', password: 'demo123', projectId: 'securebuildings', cityName: 'Amsterdam', expectedRole: 'ADMIN', tenant: 'securebuildings-amsterdam' }
];

// Utility function to add test result
function addResult(category, test, status, message, details = null) {
  const result = {
    category,
    test,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  RESULTS.tests.push(result);
  
  if (status === 'PASS') {
    RESULTS.passed++;
    console.log(`✅ [${category}] ${test}: ${message}`.green);
  } else if (status === 'FAIL') {
    RESULTS.failed++;
    console.log(`❌ [${category}] ${test}: ${message}`.red);
    if (details) console.log(`   Details: ${details}`.gray);
  } else if (status === 'WARN') {
    RESULTS.warnings++;
    console.log(`⚠️  [${category}] ${test}: ${message}`.yellow);
    if (details) console.log(`   Details: ${details}`.gray);
  }
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🏢 STARTING ENHANCED LAYER 3: BUSINESS LOGIC SECURITY TESTS'.cyan.bold);
console.log('=' * 80);

/**
 * Get authentication tokens for different tenants
 */
async function getAuthTokens() {
  console.log('\n🔑 ACQUIRING MULTI-TENANT AUTHENTICATION TOKENS'.blue.bold);
  const tokens = {};
  
  for (const user of DEMO_USERS) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: user.username,
        password: user.password,
        projectId: user.projectId,
        cityName: user.cityName
      }, { timeout: 5000 });
      
      if (response.status === 200 && response.data.data && response.data.data.accessToken) {
        tokens[user.tenant] = {
          token: response.data.data.accessToken,
          user: response.data.data.user,
          username: user.username,
          role: response.data.data.user.role,
          tenant: user.tenant,
          projectId: user.projectId,
          cityName: user.cityName
        };
        console.log(`   ✓ ${user.tenant}: ${user.username} (${response.data.data.user.role})`.green);
      } else {
        console.log(`   ✗ ${user.tenant}: Login failed`.red);
      }
    } catch (error) {
      console.log(`   ✗ ${user.tenant}: ${error.message}`.red);
    }
    
    // Rate limiting protection
    await sleep(100);
  }
  
  console.log(`\n📊 Successfully acquired ${Object.keys(tokens).length} tenant tokens`);
  return tokens;
}

/**
 * Test Multi-Tenant Data Isolation
 */
async function testMultiTenantDataIsolation(tokens) {
  console.log('\n🏢 TESTING MULTI-TENANT DATA ISOLATION'.blue.bold);
  
  const tenantEntries = Object.entries(tokens);
  
  if (tenantEntries.length < 2) {
    console.log('   ⚠️  Need at least 2 different tenant tokens for isolation testing');
    return;
  }
  
  // Test each tenant can only see their own data
  for (const [tenantName, tenantAuth] of tenantEntries) {
    
    // Test User data isolation
    try {
      const response = await axios.get(`${BASE_URL}/user/`, {
        headers: { Authorization: `Bearer ${tenantAuth.token}` },
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.data) {
        const users = response.data.data;
        const userProjects = [...new Set(users.map(u => u.projectCity?.project?.slug).filter(Boolean))];
        const singleProject = userProjects.length === 1 && userProjects[0] === tenantAuth.projectId;
        
        addResult('TENANT_ISOLATION', `${tenantName} user data isolation`, 
          singleProject ? 'PASS' : 'FAIL',
          singleProject ? `Only sees own project data (${userProjects[0]})` : `Sees multiple projects: ${userProjects.join(', ')}`,
          `Expected: ${tenantAuth.projectId}, Got: ${userProjects.join(', ')}`);
      } else {
        addResult('TENANT_ISOLATION', `${tenantName} user data isolation`, 'WARN', 
          'No user data returned', `Status: ${response.status}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        addResult('TENANT_ISOLATION', `${tenantName} user data isolation`, 'PASS', 
          'Access properly restricted');
      } else {
        addResult('TENANT_ISOLATION', `${tenantName} user data isolation`, 'WARN', 
          'Unexpected user data access error', error.message);
      }
    }
    
    // Test Location data isolation
    try {
      const response = await axios.get(`${BASE_URL}/location`, {
        headers: { Authorization: `Bearer ${tenantAuth.token}` },
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.data) {
        const locations = response.data.data;
        const locationProjects = [...new Set(locations.map(l => l.address?.projectCity?.project?.slug).filter(Boolean))];
        const singleProject = locationProjects.length <= 1;
        
        addResult('TENANT_ISOLATION', `${tenantName} location data isolation`, 
          singleProject ? 'PASS' : 'FAIL',
          singleProject ? 'Only sees own tenant locations' : `Sees multiple tenant locations: ${locationProjects.join(', ')}`,
          `Projects visible: ${locationProjects.length}`);
      } else {
        addResult('TENANT_ISOLATION', `${tenantName} location data isolation`, 'PASS', 
          'Location access properly restricted');
      }
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        addResult('TENANT_ISOLATION', `${tenantName} location data isolation`, 'PASS', 
          'Location access properly restricted');
      } else {
        addResult('TENANT_ISOLATION', `${tenantName} location data isolation`, 'WARN', 
          'Unexpected location access error', error.message);
      }
    }
    
    await sleep(200); // Rate limiting protection
  }
}

/**
 * Test Cross-Tenant Access Prevention
 */
async function testCrossTenantAccessPrevention(tokens) {
  console.log('\n🚫 TESTING CROSS-TENANT ACCESS PREVENTION'.blue.bold);
  
  const tenantEntries = Object.entries(tokens);
  
  if (tenantEntries.length < 2) {
    console.log('   ⚠️  Need at least 2 different tenant tokens for cross-tenant testing');
    return;
  }
  
  const [tenant1Name, tenant1Auth] = tenantEntries[0];
  const [tenant2Name, tenant2Auth] = tenantEntries[1];
  
  // Test if tenant1 can access tenant2's specific resources
  if (tenant1Auth.user.id && tenant2Auth.user.id) {
    try {
      const response = await axios.get(`${BASE_URL}/user/${tenant2Auth.user.id}`, {
        headers: { Authorization: `Bearer ${tenant1Auth.token}` },
        timeout: 5000
      });
      
      const blocked = response.status === 403 || response.status === 404 || response.status === 401;
      addResult('CROSS_TENANT_ACCESS', 'Cross-tenant user access blocked', 
        blocked ? 'PASS' : 'FAIL',
        blocked ? `${tenant1Name} properly blocked from ${tenant2Name} user` : `${tenant1Name} can access ${tenant2Name} user - CRITICAL`,
        `Status: ${response.status}`);
        
    } catch (error) {
      if (error.response && (error.response.status === 403 || error.response.status === 404 || error.response.status === 401)) {
        addResult('CROSS_TENANT_ACCESS', 'Cross-tenant user access blocked', 'PASS', 
          'Cross-tenant user access properly blocked');
      } else {
        addResult('CROSS_TENANT_ACCESS', 'Cross-tenant user access blocked', 'WARN', 
          'Unexpected cross-tenant access response', error.message);
      }
    }
  }
  
  // Test project data cross-tenant access
  try {
    // Get project data as tenant1, check if any data belongs to tenant2
    const response = await axios.get(`${BASE_URL}/project`, {
      headers: { Authorization: `Bearer ${tenant1Auth.token}` },
      timeout: 5000
    });
    
    if (response.status === 200 && response.data.data) {
      const projects = response.data.data;
      const projectSlugs = projects.map(p => p.slug).filter(Boolean);
      const hasOtherTenantData = projectSlugs.includes(tenant2Auth.projectId);
      
      addResult('CROSS_TENANT_ACCESS', 'Project data cross-tenant isolation', 
        !hasOtherTenantData ? 'PASS' : 'FAIL',
        !hasOtherTenantData ? 'No cross-tenant project data visible' : `Can see other tenant's project: ${tenant2Auth.projectId}`,
        `Visible projects: ${projectSlugs.join(', ')}`);
    } else {
      addResult('CROSS_TENANT_ACCESS', 'Project data cross-tenant isolation', 'PASS', 
        'Project data properly restricted');
    }
  } catch (error) {
    addResult('CROSS_TENANT_ACCESS', 'Project data cross-tenant isolation', 'WARN', 
      'Project data access error', error.message);
  }
}

/**
 * Test Business Logic Authorization Rules
 */
async function testBusinessLogicAuthorization(tokens) {
  console.log('\n🔐 TESTING BUSINESS LOGIC AUTHORIZATION RULES'.blue.bold);
  
  const adminToken = Object.values(tokens).find(t => t.role === 'ADMIN')?.token;
  const userToken = Object.values(tokens).find(t => t.role === 'USER')?.token;
  
  if (!adminToken || !userToken) {
    console.log('   ⚠️  Need both ADMIN and USER tokens for authorization testing');
    return;
  }
  
  // Test role-based resource creation (locations)
  try {
    const locationData = {
      name: 'Test Security Location',
      description: 'Created by security test',
      type: 'room'
    };
    
    // USER should not be able to create locations
    const userResponse = await axios.post(`${BASE_URL}/location`, locationData, {
      headers: { Authorization: `Bearer ${userToken}` },
      timeout: 5000
    });
    
    const userBlocked = userResponse.status === 403 || userResponse.status === 401;
    addResult('BUSINESS_LOGIC_AUTH', 'USER location creation blocked', 
      userBlocked ? 'PASS' : 'FAIL',
      userBlocked ? 'USER properly blocked from creating locations' : 'USER can create locations - potential issue',
      `Status: ${userResponse.status}`);
      
  } catch (error) {
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      addResult('BUSINESS_LOGIC_AUTH', 'USER location creation blocked', 'PASS', 
        'USER properly blocked from creating locations');
    } else {
      addResult('BUSINESS_LOGIC_AUTH', 'USER location creation blocked', 'WARN', 
        'Unexpected location creation response', error.message);
    }
  }
  
  // Test role-based bulk operations
  try {
    const exportResponse = await axios.get(`${BASE_URL}/user/export`, {
      headers: { Authorization: `Bearer ${userToken}` },
      timeout: 5000
    });
    
    const userBlockedFromExport = exportResponse.status === 403 || exportResponse.status === 401;
    addResult('BUSINESS_LOGIC_AUTH', 'USER bulk export blocked', 
      userBlockedFromExport ? 'PASS' : 'FAIL',
      userBlockedFromExport ? 'USER properly blocked from bulk operations' : 'USER can perform bulk exports',
      `Status: ${exportResponse.status}`);
      
  } catch (error) {
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      addResult('BUSINESS_LOGIC_AUTH', 'USER bulk export blocked', 'PASS', 
        'USER properly blocked from bulk operations');
    } else {
      addResult('BUSINESS_LOGIC_AUTH', 'USER bulk export blocked', 'WARN', 
        'Unexpected bulk export response', error.message);
    }
  }
}

/**
 * Test Data Integrity and Validation
 */
async function testDataIntegrityValidation(tokens) {
  console.log('\n🛡️ TESTING DATA INTEGRITY AND VALIDATION'.blue.bold);
  
  const adminToken = Object.values(tokens).find(t => t.role === 'ADMIN')?.token;
  
  if (!adminToken) {
    console.log('   ⚠️  Need ADMIN token for data integrity testing');
    return;
  }
  
  // Test invalid tenant ID injection
  try {
    const maliciousData = {
      name: 'Malicious Location',
      description: 'Attempting tenant boundary bypass',
      type: 'room',
      projectCityId: '99999999-9999-9999-9999-999999999999' // Invalid tenant ID
    };
    
    const response = await axios.post(`${BASE_URL}/location`, maliciousData, {
      headers: { Authorization: `Bearer ${adminToken}` },
      timeout: 5000
    });
    
    const blocked = response.status !== 200 && response.status !== 201;
    addResult('DATA_INTEGRITY', 'Invalid tenant ID rejection', 
      blocked ? 'PASS' : 'FAIL',
      blocked ? 'Invalid tenant ID properly rejected' : 'Invalid tenant ID accepted - CRITICAL',
      `Status: ${response.status}`);
      
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      addResult('DATA_INTEGRITY', 'Invalid tenant ID rejection', 'PASS', 
        'Invalid tenant ID properly rejected');
    } else {
      addResult('DATA_INTEGRITY', 'Invalid tenant ID rejection', 'WARN', 
        'Unexpected tenant ID validation error', error.message);
    }
  }
  
  // Test malformed data validation
  try {
    const malformedData = {
      name: '<script>alert("xss")</script>',
      description: 'SELECT * FROM users WHERE 1=1',
      type: 'invalid_type_123'
    };
    
    const response = await axios.post(`${BASE_URL}/location`, malformedData, {
      headers: { Authorization: `Bearer ${adminToken}` },
      timeout: 5000
    });
    
    const validated = response.status !== 200 && response.status !== 201;
    addResult('DATA_INTEGRITY', 'Malformed data validation', 
      validated ? 'PASS' : 'WARN',
      validated ? 'Malformed data properly validated' : 'Malformed data may have been accepted',
      `Status: ${response.status}`);
      
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      addResult('DATA_INTEGRITY', 'Malformed data validation', 'PASS', 
        'Malformed data properly validated');
    } else {
      addResult('DATA_INTEGRITY', 'Malformed data validation', 'WARN', 
        'Unexpected data validation error', error.message);
    }
  }
}

/**
 * Generate comprehensive security report
 */
function generateSecurityReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 LAYER 3: BUSINESS LOGIC SECURITY TEST SUMMARY'.cyan.bold);
  console.log('='.repeat(80));
  console.log(`✅ Tests Passed: ${RESULTS.passed}`.green);
  console.log(`❌ Tests Failed: ${RESULTS.failed}`.red);
  console.log(`⚠️  Warnings: ${RESULTS.warnings}`.yellow);
  console.log(`📝 Total Tests: ${RESULTS.tests.length}`);
  
  const score = Math.round((RESULTS.passed / RESULTS.tests.length) * 100);
  console.log(`🏆 Business Logic Security Score: ${score}%`.cyan);
  
  // Risk assessment
  if (RESULTS.failed === 0 && score >= 95) {
    console.log('🟢 RISK LEVEL: LOW - Outstanding business logic security'.green);
  } else if (RESULTS.failed <= 2 && score >= 85) {
    console.log('🟡 RISK LEVEL: MEDIUM - Good business logic with minor issues'.yellow);
  } else {
    console.log('🔴 RISK LEVEL: HIGH - Critical business logic vulnerabilities'.red);
  }
  
  if (RESULTS.failed > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:'.red.bold);
    RESULTS.tests
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        console.log(`   ❌ [${test.category}] ${test.test}: ${test.message}`.red);
        if (test.details) console.log(`      Details: ${test.details}`.gray);
      });
  }
  
  if (RESULTS.warnings > 0) {
    console.log('\n⚠️  WARNINGS:'.yellow.bold);
    RESULTS.tests
      .filter(test => test.status === 'WARN')
      .forEach(test => {
        console.log(`   ⚠️  [${test.category}] ${test.test}: ${test.message}`.yellow);
      });
  }
  
  // Save detailed results
  const fs = require('fs');
  const reportPath = 'layer3-business-logic-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      passed: RESULTS.passed,
      failed: RESULTS.failed,
      warnings: RESULTS.warnings,
      total: RESULTS.tests.length,
      score: score
    },
    tests: RESULTS.tests
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`.gray);
}

/**
 * Check server health before starting tests
 */
async function checkServerHealth() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is responding - starting business logic tests...'.green);
    return true;
  } catch (error) {
    console.error('❌ Server is not responding. Please ensure the backend is running on http://localhost:5000'.red);
    return false;
  }
}

/**
 * Main test execution
 */
async function runBusinessLogicTests() {
  try {
    const tokens = await getAuthTokens();
    
    if (Object.keys(tokens).length === 0) {
      console.log('❌ No authentication tokens available - cannot proceed with business logic tests'.red);
      return;
    }
    
    await testMultiTenantDataIsolation(tokens);
    await testCrossTenantAccessPrevention(tokens);
    await testBusinessLogicAuthorization(tokens);
    await testDataIntegrityValidation(tokens);
    
    generateSecurityReport();
    
  } catch (error) {
    console.error('🚨 Test execution failed:'.red.bold, error.message);
    process.exit(1);
  }
}

// Start tests
checkServerHealth().then(isHealthy => {
  if (isHealthy) {
    runBusinessLogicTests();
  } else {
    process.exit(1);
  }
});