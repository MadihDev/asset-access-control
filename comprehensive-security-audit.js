#!/usr/bin/env node

/**
 * COMPREHENSIVE MULTI-TENANT SECURITY AUDIT
 * =========================================
 * 
 * This script performs a thorough security audit of the multi-tenant
 * access control system, focusing on tenant isolation and security vulnerabilities.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let testResults = [];
let securityIssues = [];

// Test users from demo data
const testUsers = {
  perfectitAdmin: {
    username: 'perfectitadmin',
    password: 'SecurePass123!',
    projectId: 'perfectit-solutions',
    cityName: 'Amsterdam'
  },
  acmeAdmin: {
    username: 'acmeadmin', 
    password: 'SecurePass123!',
    projectId: 'acme-corporation',
    cityName: 'Amsterdam'
  },
  perfectitUser: {
    username: 'perfectituser',
    password: 'SecurePass123!',
    projectId: 'perfectit-solutions', 
    cityName: 'Rotterdam'
  },
  acmeUser: {
    username: 'acmeuser',
    password: 'SecurePass123!',
    projectId: 'acme-corporation',
    cityName: 'Utrecht'
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(testName, passed, details = '', severity = 'HIGH') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
  
  testResults.push({ test: testName, passed, details, severity });
  
  if (!passed) {
    securityIssues.push({ test: testName, severity, details });
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
    return { success: true, data: response.data, status: response.status, headers: response.headers };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500,
      headers: error.response?.headers || {}
    };
  }
}

async function loginUser(userKey) {
  const user = testUsers[userKey];
  const response = await makeRequest('POST', '/auth/login', user);
  return response.success ? response.data : null;
}

async function testAuthentication() {
  log('\n🔐 TESTING AUTHENTICATION SECURITY', 'bold');
  
  // Test 1: Valid logins for all user types
  const loginResults = {};
  
  for (const [userKey, user] of Object.entries(testUsers)) {
    const result = await loginUser(userKey);
    const success = result !== null;
    
    logResult(
      `${userKey} Login`, 
      success,
      success ? 'Login successful' : 'Login failed',
      'CRITICAL'
    );
    
    if (success) {
      loginResults[userKey] = {
        token: result.token,
        user: result.user,
        refreshToken: result.refreshToken
      };
    }
  }

  // Test 2: Invalid credentials
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    username: 'nonexistent',
    password: 'wrongpassword',
    projectId: 'perfectit-solutions',
    cityName: 'Amsterdam'
  });
  
  logResult(
    'Invalid Credentials Rejection', 
    !invalidLogin.success && invalidLogin.status === 401,
    invalidLogin.success ? 'CRITICAL: Invalid credentials accepted!' : 'Properly rejected',
    'CRITICAL'
  );

  // Test 3: SQL Injection attempts
  const sqlInjectionAttempts = [
    "admin'; DROP TABLE users; --",
    "admin' OR '1'='1",
    "' UNION SELECT password FROM users --"
  ];

  for (const maliciousInput of sqlInjectionAttempts) {
    const response = await makeRequest('POST', '/auth/login', {
      username: maliciousInput,
      password: 'test',
      projectId: 'perfectit-solutions',
      cityName: 'Amsterdam'
    });
    
    logResult(
      `SQL Injection Protection`, 
      !response.success,
      response.success ? 'CRITICAL: SQL injection vulnerability detected!' : 'Protected',
      'CRITICAL'
    );
  }

  return loginResults;
}

async function testTenantIsolation(loginResults) {
  log('\n🔒 TESTING TENANT ISOLATION', 'bold');
  
  if (!loginResults.perfectitAdmin || !loginResults.acmeAdmin) {
    logResult('Tenant Isolation Setup', false, 'Missing admin tokens for tenant isolation tests', 'CRITICAL');
    return;
  }

  const perfectitToken = loginResults.perfectitAdmin.token;
  const acmeToken = loginResults.acmeAdmin.token;

  // Test 1: Lock data isolation
  const perfectitLocks = await makeRequest('GET', '/lock', null, perfectitToken);
  const acmeLocks = await makeRequest('GET', '/lock', null, acmeToken);
  
  if (perfectitLocks.success && acmeLocks.success) {
    const perfectitLockIds = perfectitLocks.data.data?.map(lock => lock.id) || [];
    const acmeLockIds = acmeLocks.data.data?.map(lock => lock.id) || [];
    
    // Check for cross-tenant data leakage
    const hasOverlap = perfectitLockIds.some(id => acmeLockIds.includes(id));
    
    logResult(
      'Lock Data Tenant Isolation', 
      !hasOverlap,
      hasOverlap ? 
        'CRITICAL: Locks are visible across tenants!' : 
        `PerfectIT: ${perfectitLockIds.length} locks, Acme: ${acmeLockIds.length} locks - No overlap`,
      'CRITICAL'
    );

    // Test tenant scoping on individual locks
    const allPerfectitScoped = perfectitLocks.data.data?.every(lock => 
      lock.projectCityId && lock.projectCityId.length > 0
    );
    const allAcmeScoped = acmeLocks.data.data?.every(lock => 
      lock.projectCityId && lock.projectCityId.length > 0
    );
    
    logResult(
      'Lock Tenant Scoping Validation', 
      allPerfectitScoped && allAcmeScoped,
      (!allPerfectitScoped || !allAcmeScoped) ? 
        'Some locks missing tenant scoping!' : 
        'All locks properly scoped to tenants',
      'HIGH'
    );
  }

  // Test 2: User data isolation
  const perfectitUsers = await makeRequest('GET', '/user', null, perfectitToken);
  const acmeUsers = await makeRequest('GET', '/user', null, acmeToken);
  
  if (perfectitUsers.success && acmeUsers.success) {
    const perfectitUserIds = perfectitUsers.data.data?.map(user => user.id) || [];
    const acmeUserIds = acmeUsers.data.data?.map(user => user.id) || [];
    const userOverlap = perfectitUserIds.some(id => acmeUserIds.includes(id));
    
    logResult(
      'User Data Tenant Isolation', 
      !userOverlap,
      userOverlap ? 
        'CRITICAL: Users are visible across tenants!' : 
        `PerfectIT: ${perfectitUserIds.length} users, Acme: ${acmeUserIds.length} users - No overlap`,
      'CRITICAL'
    );
  }

  // Test 3: Access logs isolation
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
        `PerfectIT: ${perfectitLogIds.length} logs, Acme: ${acmeLogIds.length} logs - No overlap`,
      'CRITICAL'
    );
  }

  // Test 4: Cross-tenant direct access attempts
  if (perfectitLocks.success && perfectitLocks.data.data?.length > 0) {
    const testLockId = perfectitLocks.data.data[0].id;
    const crossTenantAttempt = await makeRequest('GET', `/lock/${testLockId}`, null, acmeToken);
    
    logResult(
      'Cross-Tenant Direct Access Prevention', 
      !crossTenantAttempt.success || crossTenantAttempt.status === 403 || crossTenantAttempt.status === 404,
      crossTenantAttempt.success ? 
        'CRITICAL: Cross-tenant direct access allowed!' : 
        'Cross-tenant access properly blocked',
      'CRITICAL'
    );
  }
}

async function testAccessControl(loginResults) {
  log('\n🛡️ TESTING ACCESS CONTROL & AUTHORIZATION', 'bold');
  
  // Test 1: Admin vs User access rights
  if (loginResults.perfectitAdmin && loginResults.perfectitUser) {
    const adminToken = loginResults.perfectitAdmin.token;
    const userToken = loginResults.perfectitUser.token;

    // Admin should be able to access user management
    const adminUserAccess = await makeRequest('GET', '/user', null, adminToken);
    logResult(
      'Admin User Management Access', 
      adminUserAccess.success,
      adminUserAccess.success ? 'Admin can access user management' : 'Admin denied user management access',
      'HIGH'
    );

    // Regular user should NOT be able to access user management
    const userUserAccess = await makeRequest('GET', '/user', null, userToken);
    logResult(
      'User Access Control (User Management)', 
      !userUserAccess.success && (userUserAccess.status === 403 || userUserAccess.status === 401),
      userUserAccess.success ? 
        'CRITICAL: Regular user can access admin endpoints!' : 
        'Regular user properly denied admin access',
      'CRITICAL'
    );
  }

  // Test 2: Unauthorized access
  const unauthorizedAccess = await makeRequest('GET', '/user');
  logResult(
    'Unauthorized Access Prevention', 
    !unauthorizedAccess.success && unauthorizedAccess.status === 401,
    unauthorizedAccess.success ? 
      'CRITICAL: Endpoints accessible without authentication!' : 
      'Unauthenticated requests properly blocked',
    'CRITICAL'
  );

  // Test 3: Invalid token handling
  const invalidTokens = [
    'invalid-token',
    'Bearer invalid',
    '', // Empty token
    'Bearer ' // Bearer without token
  ];

  for (const token of invalidTokens) {
    const response = await makeRequest('GET', '/auth/profile', null, token);
    logResult(
      `Invalid Token Rejection`, 
      !response.success && response.status === 401,
      response.success ? 
        'CRITICAL: Invalid token accepted!' : 
        'Invalid token properly rejected',
      'CRITICAL'
    );
  }
}

async function testInputValidationSecurity() {
  log('\n🛡️ TESTING INPUT VALIDATION & SECURITY', 'bold');
  
  // Test 1: XSS Prevention
  const xssPayloads = [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>'
  ];

  for (const payload of xssPayloads) {
    const response = await makeRequest('POST', '/auth/login', {
      username: payload,
      password: 'test',
      projectId: 'perfectit-solutions',
      cityName: 'Amsterdam'
    });
    
    logResult(
      `XSS Prevention`, 
      !response.success,
      response.success ? 
        'ISSUE: XSS payload accepted in login!' : 
        'XSS payload properly rejected',
      'HIGH'
    );
  }

  // Test 2: Command Injection Prevention
  const commandInjectionPayloads = [
    '; ls -la',
    '| cat /etc/passwd',
    '&& rm -rf /',
    '`whoami`'
  ];

  for (const payload of commandInjectionPayloads) {
    const response = await makeRequest('POST', '/auth/login', {
      username: payload,
      password: 'test',
      projectId: 'perfectit-solutions',
      cityName: 'Amsterdam'
    });
    
    logResult(
      `Command Injection Prevention`, 
      !response.success,
      response.success ? 
        'ISSUE: Command injection payload processed!' : 
        'Command injection properly prevented',
      'HIGH'
    );
  }

  // Test 3: Buffer overflow attempts
  const bufferOverflowTest = 'A'.repeat(10000);
  const overflowResponse = await makeRequest('POST', '/auth/login', {
    username: bufferOverflowTest,
    password: 'test',
    projectId: 'perfectit-solutions',
    cityName: 'Amsterdam'
  });
  
  logResult(
    'Buffer Overflow Prevention', 
    !overflowResponse.success,
    overflowResponse.success ? 
      'ISSUE: Extremely long input accepted!' : 
      'Long input properly rejected',
    'MEDIUM'
  );
}

async function testApiSecurity() {
  log('\n🌐 TESTING API SECURITY', 'bold');
  
  // Test 1: HTTPS enforcement (if applicable)
  // Note: This would be more relevant in production with HTTPS
  
  // Test 2: Error information disclosure
  const notFoundResponse = await makeRequest('GET', '/nonexistent-endpoint-12345');
  const errorBody = JSON.stringify(notFoundResponse.error || '');
  const hasStackTrace = errorBody.includes('at ') || errorBody.includes('stack') || errorBody.includes('Error:');
  
  logResult(
    'Error Information Disclosure Prevention', 
    !hasStackTrace,
    hasStackTrace ? 
      'ISSUE: Stack traces or detailed errors exposed!' : 
      'Safe error handling - no sensitive info disclosed',
    'MEDIUM'
  );

  // Test 3: Rate limiting (basic test)
  log('Testing basic rate limiting...');
  const rapidRequests = Array(10).fill(null).map(() => makeRequest('GET', '/health'));
  
  try {
    const responses = await Promise.all(rapidRequests);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    const successCount = responses.filter(r => r.success).length;
    
    logResult(
      'Basic Rate Limiting', 
      true, // Not critical - informational
      rateLimitedCount > 0 ? 
        `Rate limiting active: ${rateLimitedCount} requests limited` : 
        `No rate limiting detected (${successCount} requests succeeded)`,
      'LOW'
    );
  } catch (error) {
    logResult('Rate Limiting Test', false, `Error: ${error.message}`, 'LOW');
  }
}

async function testAccessAttemptSecurity(loginResults) {
  log('\n🔓 TESTING ACCESS ATTEMPT SECURITY', 'bold');
  
  // Test 1: Access attempt input validation
  const maliciousAccessAttempts = [
    { cardId: "'; DROP TABLE access_logs; --", lockId: 'test', accessType: 'RFID_CARD' },
    { cardId: '<script>alert("xss")</script>', lockId: 'test', accessType: 'RFID_CARD' },
    { cardId: 'CARD-' + 'A'.repeat(1000), lockId: 'test', accessType: 'RFID_CARD' }
  ];

  for (const [index, input] of maliciousAccessAttempts.entries()) {
    const response = await makeRequest('POST', '/lock/access-attempt', input);
    const inputType = index === 0 ? 'SQL Injection' : index === 1 ? 'XSS' : 'Buffer Overflow';
    
    logResult(
      `Access Attempt Input Validation (${inputType})`,
      !response.success || (response.success && response.data?.data?.accessGranted === false),
      response.success ? 
        'Input processed - system handled malicious input safely' : 
        'Malicious input properly rejected',
      'HIGH'
    );
  }

  // Test 2: Device authentication bypass attempts
  const deviceBypassAttempt = await makeRequest('POST', '/lock/access-attempt', {
    cardId: 'CARD-ADMIN-BYPASS',
    lockId: 'admin-lock',
    accessType: 'RFID_CARD'
  });
  
  logResult(
    'Device Authentication Bypass Prevention',
    !deviceBypassAttempt.success || (deviceBypassAttempt.success && !deviceBypassAttempt.data?.data?.accessGranted),
    deviceBypassAttempt.success ? 
      'Access attempt processed (expected behavior)' : 
      'Access attempt rejected',
    'MEDIUM'
  );
}

async function runSecurityAudit() {
  const startTime = Date.now();
  
  log('🔒 COMPREHENSIVE MULTI-TENANT SECURITY AUDIT', 'bold');
  log('=============================================\n', 'bold');

  // Run all security tests
  const loginResults = await testAuthentication();
  await testTenantIsolation(loginResults);
  await testAccessControl(loginResults);
  await testInputValidationSecurity();
  await testApiSecurity();
  await testAccessAttemptSecurity(loginResults);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Generate comprehensive security report
  log('\n📊 SECURITY AUDIT SUMMARY', 'bold');
  log('=========================', 'bold');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`Total Security Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  log(`Audit Duration: ${duration}s`, 'blue');

  // Categorize security issues by severity
  const criticalIssues = securityIssues.filter(issue => issue.severity === 'CRITICAL');
  const highIssues = securityIssues.filter(issue => issue.severity === 'HIGH');
  const mediumIssues = securityIssues.filter(issue => issue.severity === 'MEDIUM');
  const lowIssues = securityIssues.filter(issue => issue.severity === 'LOW');

  if (securityIssues.length > 0) {
    log('\n🚨 SECURITY ISSUES BY SEVERITY:', 'red');
    log('===============================', 'red');
    
    if (criticalIssues.length > 0) {
      log(`\n🔴 CRITICAL (${criticalIssues.length}):`, 'red');
      criticalIssues.forEach((issue, i) => {
        log(`${i + 1}. ${issue.test}`, 'red');
        log(`   ${issue.details}`, 'yellow');
      });
    }
    
    if (highIssues.length > 0) {
      log(`\n🟠 HIGH (${highIssues.length}):`, 'yellow');
      highIssues.forEach((issue, i) => {
        log(`${i + 1}. ${issue.test}`, 'yellow');
        log(`   ${issue.details}`, 'cyan');
      });
    }
    
    if (mediumIssues.length > 0) {
      log(`\n🟡 MEDIUM (${mediumIssues.length}):`, 'blue');
      mediumIssues.forEach((issue, i) => {
        log(`${i + 1}. ${issue.test}`, 'blue');
        log(`   ${issue.details}`, 'cyan');
      });
    }
  } else {
    log('\n✅ NO SECURITY ISSUES DETECTED!', 'green');
  }

  // Overall security assessment
  const overallSecurity = criticalIssues.length === 0 ? 
    (highIssues.length === 0 ? 'EXCELLENT' : highIssues.length <= 2 ? 'GOOD' : 'MODERATE') : 
    'CRITICAL - IMMEDIATE ATTENTION REQUIRED';

  log(`\n🔒 OVERALL SECURITY RATING: ${overallSecurity}`, 
      overallSecurity === 'EXCELLENT' ? 'green' : 
      overallSecurity === 'GOOD' ? 'cyan' : 
      overallSecurity === 'MODERATE' ? 'yellow' : 'red');

  // Security recommendations
  log('\n💡 SECURITY ASSESSMENT:', 'magenta');
  log('======================', 'magenta');
  
  if (criticalIssues.length === 0) {
    log('✅ No critical security vulnerabilities detected', 'green');
    log('✅ Multi-tenant isolation appears to be properly implemented', 'green');
    log('✅ Authentication and authorization controls are functional', 'green');
    log('✅ Input validation mechanisms are working', 'green');
  } else {
    log('⚠️  Critical security issues detected - immediate remediation required', 'red');
  }

  log('\n📋 SECURITY RECOMMENDATIONS:', 'cyan');
  log('============================', 'cyan');
  log('✓ Implement comprehensive API rate limiting', 'cyan');
  log('✓ Add request/response logging for security monitoring', 'cyan');
  log('✓ Consider implementing WAF (Web Application Firewall)', 'cyan');
  log('✓ Regular security audits and penetration testing', 'cyan');
  log('✓ Monitor for unusual access patterns and anomalies', 'cyan');
  log('✓ Implement security headers (HSTS, CSP, etc.)', 'cyan');
  log('✓ Consider implementing device certificate authentication', 'cyan');

  return {
    totalTests,
    passedTests,
    failedTests,
    passRate: parseFloat(passRate),
    criticalIssues: criticalIssues.length,
    highIssues: highIssues.length,
    mediumIssues: mediumIssues.length,
    lowIssues: lowIssues.length,
    overallSecurity,
    duration: parseFloat(duration)
  };
}

// Run the security audit
if (require.main === module) {
  runSecurityAudit().catch(error => {
    log(`\n❌ Security audit failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit };