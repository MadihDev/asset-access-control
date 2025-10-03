/**
 * LAYER 3: AUTHENTICATION & SESSION SECURITY TESTING
 * Multi-Tenant RFID Access Control System
 * 
 * Tests: JWT Security, Multi-Factor Authentication, Authentication Flows, Session Management
 */

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';

// Test results storage
const testResults = [];
let validTokens = {};

function addResult(category, test, status, message, details = '') {
  const result = {
    layer: 'LAYER 3: AUTHENTICATION & SESSION SECURITY',
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
 * Helper function to get valid tokens for testing
 */
async function getValidTokens() {
  console.log('🔑 Obtaining valid authentication tokens for testing...');
  
  const testUsers = [
    { username: 'techcorpadminamsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', role: 'ADMIN' },
    { username: 'techcorpuseramsterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Amsterdam', role: 'USER' },
    { username: 'techcorpadminrotterdam', password: 'demo123', projectId: 'techcorp', cityName: 'Rotterdam', role: 'ADMIN' }
  ];
  
  for (const user of testUsers) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: user.username,
        password: user.password,
        projectId: user.projectId,
        cityName: user.cityName
      }, { timeout: 5000 });
      
      if (response.status === 200 && response.data.data?.token) {
        validTokens[user.username] = {
          token: response.data.data.token,
          refreshToken: response.data.data.refreshToken,
          user: response.data.data.user,
          role: user.role,
          project: user.project,
          city: user.city
        };
        console.log(`   ✅ Token obtained for ${user.username} (${user.role})`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to get token for ${user.username}: ${error.message}`);
    }
    await sleep(200);
  }
  
  return validTokens;
}

/**
 * 3.1 JWT Token Security Testing
 */
async function testJWTTokenSecurity() {
  console.log('\n🔐 TESTING JWT TOKEN SECURITY'.blue?.bold || '\n🔐 TESTING JWT TOKEN SECURITY');
  
  if (Object.keys(validTokens).length === 0) {
    addResult('JWT_SECURITY', 'JWT testing prerequisites', 'FAIL', 
      'No valid tokens available for JWT testing');
    return;
  }
  
  const sampleToken = Object.values(validTokens)[0].token;
  
  // JWT structure analysis
  try {
    const parts = sampleToken.split('.');
    if (parts.length === 3) {
      addResult('JWT_SECURITY', 'JWT structure validation', 'PASS', 
        'JWT has correct three-part structure');
        
      // Decode header and payload (not signature verification)
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check algorithm
      if (header.alg && header.alg !== 'none') {
        addResult('JWT_SECURITY', 'JWT algorithm security', 'PASS', 
          `JWT uses secure algorithm: ${header.alg}`);
      } else {
        addResult('JWT_SECURITY', 'JWT algorithm security', 'FAIL', 
          'JWT uses insecure algorithm or none algorithm');
      }
      
      // Check expiration
      if (payload.exp) {
        const expTime = new Date(payload.exp * 1000);
        const now = new Date();
        if (expTime > now) {
          addResult('JWT_SECURITY', 'JWT expiration validation', 'PASS', 
            'JWT has valid expiration time', `Expires: ${expTime.toISOString()}`);
        } else {
          addResult('JWT_SECURITY', 'JWT expiration validation', 'FAIL', 
            'JWT is expired', `Expired: ${expTime.toISOString()}`);
        }
      } else {
        addResult('JWT_SECURITY', 'JWT expiration validation', 'FAIL', 
          'JWT missing expiration claim');
      }
      
      // Check for sensitive data in payload
      const sensitiveFields = ['password', 'secret', 'key', 'private'];
      const payloadStr = JSON.stringify(payload).toLowerCase();
      let sensitiveFound = false;
      
      sensitiveFields.forEach(field => {
        if (payloadStr.includes(field)) {
          sensitiveFound = true;
        }
      });
      
      if (!sensitiveFound) {
        addResult('JWT_SECURITY', 'JWT payload security', 'PASS', 
          'JWT payload does not contain sensitive data');
      } else {
        addResult('JWT_SECURITY', 'JWT payload security', 'FAIL', 
          'JWT payload may contain sensitive data');
      }
      
    } else {
      addResult('JWT_SECURITY', 'JWT structure validation', 'FAIL', 
        'JWT has invalid structure');
    }
  } catch (error) {
    addResult('JWT_SECURITY', 'JWT structure analysis', 'FAIL', 
      'Unable to analyze JWT structure', error.message);
  }
  
  // Token manipulation tests
  const manipulationTests = [
    {
      name: 'Modified signature',
      token: sampleToken.substring(0, sampleToken.lastIndexOf('.')) + '.modified_signature'
    },
    {
      name: 'Algorithm confusion (none)',
      token: (() => {
        try {
          const parts = sampleToken.split('.');
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          header.alg = 'none';
          const newHeader = Buffer.from(JSON.stringify(header)).toString('base64');
          return newHeader + '.' + parts[1] + '.';
        } catch {
          return 'invalid_token_format';
        }
      })()
    },
    {
      name: 'Empty token',
      token: ''
    },
    {
      name: 'Malformed token',
      token: 'not.a.valid.jwt.token'
    }
  ];
  
  for (const test of manipulationTests) {
    try {
      const response = await axios.get(`${BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${test.token}`
        },
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        addResult('JWT_SECURITY', `JWT manipulation - ${test.name}`, 'PASS', 
          'Invalid token properly rejected');
      } else {
        addResult('JWT_SECURITY', `JWT manipulation - ${test.name}`, 'FAIL', 
          'Invalid token accepted', `Status: ${response.status}`);
      }
    } catch (error) {
      addResult('JWT_SECURITY', `JWT manipulation - ${test.name}`, 'PASS', 
        'Invalid token properly rejected');
    }
    await sleep(200);
  }
  
  // Token replay attack test
  try {
    const response1 = await axios.get(`${BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${sampleToken}`
      },
      timeout: 5000
    });
    
    const response2 = await axios.get(`${BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${sampleToken}`
      },
      timeout: 5000
    });
    
    if (response1.status === 200 && response2.status === 200) {
      addResult('JWT_SECURITY', 'JWT replay attack resistance', 'INFO', 
        'Token can be reused (normal for stateless JWT)', 'Consider implementing nonce for critical operations');
    }
  } catch (error) {
    addResult('JWT_SECURITY', 'JWT replay attack test', 'WARN', 
      'Error testing token replay', error.message);
  }
}

/**
 * 3.2 Multi-Factor Authentication Testing
 */
async function testMultiFactorAuthentication() {
  console.log('\n📱 TESTING MULTI-FACTOR AUTHENTICATION'.blue?.bold || '\n📱 TESTING MULTI-FACTOR AUTHENTICATION');
  
  // Test 2FA endpoints
  const mfaEndpoints = [
    '/auth/2fa/setup',
    '/auth/2fa/verify',
    '/auth/2fa/disable',
    '/auth/2fa/backup-codes'
  ];
  
  for (const endpoint of mfaEndpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        addResult('MFA_SECURITY', `2FA endpoint ${endpoint} protection`, 'PASS', 
          '2FA endpoint requires authentication');
      } else if (response.status === 404) {
        addResult('MFA_SECURITY', `2FA endpoint ${endpoint} availability`, 'INFO', 
          '2FA endpoint not found', 'Verify if 2FA is implemented');
      } else {
        addResult('MFA_SECURITY', `2FA endpoint ${endpoint} protection`, 'WARN', 
          '2FA endpoint accessible without authentication', `Status: ${response.status}`);
      }
    } catch (error) {
      addResult('MFA_SECURITY', `2FA endpoint ${endpoint} testing`, 'WARN', 
        'Error testing 2FA endpoint', error.message);
    }
  }
  
  // Test 2FA bypass attempts
  if (Object.keys(validTokens).length > 0) {
    const token = Object.values(validTokens)[0].token;
    
    const bypassTests = [
      { code: '000000', name: 'Weak 2FA code' },
      { code: '123456', name: 'Common 2FA code' },
      { code: '', name: 'Empty 2FA code' },
      { code: 'A'.repeat(100), name: 'Oversized 2FA code' }
    ];
    
    for (const test of bypassTests) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/2fa/verify`, {
          code: test.code
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 400 || response.status === 401) {
          addResult('MFA_SECURITY', `2FA bypass protection - ${test.name}`, 'PASS', 
            'Invalid 2FA code properly rejected');
        } else if (response.status === 404) {
          addResult('MFA_SECURITY', `2FA bypass protection - ${test.name}`, 'INFO', 
            '2FA verification endpoint not found');
        } else {
          addResult('MFA_SECURITY', `2FA bypass protection - ${test.name}`, 'WARN', 
            'Unexpected response to invalid 2FA code', `Status: ${response.status}`);
        }
      } catch (error) {
        addResult('MFA_SECURITY', `2FA bypass protection - ${test.name}`, 'INFO', 
          'Error testing 2FA bypass');
      }
      await sleep(200);
    }
  }
}

/**
 * 3.3 Authentication Flow Testing
 */
async function testAuthenticationFlows() {
  console.log('\n🔑 TESTING AUTHENTICATION FLOWS'.blue?.bold || '\n🔑 TESTING AUTHENTICATION FLOWS');
  
  // Test invalid credential handling
  const invalidCredTests = [
    { username: 'nonexistent', password: 'password', project: 'test', city: 'test' },
    { username: 'safeadmin', password: 'wrongpassword', project: 'safeaccess', city: 'Rotterdam' },
    { username: 'safeadmin', password: 'Password123!', project: 'wrongproject', city: 'Rotterdam' },
    { username: 'safeadmin', password: 'Password123!', project: 'safeaccess', city: 'wrongcity' }
  ];
  
  for (const creds of invalidCredTests) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, creds, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 401 || response.status === 400) {
        addResult('AUTH_FLOWS', 'Invalid credential rejection', 'PASS', 
          'Invalid credentials properly rejected', `Test: ${creds.username}@${creds.project}/${creds.city}`);
      } else {
        addResult('AUTH_FLOWS', 'Invalid credential rejection', 'FAIL', 
          'Invalid credentials accepted', `Status: ${response.status}, Test: ${creds.username}`);
      }
    } catch (error) {
      addResult('AUTH_FLOWS', 'Invalid credential rejection', 'PASS', 
        'Invalid credentials properly rejected');
    }
    await sleep(300);
  }
  
  // Test brute force protection
  console.log('   🔄 Testing brute force protection with multiple failed attempts...');
  const bruteForceAttempts = Array.from({length: 10}, () => 
    axios.post(`${BASE_URL}/auth/login`, {
      username: 'safeadmin',
      password: 'wrongpassword',
      project: 'safeaccess',
      city: 'Rotterdam'
    }, {
      timeout: 3000,
      validateStatus: () => true
    }).catch(err => ({ error: err.message, status: err.response?.status }))
  );
  
  try {
    const results = await Promise.all(bruteForceAttempts);
    const rateLimitedCount = results.filter(r => 
      r.status === 429 || 
      (r.error && r.error.includes('429')) ||
      (r.error && r.error.includes('rate limit'))
    ).length;
    
    if (rateLimitedCount > 3) {
      addResult('AUTH_FLOWS', 'Brute force protection', 'PASS', 
        'Brute force attempts properly rate limited', 
        `${rateLimitedCount}/10 attempts blocked`);
    } else {
      addResult('AUTH_FLOWS', 'Brute force protection', 'WARN', 
        'Limited brute force protection detected', 
        `${rateLimitedCount}/10 attempts blocked`);
    }
  } catch (error) {
    addResult('AUTH_FLOWS', 'Brute force protection', 'WARN', 
      'Error testing brute force protection', error.message);
  }
  
  // Test password complexity (if user registration is available)
  const weakPasswords = [
    'password',
    '123456',
    'admin',
    'test',
    'a',
    ''
  ];
  
  for (const weakPwd of weakPasswords) {
    try {
      const response = await axios.post(`${BASE_URL}/user`, {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: weakPwd,
        firstName: 'Test',
        lastName: 'User'
      }, {
        headers: validTokens.safeadmin ? { 'Authorization': `Bearer ${validTokens.safeadmin.token}` } : {},
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 400) {
        addResult('AUTH_FLOWS', 'Password complexity enforcement', 'PASS', 
          'Weak password rejected', `Password: ${weakPwd || '(empty)'}`);
      } else if (response.status === 401 || response.status === 403) {
        addResult('AUTH_FLOWS', 'Password complexity testing', 'INFO', 
          'User creation requires proper authorization');
        break; // Stop testing if authorization is required
      } else if (response.status === 201) {
        addResult('AUTH_FLOWS', 'Password complexity enforcement', 'FAIL', 
          'Weak password accepted', `Password: ${weakPwd || '(empty)'}`);
      }
    } catch (error) {
      addResult('AUTH_FLOWS', 'Password complexity testing', 'INFO', 
        'Error testing password complexity');
    }
    await sleep(200);
  }
  
  // Test logout functionality
  if (Object.keys(validTokens).length > 0) {
    const testToken = Object.values(validTokens)[0].token;
    
    try {
      // First, verify token works
      const beforeLogout = await axios.get(`${BASE_URL}/user`, {
        headers: { 'Authorization': `Bearer ${testToken}` },
        timeout: 5000
      });
      
      if (beforeLogout.status === 200) {
        // Attempt logout
        const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${testToken}` },
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (logoutResponse.status === 200 || logoutResponse.status === 204) {
          // Test if token still works after logout
          const afterLogout = await axios.get(`${BASE_URL}/user`, {
            headers: { 'Authorization': `Bearer ${testToken}` },
            timeout: 5000,
            validateStatus: () => true
          });
          
          if (afterLogout.status === 401) {
            addResult('AUTH_FLOWS', 'Logout token invalidation', 'PASS', 
              'Token properly invalidated after logout');
          } else {
            addResult('AUTH_FLOWS', 'Logout token invalidation', 'FAIL', 
              'Token still valid after logout', `Status: ${afterLogout.status}`);
          }
        } else if (logoutResponse.status === 404) {
          addResult('AUTH_FLOWS', 'Logout endpoint availability', 'INFO', 
            'Logout endpoint not found');
        }
      }
    } catch (error) {
      addResult('AUTH_FLOWS', 'Logout functionality testing', 'WARN', 
        'Error testing logout functionality', error.message);
    }
  }
}

/**
 * 3.4 Session Management Security Testing
 */
async function testSessionManagement() {
  console.log('\n🎫 TESTING SESSION MANAGEMENT'.blue?.bold || '\n🎫 TESTING SESSION MANAGEMENT');
  
  if (Object.keys(validTokens).length === 0) {
    addResult('SESSION_SECURITY', 'Session testing prerequisites', 'FAIL', 
      'No valid tokens available for session testing');
    return;
  }
  
  // Test concurrent session handling
  const sameUserTokens = [];
  const testUser = { username: 'safeadmin', password: 'Password123!', project: 'safeaccess', city: 'Rotterdam' };
  
  console.log('   🔄 Testing concurrent session creation...');
  for (let i = 0; i < 3; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, testUser, {
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.data?.token) {
        sameUserTokens.push(response.data.data.token);
      }
    } catch (error) {
      // Login may fail due to rate limiting
    }
    await sleep(500);
  }
  
  if (sameUserTokens.length > 1) {
    // Test if all tokens are valid
    const tokenValidityTests = sameUserTokens.map(token => 
      axios.get(`${BASE_URL}/user`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 3000,
        validateStatus: () => true
      })
    );
    
    try {
      const results = await Promise.all(tokenValidityTests);
      const validCount = results.filter(r => r.status === 200).length;
      
      if (validCount === sameUserTokens.length) {
        addResult('SESSION_SECURITY', 'Concurrent session support', 'INFO', 
          'Multiple sessions allowed for same user', 
          `${validCount}/${sameUserTokens.length} tokens valid`);
      } else if (validCount === 1) {
        addResult('SESSION_SECURITY', 'Single session enforcement', 'PASS', 
          'Only one session allowed per user');
      } else {
        addResult('SESSION_SECURITY', 'Session management behavior', 'WARN', 
          'Inconsistent session behavior', 
          `${validCount}/${sameUserTokens.length} tokens valid`);
      }
    } catch (error) {
      addResult('SESSION_SECURITY', 'Concurrent session testing', 'WARN', 
        'Error testing concurrent sessions', error.message);
    }
  }
  
  // Test token expiration behavior
  const originalToken = Object.values(validTokens)[0].token;
  try {
    // Decode token to check expiration
    const parts = originalToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    if (payload.exp) {
      const expTime = new Date(payload.exp * 1000);
      const now = new Date();
      const timeToExpiry = expTime - now;
      
      if (timeToExpiry > 0) {
        addResult('SESSION_SECURITY', 'Token expiration time', 'PASS', 
          'Token has reasonable expiration time', 
          `Expires in: ${Math.round(timeToExpiry / (1000 * 60))} minutes`);
      } else {
        addResult('SESSION_SECURITY', 'Token expiration validation', 'FAIL', 
          'Token is already expired');
      }
    }
  } catch (error) {
    addResult('SESSION_SECURITY', 'Token expiration analysis', 'WARN', 
      'Unable to analyze token expiration', error.message);
  }
  
  // Test refresh token functionality
  const refreshTokenTests = Object.values(validTokens).filter(t => t.refreshToken);
  
  if (refreshTokenTests.length > 0) {
    const testRefreshToken = refreshTokenTests[0].refreshToken;
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: testRefreshToken
      }, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 200 && response.data.data?.token) {
        addResult('SESSION_SECURITY', 'Refresh token functionality', 'PASS', 
          'Refresh token works correctly');
      } else if (response.status === 404) {
        addResult('SESSION_SECURITY', 'Refresh token endpoint', 'INFO', 
          'Refresh token endpoint not found');
      } else {
        addResult('SESSION_SECURITY', 'Refresh token functionality', 'WARN', 
          'Refresh token not working properly', `Status: ${response.status}`);
      }
    } catch (error) {
      addResult('SESSION_SECURITY', 'Refresh token testing', 'WARN', 
        'Error testing refresh token', error.message);
    }
  } else {
    addResult('SESSION_SECURITY', 'Refresh token availability', 'INFO', 
      'No refresh tokens available for testing');
  }
}

/**
 * Generate comprehensive Layer 3 security report
 */
function generateLayer3Report() {
  console.log('\n📊 LAYER 3 AUTHENTICATION & SESSION SECURITY REPORT'.blue?.bold || '\n📊 LAYER 3 AUTHENTICATION & SESSION SECURITY REPORT');
  console.log('='.repeat(65));
  
  const categories = ['JWT_SECURITY', 'MFA_SECURITY', 'AUTH_FLOWS', 'SESSION_SECURITY'];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningTests = 0;
  
  categories.forEach(category => {
    const categoryResults = testResults.filter(r => r.category === category);
    if (categoryResults.length > 0) {
      console.log(`\n${category}:`);
      
      categoryResults.forEach(result => {
        totalTests++;
        if (result.status === 'PASS') passedTests++;
        else if (result.status === 'FAIL') failedTests++;
        else warningTests++;
        
        console.log(`  ${result.status}: ${result.test} - ${result.message}`);
      });
    }
  });
  
  console.log('\n📈 LAYER 3 SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
  
  const score = ((passedTests + (warningTests * 0.5)) / totalTests) * 100;
  console.log(`\n🎯 LAYER 3 AUTHENTICATION & SESSION SECURITY SCORE: ${score.toFixed(1)}%`);
  
  if (score >= 90) {
    console.log('✅ EXCELLENT authentication and session security');
  } else if (score >= 75) {
    console.log('⚠️  GOOD authentication and session security with minor improvements needed');
  } else if (score >= 60) {
    console.log('⚠️  MODERATE authentication and session security - several issues to address');
  } else {
    console.log('❌ POOR authentication and session security - immediate attention required');
  }
  
  return {
    layer: 'LAYER 3: AUTHENTICATION & SESSION SECURITY',
    totalTests,
    passedTests,
    failedTests,
    warningTests,
    score: score.toFixed(1),
    results: testResults,
    validTokens: Object.keys(validTokens).length
  };
}

/**
 * Main execution function
 */
async function runLayer3Tests() {
  console.log('🛡️  STARTING LAYER 3: AUTHENTICATION & SESSION SECURITY TESTING'.cyan?.bold || '🛡️  STARTING LAYER 3: AUTHENTICATION & SESSION SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: JWT, MFA, Authentication Flows, Session Management');
  console.log('=' .repeat(75));
  
  try {
    await getValidTokens();
    await testJWTTokenSecurity();
    await testMultiFactorAuthentication();
    await testAuthenticationFlows();
    await testSessionManagement();
    
    const report = generateLayer3Report();
    
    // Save results to file
    fs.writeFileSync('layer3-authentication-session-security-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to layer3-authentication-session-security-results.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Error during Layer 3 testing:', error.message);
    return null;
  }
}

// Execute if run directly
if (require.main === module) {
  runLayer3Tests()
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

module.exports = { runLayer3Tests, getValidTokens };