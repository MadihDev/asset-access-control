/**
 * ENHANCED Layer 2: Authorization & Access Control Security Testing
 * Using Real Demo Data for Comprehensive Testing
 * 
 * This test focuses on role-based access control, permission boundaries,
 * and authorization logic using actual demo users from the system.
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

// Demo users with known credentials (using project slug instead of ID)
const DEMO_USERS = [
  { username: 'techcorpadminamsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', expectedRole: 'ADMIN' },
  { username: 'techcorpuseramsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', expectedRole: 'USER' },
  { username: 'techcorpsupervisoramsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', expectedRole: 'SUPERVISOR' },
  { username: 'safeaccessadminrotterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Rotterdam', expectedRole: 'ADMIN' },
  { username: 'safeaccessguard1rotterdam', password: 'demo123', projectId: 'safeaccess', cityName: 'Rotterdam', expectedRole: 'USER' }
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

console.log('🔐 STARTING ENHANCED LAYER 2: AUTHORIZATION & ACCESS CONTROL TESTS'.cyan.bold);
console.log('=' * 80);

/**
 * Get authentication tokens for different user roles
 */
async function getAuthTokens() {
  console.log('\n🔑 ACQUIRING AUTHENTICATION TOKENS'.blue.bold);
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
        tokens[user.expectedRole + '_' + user.projectId] = {
          token: response.data.data.accessToken,
          user: response.data.data.user,
          username: user.username,
          role: response.data.data.user.role,
          project: user.projectId,
          city: user.cityName
        };
        console.log(`   ✓ ${user.username} (${response.data.data.user.role})`.green);
      } else {
        console.log(`   ✗ ${user.username}: Login failed`.red);
      }
    } catch (error) {
      console.log(`   ✗ ${user.username}: ${error.message}`.red);
    }
    
    // Rate limiting protection
    await sleep(100);
  }
  
  console.log(`\n📊 Successfully acquired ${Object.keys(tokens).length} authentication tokens`);
  return tokens;
}

/**
 * Test Role-Based Access Control
 */
async function testRoleBasedAccessControl(tokens) {
  console.log('\n👮 TESTING ROLE-BASED ACCESS CONTROL'.blue.bold);
  
  const adminToken = Object.values(tokens).find(t => t.role === 'ADMIN')?.token;
  const userToken = Object.values(tokens).find(t => t.role === 'USER')?.token;
  const supervisorToken = Object.values(tokens).find(t => t.role === 'SUPERVISOR')?.token;
  
  // Test admin-only endpoints
  const protectedEndpoints = [
    '/user/',           // User management
    '/user/export',     // User export  
    '/device',          // Device management
    '/audit'            // Audit logs (correct endpoint)
  ];
  
  for (const endpoint of protectedEndpoints) {
    // Test with USER role (should be blocked for most endpoints)
    if (userToken) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 5000
        });
        
        const blocked = response.status === 403 || response.status === 401;
        addResult('ROLE_ACCESS', `USER blocked from ${endpoint}`, 
          blocked ? 'PASS' : 'FAIL',
          blocked ? `Properly blocked (${response.status})` : `Incorrectly allowed (${response.status})`,
          blocked ? null : `USER should not access admin endpoints`);
          
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          addResult('ROLE_ACCESS', `USER blocked from ${endpoint}`, 'PASS', 
            `Properly blocked (${error.response.status})`);
        } else {
          addResult('ROLE_ACCESS', `USER blocked from ${endpoint}`, 'WARN', 
            'Unexpected error', error.message);
        }
      }
    }
    
    // Test with ADMIN role (should be allowed)
    if (adminToken) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          timeout: 5000
        });
        
        const allowed = response.status === 200;
        addResult('ROLE_ACCESS', `ADMIN access to ${endpoint}`, 
          allowed ? 'PASS' : 'WARN',
          allowed ? `Properly allowed (${response.status})` : `Unexpected status (${response.status})`,
          allowed ? null : `Admin should have access to admin endpoints`);
          
      } catch (error) {
        if (error.response) {
          addResult('ROLE_ACCESS', `ADMIN access to ${endpoint}`, 'WARN', 
            `Unexpected admin restriction (${error.response.status})`, error.message);
        } else {
          addResult('ROLE_ACCESS', `ADMIN access to ${endpoint}`, 'WARN', 
            'Connection error', error.message);
        }
      }
    }
    
    await sleep(200); // Rate limiting protection
  }
}

/**
 * Test Token Security
 */
async function testTokenSecurity() {
  console.log('\n🔐 TESTING TOKEN SECURITY'.blue.bold);
  
  // Test malformed tokens
  const malformedTokens = [
    'invalid-token',
    'Bearer.invalid.token',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
    ''
  ];
  
  for (const token of malformedTokens) {
    try {
      const response = await axios.get(`${BASE_URL}/user/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      
      const rejected = response.status === 401 || response.status === 403;
      addResult('TOKEN_SECURITY', 'Malformed token validation', 
        rejected ? 'PASS' : 'FAIL',
        rejected ? `Malformed token rejected (${response.status})` : `Malformed token accepted (${response.status})`,
        `Token: ${token.substring(0, 30)}...`);
        
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        addResult('TOKEN_SECURITY', 'Malformed token validation', 'PASS', 
          `Malformed token properly rejected (${error.response.status})`);
      } else {
        addResult('TOKEN_SECURITY', 'Malformed token validation', 'WARN', 
          'Unexpected token validation response', error.message);
      }
    }
  }
  
  // Test token with modified payload (privilege escalation attempt)
  const tamperedPayload = {
    id: '999',
    username: 'hacker',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  // Create a token with tampered claims (this would have an invalid signature)
  const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
    Buffer.from(JSON.stringify(tamperedPayload)).toString('base64') + 
    '.fake_signature_that_should_fail_validation';
  
  try {
    const response = await axios.get(`${BASE_URL}/user/`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
      timeout: 5000
    });
    
    const rejected = response.status === 401 || response.status === 403;
    addResult('TOKEN_SECURITY', 'Tampered token claims', 
      rejected ? 'PASS' : 'FAIL',
      rejected ? `Tampered token rejected (${response.status})` : `Tampered token accepted - CRITICAL VULNERABILITY`,
      rejected ? 'Token signature validation working' : 'JWT signature validation bypassed');
      
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      addResult('TOKEN_SECURITY', 'Tampered token claims', 'PASS', 
        'Tampered token properly rejected - signature validation working');
    } else {
      addResult('TOKEN_SECURITY', 'Tampered token claims', 'WARN', 
        'Unexpected tampered token response', error.message);
    }
  }
}

/**
 * Test Privilege Escalation Prevention
 */
async function testPrivilegeEscalation() {
  console.log('\n⬆️ TESTING PRIVILEGE ESCALATION PREVENTION'.blue.bold);
  
  // Test parameter injection in login
  try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'techcorpuseramsterdam',
        password: 'demo123',
        projectId: 'techcorp',
        cityName: 'Amsterdam',
        role: 'ADMIN',           // Attempt to inject admin role
        isAdmin: true,           // Attempt to inject admin flag
        permissions: ['all']     // Attempt to inject permissions
      }, { timeout: 5000 });    // Check if the injected parameters affected the authentication
    if (response.status === 200 && response.data.data) {
      const userRole = response.data.data.user.role;
      const escalationAttempted = userRole === 'ADMIN';
      
      addResult('PRIVILEGE_ESCALATION', 'Parameter injection in login', 
        escalationAttempted ? 'FAIL' : 'PASS',
        escalationAttempted ? 'Privilege escalation successful - CRITICAL' : 'Parameter injection properly ignored',
        `User role returned: ${userRole}`);
    } else {
      addResult('PRIVILEGE_ESCALATION', 'Parameter injection in login', 'PASS', 
        'Login request properly rejected');
    }
    
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      addResult('PRIVILEGE_ESCALATION', 'Parameter injection in login', 'PASS', 
        'Parameter injection attempt blocked');
    } else {
      addResult('PRIVILEGE_ESCALATION', 'Parameter injection in login', 'WARN', 
        'Unexpected privilege escalation test response', error.message);
    }
  }
  
  // Test HTTP Parameter Pollution
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, 
      'username=techcorpuseramsterdam&password=wrongpassword&username=techcorpadminamsterdam&password=demo123&projectId=techcorp&cityName=Amsterdam',
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
      }
    );
    
    const rejected = response.status !== 200;
    addResult('PRIVILEGE_ESCALATION', 'HTTP parameter pollution', 
      rejected ? 'PASS' : 'FAIL',
      rejected ? 'Parameter pollution blocked' : 'Parameter pollution may have succeeded',
      `Status: ${response.status}`);
      
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      addResult('PRIVILEGE_ESCALATION', 'HTTP parameter pollution', 'PASS', 
        'Parameter pollution properly blocked');
    } else {
      addResult('PRIVILEGE_ESCALATION', 'HTTP parameter pollution', 'WARN', 
        'Unexpected parameter pollution response', error.message);
    }
  }
}

/**
 * Test Cross-User Access Prevention
 */
async function testCrossUserAccess(tokens) {
  console.log('\n🚫 TESTING CROSS-USER ACCESS PREVENTION'.blue.bold);
  
  const tokenEntries = Object.entries(tokens);
  
  if (tokenEntries.length < 2) {
    console.log('   ⚠️  Need at least 2 different user tokens for cross-user testing');
    return;
  }
  
  const [user1Key, user1] = tokenEntries[0];
  const [user2Key, user2] = tokenEntries[1];
  
  // Test profile access - users should only access their own profile
  try {
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${user1.token}` },
      timeout: 5000
    });
    
    if (response.status === 200 && response.data.data) {
      const profileUser = response.data.data.username;
      const ownProfile = profileUser === user1.username;
      
      addResult('CROSS_USER_ACCESS', 'Own profile access', 
        ownProfile ? 'PASS' : 'FAIL',
        ownProfile ? 'User can access own profile' : 'Profile mismatch detected',
        `Expected: ${user1.username}, Got: ${profileUser}`);
    } else {
      addResult('CROSS_USER_ACCESS', 'Own profile access', 'WARN', 
        'Profile access failed', `Status: ${response.status}`);
    }
    
  } catch (error) {
    addResult('CROSS_USER_ACCESS', 'Own profile access', 'WARN', 
      'Profile access error', error.message);
  }
  
  // Test if user can modify another user's data (if such endpoint exists)
  if (user1.role !== 'ADMIN' && user2.role !== 'ADMIN') {
    try {
      const response = await axios.put(`${BASE_URL}/user/${user2.user.id}`, {
        firstName: 'Hacked',
        lastName: 'User'
      }, {
        headers: { Authorization: `Bearer ${user1.token}` },
        timeout: 5000
      });
      
      const blocked = response.status === 401 || response.status === 403;
      addResult('CROSS_USER_ACCESS', 'Cross-user modification blocked', 
        blocked ? 'PASS' : 'FAIL',
        blocked ? 'Cross-user modification properly blocked' : 'Cross-user modification allowed - CRITICAL',
        `User ${user1.username} attempting to modify ${user2.username}`);
        
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        addResult('CROSS_USER_ACCESS', 'Cross-user modification blocked', 'PASS', 
          'Cross-user modification properly blocked');
      } else {
        addResult('CROSS_USER_ACCESS', 'Cross-user modification blocked', 'WARN', 
          'Unexpected cross-user access response', error.message);
      }
    }
  }
}

