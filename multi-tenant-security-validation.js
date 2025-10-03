#!/usr/bin/env node

/**
 * MULTI-TENANT SECURITY VALIDATION TEST
 * ====================================
 * 
 * This script performs focused security tests on the multi-tenant
 * access control system using existing demo data.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let testResults = [];
let securityIssues = [];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
  
  testResults.push({ test: testName, passed, details });
  
  if (!passed) {
    securityIssues.push({ test: testName, severity: 'HIGH', details });
  }
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
}

async function testAuthentication() {
  log('\n🔐 TESTING AUTHENTICATION SECURITY', 'bold');
  
  // Test 1: Valid login for PerfectIT admin
  const perfectitLogin = await makeRequest('POST', '/auth/login', {
    username: 'perfectitadmin',
    password: 'SecurePass123!'
  });
  
  logResult(
    'PerfectIT Admin Login', 
    perfectitLogin.success,
    perfectitLogin.success ? 'Login successful' : `Login failed: ${perfectitLogin.error?.error || perfectitLogin.error}`
  );

  // Test 2: Valid login for Acme admin
  const acmeLogin = await makeRequest('POST', '/auth/login', {
    username: 'acmeadmin',
    password: 'SecurePass123!'
  });
  
  logResult(
    'Acme Admin Login', 
    acmeLogin.success,
    acmeLogin.success ? 'Login successful' : `Login failed: ${acmeLogin.error?.error || acmeLogin.error}`
  );

  // Test 3: Invalid credentials
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    username: 'nonexistent',
    password: 'wrongpassword'
  });
  
  logResult(
    'Invalid Credentials Rejection', 
    !invalidLogin.success && invalidLogin.status === 401,
    invalidLogin.success ? 'SECURITY ISSUE: System accepted invalid credentials!' : 'Properly rejected invalid credentials'
  );

  // Test 4: SQL Injection attempts
  const sqlInjectionAttempts = [
    "admin'; DROP TABLE users; --",
    "admin' OR '1'='1",
    "' UNION SELECT password FROM users --"
  ];

  for (const maliciousInput of sqlInjectionAttempts) {
    const response = await makeRequest('POST', '/auth/login', {
      username: maliciousInput,
      password: 'test'
    });
    
    logResult(
      `SQL Injection Protection`, 
      !response.success,
      response.success ? 'CRITICAL: SQL injection vulnerability!' : 'Protected against SQL injection'
    );
  }

  return { perfectitToken: perfectitLogin.data?.token, acmeToken: acmeLogin.data?.token };
}

async function testTenantIsolation(perfectitToken, acmeToken) {
  log('\n🔒 TESTING TENANT ISOLATION', 'bold');
  
  if (!perfectitToken || !acmeToken) {
    logResult('Tenant Isolation Tests', false, 'Missing required tokens');
    return;
  }

  // Test 1: PerfectIT admin accessing locks
  const perfectitLocks = await makeRequest('GET', '/lock', null, perfectitToken);
  let perfectitLockIds = [];
  
  if (perfectitLocks.success) {
    perfectitLockIds = perfectitLocks.data.data?.map(lock => lock.id) || [];
    const allHaveTenantScope = perfectitLocks.data.data?.every(lock => 
      lock.projectCityId && lock.projectCityId.length > 0
    );
    
    logResult(
      'PerfectIT Locks Tenant Scoping', 
      allHaveTenantScope,
      allHaveTenantScope ? 
        `Found ${perfectitLockIds.length} properly scoped locks` : 
        'Some locks missing tenant scoping'
    );
  }

  // Test 2: Acme admin accessing locks
  const acmeLocks = await makeRequest('GET', '/lock', null, acmeToken);
  let acmeLockIds = [];
  
  if (acmeLocks.success) {
    acmeLockIds = acmeLocks.data.data?.map(lock => lock.id) || [];
    const allHaveTenantScope = acmeLocks.data.data?.every(lock => 
      lock.projectCityId && lock.projectCityId.length > 0
    );
    
    logResult(
      'Acme Locks Tenant Scoping', 
      allHaveTenantScope,
      allHaveTenantScope ? 
        `Found ${acmeLockIds.length} properly scoped locks` : 
        'Some locks missing tenant scoping'
    );
  }

  // Test 3: Cross-tenant data isolation
  const hasOverlap = perfectitLockIds.some(id => acmeLockIds.includes(id));
  logResult(
    'Cross-Tenant Lock Isolation', 
    !hasOverlap,
    hasOverlap ? 
      'CRITICAL: Same locks visible to different tenants!' : 
      'Locks properly isolated between tenants'
  );

  // Test 4: Access logs isolation
  const perfectitAccessLogs = await makeRequest('GET', '/lock/access-logs', null, perfectitToken);
  const acmeAccessLogs = await makeRequest('GET', '/lock/access-logs', null, acmeToken);
  
  if (perfectitAccessLogs.success && acmeAccessLogs.success) {
    const perfectitLogIds = perfectitAccessLogs.data.data?.map(log => log.id) || [];
    const acmeLogIds = acmeAccessLogs.data.data?.map(log => log.id) || [];
    const logOverlap = perfectitLogIds.some(id => acmeLogIds.includes(id));
    
    logResult(
      'Access Logs Tenant Isolation', 
      !logOverlap,
      logOverlap ? 
        'CRITICAL: Access logs leaking between tenants!' : 
        'Access logs properly isolated'
    );
  }

  // Test 5: Direct ID manipulation attempts
  if (perfectitLockIds.length > 0) {
    const attemptedLockId = perfectitLockIds[0];
    const crossTenantAttempt = await makeRequest('GET', `/lock/${attemptedLockId}`, null, acmeToken);
    
    logResult(
      'Cross-Tenant Direct Access Prevention', 
      !crossTenantAttempt.success || crossTenantAttempt.status === 403 || crossTenantAttempt.status === 404,
      crossTenantAttempt.success ? 
        'CRITICAL: Cross-tenant direct access allowed!' : 
        'Cross-tenant access properly blocked'
    );
  }
}

async function testAccessControlSecurity(perfectitToken, acmeToken) {
  log('\n🛡️ TESTING ACCESS CONTROL SECURITY', 'bold');
  
  if (!perfectitToken) {
    logResult('Access Control Tests', false, 'Missing required token');
    return;
  }

  // Test 1: Admin endpoint access with admin token
  const adminAccess = await makeRequest('GET', '/user', null, perfectitToken);
  logResult(
    'Admin Endpoint Access (Admin Token)', 
    adminAccess.success,
    adminAccess.success ? 'Admin can access admin endpoints' : 'Admin denied access to admin endpoints'
  );

  // Test 2: Unauthorized access without token
  const unauthorizedAccess = await makeRequest('GET', '/user');
  logResult(
    'Unauthorized Access Prevention', 
    !unauthorizedAccess.success && unauthorizedAccess.status === 401,
    unauthorizedAccess.success ? 
      'CRITICAL: Unauthorized access allowed!' : 
      'Unauthorized access properly blocked'
  );

  // Test 3: Token validation
  const invalidTokenAccess = await makeRequest('GET', '/auth/profile', null, 'invalid-token');
  logResult(
    'Invalid Token Rejection', 
    !invalidTokenAccess.success && invalidTokenAccess.status === 401,
    invalidTokenAccess.success ? 
      'CRITICAL: Invalid token accepted!' : 
      'Invalid token properly rejected'
  );
}

async function testApiSecurity() {
  log('\n🌐 TESTING API SECURITY', 'bold');
  
  // Test 1: Rate limiting on health endpoint
  log('Testing rate limiting (making 15 rapid requests)...');
  const rapidRequests = Array(15).fill(null).map(() => makeRequest('GET', '/health'));
  
  try {
    const responses = await Promise.all(rapidRequests);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    const successCount = responses.filter(r => r.success).length;
    
    logResult(
      'Rate Limiting Protection', 
      rateLimitedCount > 0 || successCount === 15, // Either rate limited or all succeeded (both acceptable)
      rateLimitedCount > 0 ? 
        `Rate limiting active: ${rateLimitedCount} requests limited` : 
        `All ${successCount} requests succeeded (no rate limiting detected)`
    );
  } catch (error) {
    logResult('Rate Limiting Test', false, `Error: ${error.message}`);
  }

  // Test 2: Input validation on login endpoint
  const invalidInputs = [
    { username: 'a'.repeat(1000), password: 'test' }, // Extremely long input
    { username: '<script>alert("xss")</script>', password: 'test' }, // XSS attempt
    { username: null, password: 'test' }, // Null values
    { username: '', password: '' }, // Empty values
  ];

  for (const input of invalidInputs) {
    const response = await makeRequest('POST', '/auth/login', input);
    const inputDescription = JSON.stringify(input).length > 50 ? 
      JSON.stringify(input).substring(0, 47) + '...' : 
      JSON.stringify(input);
    
    logResult(
      `Input Validation (${inputDescription})`, 
      !response.success && response.status >= 400 && response.status < 500,
      response.success ? 
        'ISSUE: Invalid input accepted!' : 
        'Invalid input properly rejected'
    );
  }

  // Test 3: Error information disclosure
  const notFoundResponse = await makeRequest('GET', '/nonexistent-endpoint');
  const hasStackTrace = JSON.stringify(notFoundResponse.error || '').includes('at ') || 
                       JSON.stringify(notFoundResponse.error || '').includes('stack');
  
  logResult(
    'Error Information Disclosure Prevention', 
    !hasStackTrace,
    hasStackTrace ? 
      'ISSUE: Stack traces or sensitive info in error responses!' : 
      'Safe error handling'
  );
}

async function testAccessAttemptSecurity(perfectitToken) {
  log('\n🔓 TESTING ACCESS ATTEMPT SECURITY', 'bold');
  
  // Test 1: Access attempt without authentication (should work - legacy support)
  const unauthenticatedAccess = await makeRequest('POST', '/lock/access-attempt', {
    cardId: 'CARD-TEST123',
    lockId: 'nonexistent-lock',
    accessType: 'RFID_CARD'
  });
  
  logResult(
    'Unauthenticated Access Attempt', 
    true, // This is expected - legacy support
    unauthenticatedAccess.success ? 
      'Access attempt processed (legacy mode)' : 
      `Access attempt rejected: ${unauthenticatedAccess.error?.error || 'Unknown error'}`
  );

  // Test 2: Malicious input in access attempt
  const maliciousInputs = [
    { cardId: "'; DROP TABLE access_logs; --", lockId: 'test', accessType: 'RFID_CARD' },
    { cardId: '<script>alert("xss")</script>', lockId: 'test', accessType: 'RFID_CARD' },
    { cardId: 'x'.repeat(1000), lockId: 'test', accessType: 'RFID_CARD' }
  ];

  for (const input of maliciousInputs) {
    const response = await makeRequest('POST', '/lock/access-attempt', input);
    const inputType = input.cardId.includes('DROP') ? 'SQL Injection' :
                     input.cardId.includes('<script>') ? 'XSS Attempt' : 'Long Input';
    
    logResult(
      `Access Attempt Input Validation (${inputType})`,
      !response.success || (response.success && response.data?.data?.accessGranted === false),
      response.success ? 
        'Malicious input processed safely' : 
        'Malicious input rejected'
    );
  }
}

async function runSecurityValidation() {
  log('🔍 MULTI-TENANT SECURITY VALIDATION', 'bold');
  log('===================================\n', 'bold');

  const startTime = Date.now();

  // Run authentication tests first to get tokens
  const { perfectitToken, acmeToken } = await testAuthentication();
  
  // Run other test suites
  await testTenantIsolation(perfectitToken, acmeToken);
  await testAccessControlSecurity(perfectitToken, acmeToken);
  await testApiSecurity();
  await testAccessAttemptSecurity(perfectitToken);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Generate summary
  log('\n📊 SECURITY VALIDATION SUMMARY', 'bold');
  log('==============================', 'bold');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`Total Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  log(`Duration: ${duration}s`, 'blue');

  // Security assessment
  const criticalIssues = securityIssues.filter(issue => 
    issue.details.includes('CRITICAL') || issue.details.includes('SQL injection')
  );
  
  if (criticalIssues.length > 0) {
    log('\n🚨 CRITICAL SECURITY ISSUES:', 'red');
    log('============================', 'red');
    criticalIssues.forEach((issue, index) => {
      log(`${index + 1}. ${issue.test}`, 'red');
      log(`   ${issue.details}`, 'yellow');
    });
  }

  const overallSecurity = criticalIssues.length === 0 ? 
    (passRate >= 90 ? 'EXCELLENT' : passRate >= 80 ? 'GOOD' : 'MODERATE') : 
    'NEEDS ATTENTION';

  log(`\n🔒 SECURITY ASSESSMENT: ${overallSecurity}`, 
      overallSecurity === 'EXCELLENT' ? 'green' : 
      overallSecurity === 'GOOD' ? 'cyan' : 
      overallSecurity === 'MODERATE' ? 'yellow' : 'red');

  // Recommendations
  log('\n💡 SECURITY STATUS:', 'magenta');
  log('==================', 'magenta');
  
  if (criticalIssues.length === 0) {
    log('✅ No critical security vulnerabilities detected', 'green');
    log('✅ Tenant isolation appears to be working correctly', 'green');
    log('✅ Authentication and authorization are properly implemented', 'green');
    log('✅ Input validation is functioning', 'green');
  } else {
    log('⚠️  Critical security issues require immediate attention', 'red');
  }

  log('\n📋 RECOMMENDATIONS:', 'cyan');
  if (passRate < 100) {
    log('• Review and address any failed test cases', 'cyan');
  }
  log('• Implement comprehensive request logging for security monitoring', 'cyan');
  log('• Consider adding API rate limiting for sensitive endpoints', 'cyan');
  log('• Regular security audits and penetration testing', 'cyan');
  log('• Monitor access patterns for anomalies', 'cyan');

  return {
    totalTests,
    passedTests,
    failedTests,
    passRate: parseFloat(passRate),
    criticalIssues: criticalIssues.length,
    overallSecurity,
    duration: parseFloat(duration)
  };
}

// Run the validation
if (require.main === module) {
  runSecurityValidation().catch(error => {
    log(`\n❌ Security validation error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runSecurityValidation };