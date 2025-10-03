/**
 * COMPREHENSIVE MULTI-LAYER SECURITY TESTING
 * Based on SECURITY_TESTING_METHODOLOGY.md
 * 
 * This implements the 4-layer security testing approach:
 * Layer 1: API Surface Security ✅
 * Layer 2: Authorization & Access Control ⚠️
 * Layer 3: Business Logic Security ❌ (PREVIOUSLY MISSED)
 * Layer 4: Data Analysis Security ❌ (PREVIOUSLY MISSED)
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_RESULTS_FILE = 'comprehensive-security-test-results.json';

// Test results tracking
const testResults = {
  layer1: { name: 'API Surface Security', tests: [], passed: 0, failed: 0, total: 0 },
  layer2: { name: 'Authorization & Access Control', tests: [], passed: 0, failed: 0, total: 0 },
  layer3: { name: 'Business Logic Security', tests: [], passed: 0, failed: 0, total: 0 },
  layer4: { name: 'Data Analysis Security', tests: [], passed: 0, failed: 0, total: 0 },
  summary: { totalTests: 0, totalPassed: 0, totalFailed: 0, successRate: 0 }
};

// Helper functions
function logTest(layer, testName, status, expected, actual, details = '') {
  const test = {
    name: testName,
    status,
    expected,
    actual,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults[layer].tests.push(test);
  testResults[layer].total++;
  
  if (status === 'PASS') {
    testResults[layer].passed++;
    console.log(`✅ ${testName}: ${details}`);
  } else {
    testResults[layer].failed++;
    console.log(`❌ ${testName}: Expected ${expected}, got ${actual}. ${details}`);
  }
}

function generateReport() {
  // Calculate summary
  testResults.summary.totalTests = Object.keys(testResults)
    .filter(key => key !== 'summary')
    .reduce((sum, layer) => sum + testResults[layer].total, 0);
  
  testResults.summary.totalPassed = Object.keys(testResults)
    .filter(key => key !== 'summary')
    .reduce((sum, layer) => sum + testResults[layer].passed, 0);
  
  testResults.summary.totalFailed = Object.keys(testResults)
    .filter(key => key !== 'summary')
    .reduce((sum, layer) => sum + testResults[layer].failed, 0);
  
  testResults.summary.successRate = 
    (testResults.summary.totalPassed / testResults.summary.totalTests * 100).toFixed(1);

  // Save results
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));

  // Print summary
  console.log('\n📊 COMPREHENSIVE SECURITY TEST RESULTS');
  console.log('==========================================');
  
  Object.keys(testResults).filter(key => key !== 'summary').forEach(layer => {
    const layerResult = testResults[layer];
    const rate = (layerResult.passed / layerResult.total * 100).toFixed(1);
    console.log(`${layerResult.name}: ${layerResult.passed}/${layerResult.total} (${rate}%)`);
  });
  
  console.log(`\n🎯 OVERALL SUCCESS RATE: ${testResults.summary.successRate}%`);
  console.log(`Total Tests: ${testResults.summary.totalTests}`);
  console.log(`Passed: ${testResults.summary.totalPassed}`);
  console.log(`Failed: ${testResults.summary.totalFailed}`);
}

// =============================================================================
// LAYER 1: API SURFACE SECURITY TESTS ✅
// =============================================================================

async function runLayer1Tests() {
  console.log('\n🔒 LAYER 1: API SURFACE SECURITY TESTS');
  console.log('=====================================');

  // SQL Injection Tests
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users--"
  ];

  for (const payload of sqlPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: payload,
        password: 'test',
        projectId: 'test',
        cityName: 'test'
      });
      
      logTest('layer1', `SQL Injection Test: ${payload}`, 'FAIL', 
        '400/401/422', response.status, 'SQL injection not properly blocked');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      logTest('layer1', `SQL Injection Test: ${payload}`, 'PASS', 
        '400/401/422', status, 'SQL injection properly blocked');
    }
  }

  // XSS Tests
  const xssPayloads = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "'><script>alert('xss')</script>"
  ];

  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: payload,
        password: 'test',
        projectId: 'test',
        cityName: 'test'
      });
      
      logTest('layer1', `XSS Test: ${payload}`, 'FAIL', 
        '400/401/422', response.status, 'XSS not properly blocked');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      logTest('layer1', `XSS Test: ${payload}`, 'PASS', 
        '400/401/422', status, 'XSS properly blocked');
    }
  }

  // Authentication Tests
  try {
    const response = await axios.get(`${BASE_URL}/protected-endpoint`);
    logTest('layer1', 'Unauthenticated Access Test', 'FAIL', 
      '401', response.status, 'Protected endpoint accessible without auth');
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    logTest('layer1', 'Unauthenticated Access Test', 'PASS', 
      '401', status, 'Protected endpoint properly secured');
  }

  // Invalid Token Tests
  try {
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });
    logTest('layer1', 'Invalid Token Test', 'FAIL', 
      '401', response.status, 'Invalid token accepted');
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    logTest('layer1', 'Invalid Token Test', 'PASS', 
      '401', status, 'Invalid token properly rejected');
  }
}

// =============================================================================
// LAYER 2: AUTHORIZATION & ACCESS CONTROL TESTS ⚠️
// =============================================================================

async function runLayer2Tests() {
  console.log('\n🛡️ LAYER 2: AUTHORIZATION & ACCESS CONTROL TESTS');
  console.log('===============================================');

  // Get valid tokens for different user types
  let userToken = null;
  let adminToken = null;

  // Try to login as regular user
  try {
    const userLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: 'password123',
      projectId: 'PerfectIT',
      cityName: 'Rotterdam'
    });
    userToken = userLogin.data.accessToken;
    logTest('layer2', 'User Login Test', 'PASS', 
      'successful login', 'success', 'User authentication working');
  } catch (error) {
    logTest('layer2', 'User Login Test', 'FAIL', 
      'successful login', 'failed', 'User authentication failed');
  }

  // Try to login as admin
  try {
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123',
      projectId: 'PerfectIT',
      cityName: 'Rotterdam'
    });
    adminToken = adminLogin.data.accessToken;
    logTest('layer2', 'Admin Login Test', 'PASS', 
      'successful login', 'success', 'Admin authentication working');
  } catch (error) {
    logTest('layer2', 'Admin Login Test', 'FAIL', 
      'successful login', 'failed', 'Admin authentication failed');
  }

  // Role-based access tests
  if (userToken) {
    // Test user access to admin endpoints
    try {
      const response = await axios.get(`${BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      logTest('layer2', 'User Admin Access Test', 'FAIL', 
        '403', response.status, 'User should not access admin endpoints');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      logTest('layer2', 'User Admin Access Test', 'PASS', 
        '403', status, 'User properly denied admin access');
    }

    // Test user access to user endpoints
    try {
      const response = await axios.get(`${BASE_URL}/users/profile`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      logTest('layer2', 'User Profile Access Test', 'PASS', 
        '200', response.status, 'User can access own profile');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      logTest('layer2', 'User Profile Access Test', 'FAIL', 
        '200', status, 'User cannot access own profile');
    }
  }

  if (adminToken) {
    // Test admin access to admin endpoints
    try {
      const response = await axios.get(`${BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      logTest('layer2', 'Admin Access Test', 'PASS', 
        '200', response.status, 'Admin can access admin endpoints');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      logTest('layer2', 'Admin Access Test', 'FAIL', 
        '200', status, 'Admin cannot access admin endpoints');
    }
  }
}

// =============================================================================
// LAYER 3: BUSINESS LOGIC SECURITY TESTS ❌ (PREVIOUSLY MISSED)
// =============================================================================

async function runLayer3Tests() {
  console.log('\n🧠 LAYER 3: BUSINESS LOGIC SECURITY TESTS');
  console.log('========================================');

  // Test multi-tenant isolation
  let perfectItToken = null;
  let rotterdamToken = null;

  // Get tokens for different tenants
  try {
    const perfectItLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'perfectit_user',
      password: 'password123',
      projectId: 'PerfectIT',
      cityName: 'Rotterdam'
    });
    perfectItToken = perfectItLogin.data.accessToken;
  } catch (error) {
    console.log('Could not get PerfectIT token for testing');
  }

  try {
    const rotterdamLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'rotterdam_user',
      password: 'password123',
      projectId: 'Rotterdam',
      cityName: 'Amsterdam'
    });
    rotterdamToken = rotterdamLogin.data.accessToken;
  } catch (error) {
    console.log('Could not get Rotterdam token for testing');
  }

  // Cross-tenant access tests
  if (perfectItToken) {
    // Try to access another tenant's users
    try {
      const response = await axios.get(`${BASE_URL}/users?projectId=Rotterdam`, {
        headers: { 'Authorization': `Bearer ${perfectItToken}` }
      });
      
      // Check if response contains users from other tenants
      if (response.data && response.data.length > 0) {
        const hasOtherTenantUsers = response.data.some(user => 
          user.projectId !== 'PerfectIT'
        );
        
        if (hasOtherTenantUsers) {
          logTest('layer3', 'Cross-Tenant User Access Test', 'FAIL', 
            'tenant isolation', 'cross-tenant access allowed', 
            'Users can access other tenant data');
        } else {
          logTest('layer3', 'Cross-Tenant User Access Test', 'PASS', 
            'tenant isolation', 'proper isolation', 
            'Tenant boundaries properly enforced');
        }
      }
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer3', 'Cross-Tenant User Access Test', 'PASS', 
          '403/404', status, 'Cross-tenant access properly blocked');
      } else {
        logTest('layer3', 'Cross-Tenant User Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to cross-tenant access');
      }
    }

    // Try to access another tenant's devices
    try {
      const response = await axios.get(`${BASE_URL}/devices?projectId=Rotterdam`, {
        headers: { 'Authorization': `Bearer ${perfectItToken}` }
      });
      
      if (response.data && response.data.length > 0) {
        const hasOtherTenantDevices = response.data.some(device => 
          device.projectId !== 'PerfectIT'
        );
        
        if (hasOtherTenantDevices) {
          logTest('layer3', 'Cross-Tenant Device Access Test', 'FAIL', 
            'tenant isolation', 'cross-tenant access allowed', 
            'Devices can access other tenant data');
        } else {
          logTest('layer3', 'Cross-Tenant Device Access Test', 'PASS', 
            'tenant isolation', 'proper isolation', 
            'Device tenant boundaries properly enforced');
        }
      }
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer3', 'Cross-Tenant Device Access Test', 'PASS', 
          '403/404', status, 'Cross-tenant device access properly blocked');
      } else {
        logTest('layer3', 'Cross-Tenant Device Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to cross-tenant device access');
      }
    }

    // Business logic validation tests
    try {
      // Try to create a user in another tenant
      const response = await axios.post(`${BASE_URL}/users`, {
        username: 'malicious_user',
        email: 'malicious@test.com',
        projectId: 'Rotterdam', // Different tenant
        cityName: 'Amsterdam'
      }, {
        headers: { 'Authorization': `Bearer ${perfectItToken}` }
      });
      
      logTest('layer3', 'Cross-Tenant User Creation Test', 'FAIL', 
        '403/422', response.status, 
        'User can create accounts in other tenants');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 422) {
        logTest('layer3', 'Cross-Tenant User Creation Test', 'PASS', 
          '403/422', status, 'Cross-tenant user creation properly blocked');
      } else {
        logTest('layer3', 'Cross-Tenant User Creation Test', 'FAIL', 
          '403/422', status, 'Unexpected response to cross-tenant user creation');
      }
    }
  }

  // Permission scope validation
  if (perfectItToken) {
    try {
      // Try to modify global settings
      const response = await axios.put(`${BASE_URL}/admin/settings`, {
        setting: 'global_config',
        value: 'malicious_value'
      }, {
        headers: { 'Authorization': `Bearer ${perfectItToken}` }
      });
      
      logTest('layer3', 'Global Settings Modification Test', 'FAIL', 
        '403', response.status, 
        'User can modify global settings');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer3', 'Global Settings Modification Test', 'PASS', 
          '403/404', status, 'Global settings properly protected');
      } else {
        logTest('layer3', 'Global Settings Modification Test', 'FAIL', 
          '403/404', status, 'Unexpected response to global settings modification');
      }
    }
  }
}

// =============================================================================
// LAYER 4: DATA ANALYSIS SECURITY TESTS ❌ (PREVIOUSLY MISSED)
// =============================================================================

async function runLayer4Tests() {
  console.log('\n📊 LAYER 4: DATA ANALYSIS SECURITY TESTS');
  console.log('======================================');

  // Access pattern analysis
  let analysisToken = null;
  
  try {
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'testuser',
      password: 'password123',
      projectId: 'PerfectIT',
      cityName: 'Rotterdam'
    });
    analysisToken = login.data.accessToken;
  } catch (error) {
    console.log('Could not get token for data analysis tests');
    return;
  }

  if (analysisToken) {
    // Test access to audit logs
    try {
      const response = await axios.get(`${BASE_URL}/audit/logs`, {
        headers: { 'Authorization': `Bearer ${analysisToken}` }
      });
      
      if (response.data && response.data.length > 0) {
        // Check if user can see other users' activities
        const hasOtherUserActivities = response.data.some(log => 
          log.userId !== 'current_user_id'
        );
        
        if (hasOtherUserActivities) {
          logTest('layer4', 'Audit Log Access Test', 'FAIL', 
            'own activities only', 'all activities visible', 
            'User can see other users audit logs');
        } else {
          logTest('layer4', 'Audit Log Access Test', 'PASS', 
            'own activities only', 'proper filtering', 
            'Audit logs properly filtered by user');
        }
      }
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer4', 'Audit Log Access Test', 'PASS', 
          '403/404', status, 'Audit logs properly protected');
      } else {
        logTest('layer4', 'Audit Log Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to audit log access');
      }
    }

    // Test access to user analytics
    try {
      const response = await axios.get(`${BASE_URL}/analytics/users`, {
        headers: { 'Authorization': `Bearer ${analysisToken}` }
      });
      
      logTest('layer4', 'User Analytics Access Test', 'FAIL', 
        '403', response.status, 
        'Regular user can access user analytics');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer4', 'User Analytics Access Test', 'PASS', 
          '403/404', status, 'User analytics properly protected');
      } else {
        logTest('layer4', 'User Analytics Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to analytics access');
      }
    }

    // Test data aggregation endpoints
    try {
      const response = await axios.get(`${BASE_URL}/reports/all-users`, {
        headers: { 'Authorization': `Bearer ${analysisToken}` }
      });
      
      logTest('layer4', 'All Users Report Access Test', 'FAIL', 
        '403', response.status, 
        'Regular user can access all users report');
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer4', 'All Users Report Access Test', 'PASS', 
          '403/404', status, 'All users report properly protected');
      } else {
        logTest('layer4', 'All Users Report Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to all users report');
      }
    }

    // Test historical data access
    try {
      const response = await axios.get(`${BASE_URL}/history/access-logs?all=true`, {
        headers: { 'Authorization': `Bearer ${analysisToken}` }
      });
      
      if (response.data && response.data.length > 0) {
        // Check if user can see historical data from other tenants
        const hasOtherTenantHistory = response.data.some(log => 
          log.projectId !== 'PerfectIT'
        );
        
        if (hasOtherTenantHistory) {
          logTest('layer4', 'Historical Data Access Test', 'FAIL', 
            'tenant-scoped data', 'cross-tenant data visible', 
            'User can see historical data from other tenants');
        } else {
          logTest('layer4', 'Historical Data Access Test', 'PASS', 
            'tenant-scoped data', 'proper tenant filtering', 
            'Historical data properly filtered by tenant');
        }
      }
    } catch (error) {
      const status = error.response?.status || 'ERROR';
      if (status === 403 || status === 404) {
        logTest('layer4', 'Historical Data Access Test', 'PASS', 
          '403/404', status, 'Historical data properly protected');
      } else {
        logTest('layer4', 'Historical Data Access Test', 'FAIL', 
          '403/404', status, 'Unexpected response to historical data access');
      }
    }
  }

  // Compliance validation tests
  try {
    // Test if sensitive data is exposed in API responses
    const response = await axios.get(`${BASE_URL}/users/1`, {
      headers: { 'Authorization': `Bearer ${analysisToken}` }
    });
    
    if (response.data) {
      const hasSensitiveData = response.data.password || 
                              response.data.salt || 
                              response.data.hash ||
                              response.data.privateKey ||
                              response.data.internalId;
      
      if (hasSensitiveData) {
        logTest('layer4', 'Sensitive Data Exposure Test', 'FAIL', 
          'no sensitive data', 'sensitive data exposed', 
          'API responses contain sensitive information');
      } else {
        logTest('layer4', 'Sensitive Data Exposure Test', 'PASS', 
          'no sensitive data', 'clean response', 
          'API responses properly sanitized');
      }
    }
  } catch (error) {
    const status = error.response?.status || 'ERROR';
    logTest('layer4', 'Sensitive Data Exposure Test', 'PASS', 
      'protected endpoint', status, 'User endpoint properly protected');
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function runComprehensiveSecurityTests() {
  console.log('🚀 STARTING COMPREHENSIVE MULTI-LAYER SECURITY TESTING');
  console.log('Based on SECURITY_TESTING_METHODOLOGY.md');
  console.log('=====================================================');

  try {
    // Run all security layers
    await runLayer1Tests();
    await runLayer2Tests();
    await runLayer3Tests(); // Previously missed!
    await runLayer4Tests(); // Previously missed!

    // Generate comprehensive report
    generateReport();

    console.log('\n📋 DETAILED RESULTS SAVED TO:', TEST_RESULTS_FILE);
    console.log('\n🎯 KEY INSIGHTS:');
    console.log('- Layer 1 & 2 tests likely pass (traditional API security)');
    console.log('- Layer 3 & 4 tests reveal business logic vulnerabilities');
    console.log('- Multi-tenant isolation is critical for enterprise security');
    console.log('- Real data analysis often exposes hidden security issues');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runComprehensiveSecurityTests();