/**
 * Test Project/Tenant Isolation
 */
async function testProjectIsolation(tokens) {
  console.log('\n🏢 TESTING PROJECT/TENANT ISOLATION'.blue.bold);
  
  // Find tokens from different projects
  const techcorpToken = Object.values(tokens).find(t => t.project === 'techcorp');
  const safeaccessToken = Object.values(tokens).find(t => t.project === 'safeaccess');
  
  if (!techcorpToken || !safeaccessToken) {
    console.log('   ⚠️  Need tokens from different projects for isolation testing');
    return;
  }
  
  // Test if techcorp user can access safeaccess data
  try {
    const response = await axios.get(`${BASE_URL}/user/`, {
      headers: { Authorization: `Bearer ${techcorpToken.token}` },
      timeout: 5000
    });
    
    if (response.status === 200 && response.data.data) {
      // Check if returned users are properly filtered by project
      const users = response.data.data;
      const crossProjectUsers = users.filter(user => {
        // This would need to be adjusted based on actual API response structure
        return user.project && user.project !== techcorpToken.project;
      });
      
      const isolated = crossProjectUsers.length === 0;
      addResult('PROJECT_ISOLATION', 'Cross-project data isolation', 
        isolated ? 'PASS' : 'FAIL',
        isolated ? 'Project data properly isolated' : 'Cross-project data leakage detected',
        `TechCorp user sees ${crossProjectUsers.length} non-TechCorp users`);
    } else {
      addResult('PROJECT_ISOLATION', 'Cross-project data isolation', 'WARN', 
        'Unable to test project isolation', `Status: ${response.status}`);
    }
    
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      addResult('PROJECT_ISOLATION', 'Cross-project data isolation', 'PASS', 
        'Cross-project access properly blocked');
    } else {
      addResult('PROJECT_ISOLATION', 'Cross-project data isolation', 'WARN', 
        'Project isolation test error', error.message);
    }
  }
}

/**
 * Generate comprehensive security report
 */
function generateSecurityReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 LAYER 2: AUTHORIZATION & ACCESS CONTROL TEST SUMMARY'.cyan.bold);
  console.log('='.repeat(80));
  console.log(`✅ Tests Passed: ${RESULTS.passed}`.green);
  console.log(`❌ Tests Failed: ${RESULTS.failed}`.red);
  console.log(`⚠️  Warnings: ${RESULTS.warnings}`.yellow);
  console.log(`📝 Total Tests: ${RESULTS.tests.length}`);
  
  const score = Math.round((RESULTS.passed / RESULTS.tests.length) * 100);
  console.log(`🏆 Authorization Security Score: ${score}%`.cyan);
  
  // Risk assessment
  if (RESULTS.failed === 0 && score >= 95) {
    console.log('🟢 RISK LEVEL: LOW - Outstanding authorization controls'.green);
  } else if (RESULTS.failed <= 2 && score >= 85) {
    console.log('🟡 RISK LEVEL: MEDIUM - Good authorization with minor issues'.yellow);
  } else {
    console.log('🔴 RISK LEVEL: HIGH - Critical authorization vulnerabilities'.red);
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
  const reportPath = 'layer2-authorization-test-report.json';
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
    console.log('✅ Server is responding - starting authorization tests...'.green);
    return true;
  } catch (error) {
    console.error('❌ Server is not responding. Please ensure the backend is running on http://localhost:5000'.red);
    return false;
  }
}

/**
 * Main test execution
 */
async function runAuthorizationTests() {
  try {
    const tokens = await getAuthTokens();
    
    if (Object.keys(tokens).length === 0) {
      console.log('❌ No authentication tokens available - cannot proceed with authorization tests'.red);
      return;
    }
    
    await testRoleBasedAccessControl(tokens);
    await testTokenSecurity();
    await testPrivilegeEscalation();
    await testCrossUserAccess(tokens);
    await testProjectIsolation(tokens);
    
    generateSecurityReport();
    
  } catch (error) {
    console.error('🚨 Test execution failed:'.red.bold, error.message);
    process.exit(1);
  }
}

// Start tests
checkServerHealth().then(isHealthy => {
  if (isHealthy) {
    runAuthorizationTests();
  } else {
    process.exit(1);
  }
});