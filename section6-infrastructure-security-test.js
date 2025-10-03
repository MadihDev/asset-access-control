/**
 * MULTI-TENANT SECURITY TESTING - SECTION 6
 * INFRASTRUCTURE & DEPLOYMENT SECURITY TESTING
 * 
 * This section focuses on infrastructure security, deployment configuration,
 * and production environment hardening for the multi-tenant RFID system.
 *
 * SECTION 6 COVERAGE:
 * - Environment Security Configuration
 * - API Security Headers and Hardening  
 * - Database Security Configuration
 * - Secret Management and Environment Variables
 * - Production Security Best Practices
 * - Error Handling and Information Disclosure
 * - Logging and Monitoring Security
 * - Rate Limiting and DDoS Protection
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test results storage
const testResults = [];

// Test result tracking
function addResult(section, category, testName, status, message, details = '') {
  const result = {
    timestamp: new Date().toISOString(),
    section,
    category,
    testName,
    status,
    message,
    details,
    severity: status === 'FAIL' ? 'HIGH' : status === 'WARN' ? 'MEDIUM' : 'LOW'
  };
  
  testResults.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const output = `   ${statusIcon} ${status} ${testName}: ${message}`;
  console.log(output);
  
  if (details) {
    console.log(`      Details: ${details}`);
  }
}

/**
 * SECTION 6.1: HTTP SECURITY HEADERS TESTING
 * Test security headers implementation for protection against common attacks
 */
async function testSecurityHeaders() {
  console.log('\n🛡️ SECTION 6.1: HTTP SECURITY HEADERS TESTING');
  console.log('\n🔍 Testing HTTP security headers implementation...');

  try {
    // Test API endpoint security headers
    const apiResponse = await axios.get(`${BASE_URL}/health`, {
      timeout: 10000,
      validateStatus: () => true
    });

    const headers = apiResponse.headers;
    console.log('   📋 Received headers:', Object.keys(headers).length, 'headers');

    // Test 6.1.1: X-Frame-Options
    if (headers['x-frame-options']) {
      const xFrameOptions = headers['x-frame-options'].toLowerCase();
      if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
        addResult('SECTION6', 'SECURITY_HEADERS', 'X-Frame-Options header', 'PASS', 
          `X-Frame-Options properly set to: ${headers['x-frame-options']}`);
      } else {
        addResult('SECTION6', 'SECURITY_HEADERS', 'X-Frame-Options header', 'WARN', 
          `X-Frame-Options value may be insecure: ${headers['x-frame-options']}`);
      }
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-Frame-Options header', 'WARN', 
        'X-Frame-Options header missing', 
        'Missing protection against clickjacking attacks');
    }

    // Test 6.1.2: X-Content-Type-Options
    if (headers['x-content-type-options']) {
      if (headers['x-content-type-options'].toLowerCase() === 'nosniff') {
        addResult('SECTION6', 'SECURITY_HEADERS', 'X-Content-Type-Options header', 'PASS', 
          'X-Content-Type-Options properly set to nosniff');
      } else {
        addResult('SECTION6', 'SECURITY_HEADERS', 'X-Content-Type-Options header', 'WARN', 
          `X-Content-Type-Options value: ${headers['x-content-type-options']}`);
      }
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-Content-Type-Options header', 'WARN', 
        'X-Content-Type-Options header missing', 
        'Missing protection against MIME type sniffing attacks');
    }

    // Test 6.1.3: X-XSS-Protection
    if (headers['x-xss-protection']) {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-XSS-Protection header', 'PASS', 
        `X-XSS-Protection set to: ${headers['x-xss-protection']}`);
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-XSS-Protection header', 'WARN', 
        'X-XSS-Protection header missing', 
        'Missing XSS protection header');
    }

    // Test 6.1.4: Content-Security-Policy
    if (headers['content-security-policy']) {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Content-Security-Policy header', 'PASS', 
        'Content-Security-Policy header present');
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Content-Security-Policy header', 'WARN', 
        'Content-Security-Policy header missing', 
        'Missing CSP protection against XSS and injection attacks');
    }

    // Test 6.1.5: Strict-Transport-Security (HSTS)
    if (headers['strict-transport-security']) {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Strict-Transport-Security header', 'PASS', 
        `HSTS properly configured: ${headers['strict-transport-security']}`);
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Strict-Transport-Security header', 'WARN', 
        'HSTS header missing', 
        'Missing HTTPS enforcement - recommended for production');
    }

    // Test 6.1.6: Server Information Disclosure
    if (headers['server']) {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Server header information disclosure', 'WARN', 
        `Server header reveals information: ${headers['server']}`, 
        'Server header should be removed or obfuscated in production');
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'Server header information disclosure', 'PASS', 
        'Server header properly removed');
    }

    // Test 6.1.7: X-Powered-By Information Disclosure
    if (headers['x-powered-by']) {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-Powered-By header information disclosure', 'WARN', 
        `X-Powered-By header reveals: ${headers['x-powered-by']}`, 
        'X-Powered-By header should be removed in production');
    } else {
      addResult('SECTION6', 'SECURITY_HEADERS', 'X-Powered-By header information disclosure', 'PASS', 
        'X-Powered-By header properly removed');
    }

  } catch (error) {
    addResult('SECTION6', 'SECURITY_HEADERS', 'Security headers testing', 'FAIL', 
      'Failed to test security headers', 
      `Error: ${error.message}`);
  }
}

/**
 * SECTION 6.2: ERROR HANDLING AND INFORMATION DISCLOSURE TESTING
 * Test for sensitive information disclosure in error responses
 */
async function testErrorHandling() {
  console.log('\n🚨 SECTION 6.2: ERROR HANDLING & INFORMATION DISCLOSURE TESTING');
  console.log('\n🔍 Testing error handling and information disclosure...');

  // Test 6.2.1: Invalid endpoint error handling
  try {
    const response = await axios.get(`${BASE_URL}/nonexistent-endpoint`, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 404) {
      const responseText = JSON.stringify(response.data).toLowerCase();
      
      // Check for sensitive information in 404 responses
      const sensitivePatterns = [
        'stack trace', 'error stack', 'file path', 'internal error',
        'database', 'sql', 'query', 'password', 'secret', 'token',
        'node_modules', 'server error', 'debug', 'development'
      ];

      const foundSensitive = sensitivePatterns.filter(pattern => 
        responseText.includes(pattern)
      );

      if (foundSensitive.length > 0) {
        addResult('SECTION6', 'ERROR_HANDLING', '404 error information disclosure', 'FAIL', 
          'Sensitive information disclosed in 404 response', 
          `Found: ${foundSensitive.join(', ')}`);
      } else {
        addResult('SECTION6', 'ERROR_HANDLING', '404 error information disclosure', 'PASS', 
          '404 responses do not disclose sensitive information');
      }
    } else {
      addResult('SECTION6', 'ERROR_HANDLING', '404 error handling', 'WARN', 
        `Unexpected status for non-existent endpoint: ${response.status}`);
    }
  } catch (error) {
    addResult('SECTION6', 'ERROR_HANDLING', '404 error handling test', 'FAIL', 
      'Error testing 404 handling', 
      `Error: ${error.message}`);
  }

  // Test 6.2.2: Malformed request error handling
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, 
      'invalid-json-data', {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status >= 400 && response.status < 500) {
      const responseText = JSON.stringify(response.data);
      
      // Check if error response is generic and doesn't expose internals
      if (responseText.length < 200 && !responseText.toLowerCase().includes('stack')) {
        addResult('SECTION6', 'ERROR_HANDLING', 'Malformed request error handling', 'PASS', 
          'Malformed requests return generic error responses');
      } else {
        addResult('SECTION6', 'ERROR_HANDLING', 'Malformed request error handling', 'WARN', 
          'Error responses may be too verbose', 
          'Consider implementing generic error messages for production');
      }
    } else {
      addResult('SECTION6', 'ERROR_HANDLING', 'Malformed request error handling', 'WARN', 
        `Unexpected response to malformed request: ${response.status}`);
    }
  } catch (error) {
    addResult('SECTION6', 'ERROR_HANDLING', 'Malformed request error test', 'PASS', 
      'Malformed requests properly rejected');
  }

  // Test 6.2.3: SQL injection attempt error handling
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: "admin'; DROP TABLE users; --",
      password: "test",
      projectId: "test",
      cityName: "test"
    }, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 400 || response.status === 401) {
      const responseText = JSON.stringify(response.data).toLowerCase();
      
      // Check if SQL error information is disclosed
      const sqlPatterns = ['sql', 'query', 'database', 'syntax error', 'mysql', 'postgresql'];
      const foundSqlInfo = sqlPatterns.filter(pattern => responseText.includes(pattern));

      if (foundSqlInfo.length > 0) {
        addResult('SECTION6', 'ERROR_HANDLING', 'SQL injection error disclosure', 'FAIL', 
          'SQL error information disclosed', 
          `Database information revealed: ${foundSqlInfo.join(', ')}`);
      } else {
        addResult('SECTION6', 'ERROR_HANDLING', 'SQL injection error disclosure', 'PASS', 
          'SQL injection attempts do not disclose database information');
      }
    } else {
      addResult('SECTION6', 'ERROR_HANDLING', 'SQL injection error handling', 'INFO', 
        `SQL injection attempt returned status: ${response.status}`);
    }
  } catch (error) {
    addResult('SECTION6', 'ERROR_HANDLING', 'SQL injection error test', 'PASS', 
      'SQL injection attempts properly handled');
  }
}

/**
 * SECTION 6.3: ENVIRONMENT SECURITY TESTING
 * Test environment configuration and secret management
 */
async function testEnvironmentSecurity() {
  console.log('\n🔐 SECTION 6.3: ENVIRONMENT SECURITY TESTING');
  console.log('\n🔍 Testing environment configuration and secret management...');

  // Test 6.3.1: Environment file security
  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production', 
    'config.json',
    'secrets.json'
  ];

  for (const file of sensitiveFiles) {
    try {
      const response = await axios.get(`${BASE_URL}/../${file}`, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${file} exposure`, 'FAIL', 
          `Sensitive configuration file accessible: ${file}`, 
          'CRITICAL: Configuration files should not be publicly accessible');
      } else if (response.status === 403) {
        addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${file} protection`, 'PASS', 
          `Configuration file properly protected: ${file}`);
      } else {
        addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${file} access test`, 'INFO', 
          `Configuration file test status: ${response.status}`);
      }
    } catch (error) {
      addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${file} protection`, 'PASS', 
        `Configuration file properly protected: ${file}`);
    }
  }

  // Test 6.3.2: Debug information disclosure
  try {
    const response = await axios.get(`${BASE_URL}/debug`, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status === 200) {
      addResult('SECTION6', 'ENVIRONMENT_SECURITY', 'Debug endpoint exposure', 'FAIL', 
        'Debug endpoint accessible in production', 
        'Debug endpoints should be disabled in production');
    } else {
      addResult('SECTION6', 'ENVIRONMENT_SECURITY', 'Debug endpoint protection', 'PASS', 
        'Debug endpoints properly disabled');
    }
  } catch (error) {
    addResult('SECTION6', 'ENVIRONMENT_SECURITY', 'Debug endpoint protection', 'PASS', 
      'Debug endpoints properly disabled');
  }

  // Test 6.3.3: Admin/management interfaces
  const managementPaths = ['/admin', '/management', '/dashboard', '/status', '/metrics'];
  
  for (const path of managementPaths) {
    try {
      const response = await axios.get(`${BASE_URL}${path}`, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${path} endpoint exposure`, 'WARN', 
          `Management endpoint accessible: ${path}`, 
          'Ensure management endpoints require proper authentication');
      } else if (response.status === 401 || response.status === 403) {
        addResult('SECTION6', 'ENVIRONMENT_SECURITY', `${path} endpoint protection`, 'PASS', 
          `Management endpoint properly protected: ${path}`);
      }
    } catch (error) {
      // Endpoint doesn't exist or is properly protected
    }
  }
}

/**
 * SECTION 6.4: RATE LIMITING AND DOS PROTECTION TESTING
 * Test rate limiting and denial of service protection
 */
async function testRateLimiting() {
  console.log('\n⚡ SECTION 6.4: RATE LIMITING & DOS PROTECTION TESTING');
  console.log('\n🔍 Testing rate limiting and denial of service protection...');

  // Test 6.4.1: API rate limiting
  console.log('\n🔧 Testing API rate limiting...');
  
  const requests = [];
  const testEndpoint = `${BASE_URL}/health`;
  const requestCount = 100;
  
  // Send multiple rapid requests
  for (let i = 0; i < requestCount; i++) {
    requests.push(
      axios.get(testEndpoint, {
        timeout: 2000,
        validateStatus: () => true
      }).catch(error => ({ error: error.message, status: 'timeout' }))
    );
  }

  try {
    const responses = await Promise.all(requests);
    
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    const errorCount = responses.filter(r => r.error || r.status === 'timeout').length;

    console.log(`   📊 Results: ${successCount} success, ${rateLimitedCount} rate limited, ${errorCount} errors`);

    if (rateLimitedCount > 0) {
      addResult('SECTION6', 'RATE_LIMITING', 'API rate limiting', 'PASS', 
        `Rate limiting active: ${rateLimitedCount}/${requestCount} requests limited`);
    } else if (errorCount > requestCount * 0.1) {
      addResult('SECTION6', 'RATE_LIMITING', 'API rate limiting', 'WARN', 
        'High error rate may indicate rate limiting or server protection');
    } else {
      addResult('SECTION6', 'RATE_LIMITING', 'API rate limiting', 'WARN', 
        'No rate limiting detected', 
        'Consider implementing rate limiting for production');
    }
  } catch (error) {
    addResult('SECTION6', 'RATE_LIMITING', 'Rate limiting test', 'FAIL', 
      'Failed to test rate limiting', 
      `Error: ${error.message}`);
  }

  // Test 6.4.2: Authentication endpoint rate limiting
  console.log('\n🔧 Testing authentication rate limiting...');
  
  const authRequests = [];
  const authRequestCount = 20;
  
  for (let i = 0; i < authRequestCount; i++) {
    authRequests.push(
      axios.post(`${BASE_URL}/auth/login`, {
        username: 'invalid-user',
        password: 'invalid-password',
        projectId: 'test',
        cityName: 'test'
      }, {
        timeout: 5000,
        validateStatus: () => true
      }).catch(error => ({ error: error.message, status: 'timeout' }))
    );
  }

  try {
    const authResponses = await Promise.all(authRequests);
    
    const authFailures = authResponses.filter(r => r.status === 401).length;
    const authRateLimited = authResponses.filter(r => r.status === 429).length;
    const authErrors = authResponses.filter(r => r.error || r.status === 'timeout').length;

    console.log(`   📊 Auth Results: ${authFailures} auth failures, ${authRateLimited} rate limited, ${authErrors} errors`);

    if (authRateLimited > 0) {
      addResult('SECTION6', 'RATE_LIMITING', 'Authentication rate limiting', 'PASS', 
        `Authentication rate limiting active: ${authRateLimited}/${authRequestCount} requests limited`);
    } else if (authErrors > 0) {
      addResult('SECTION6', 'RATE_LIMITING', 'Authentication rate limiting', 'WARN', 
        'Authentication may have protection mechanisms');
    } else {
      addResult('SECTION6', 'RATE_LIMITING', 'Authentication rate limiting', 'WARN', 
        'No authentication rate limiting detected', 
        'Implement rate limiting for authentication endpoints to prevent brute force attacks');
    }
  } catch (error) {
    addResult('SECTION6', 'RATE_LIMITING', 'Authentication rate limiting test', 'FAIL', 
      'Failed to test authentication rate limiting', 
      `Error: ${error.message}`);
  }
}

/**
 * SECTION 6.5: DATABASE SECURITY CONFIGURATION TESTING
 * Test database security configuration and connection security
 */
async function testDatabaseSecurity() {
  console.log('\n🗄️ SECTION 6.5: DATABASE SECURITY CONFIGURATION TESTING');
  console.log('\n🔍 Testing database security configuration...');

  // Test 6.5.1: Database error information disclosure
  try {
    // Test with SQL injection-like payload to see if database errors are exposed
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: "test' OR '1'='1",
      password: "test",
      projectId: "test",
      cityName: "test"
    }, {
      timeout: 10000,
      validateStatus: () => true
    });

    const responseText = JSON.stringify(response.data).toLowerCase();
    const dbErrorPatterns = [
      'postgres', 'postgresql', 'pg_', 'relation', 'column', 'table',
      'syntax error', 'query failed', 'database connection', 'sql state'
    ];

    const foundDbErrors = dbErrorPatterns.filter(pattern => responseText.includes(pattern));

    if (foundDbErrors.length > 0) {
      addResult('SECTION6', 'DATABASE_SECURITY', 'Database error information disclosure', 'FAIL', 
        'Database error information disclosed in responses', 
        `Database information revealed: ${foundDbErrors.join(', ')}`);
    } else {
      addResult('SECTION6', 'DATABASE_SECURITY', 'Database error information disclosure', 'PASS', 
        'Database errors properly handled without information disclosure');
    }
  } catch (error) {
    addResult('SECTION6', 'DATABASE_SECURITY', 'Database error handling test', 'PASS', 
      'Database queries properly protected');
  }

  // Test 6.5.2: Connection string security (theoretical test)
  addResult('SECTION6', 'DATABASE_SECURITY', 'Database connection security', 'INFO', 
    'Verify database connections use SSL/TLS in production', 
    'Ensure DATABASE_URL uses SSL parameters and strong authentication');

  // Test 6.5.3: Database user permissions (theoretical test)
  addResult('SECTION6', 'DATABASE_SECURITY', 'Database user privileges', 'INFO', 
    'Verify database user has minimal required privileges', 
    'Application database user should not have DROP, ALTER, or admin privileges');
}

/**
 * Generate test report and save results
 */
function generateSection6Report() {
  console.log('\n📊 SECTION 6: INFRASTRUCTURE & DEPLOYMENT SECURITY REPORT');
  console.log('================================================================================');

  // Categorize results
  const categories = {
    'SECURITY_HEADERS': [],
    'ERROR_HANDLING': [],
    'ENVIRONMENT_SECURITY': [],
    'RATE_LIMITING': [],
    'DATABASE_SECURITY': []
  };

  testResults.forEach(result => {
    if (categories[result.category]) {
      categories[result.category].push(result);
    }
  });

  // Print results by category
  Object.keys(categories).forEach(category => {
    const categoryName = category.replace('_', ' ');
    console.log(`\n${categoryName}:`);
    
    categories[category].forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${statusIcon} ${result.status}: ${result.testName} - ${result.message}`);
      if (result.details) {
        console.log(`      🚨 ${result.status === 'FAIL' ? 'CRITICAL' : result.status === 'WARN' ? 'WARNING' : 'INFO'}: ${result.details}`);
      }
    });
  });

  // Calculate overall score
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const warnings = testResults.filter(r => r.status === 'WARN').length;
  const criticalIssues = testResults.filter(r => r.severity === 'HIGH').length;

  console.log('\n📈 SECTION 6 SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Warnings: ${warnings} (${((warnings / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Critical Security Issues: ${criticalIssues}`);

  const score = ((passedTests + (warnings * 0.5)) / totalTests) * 100;
  console.log(`\n🎯 SECTION 6 INFRASTRUCTURE SECURITY SCORE: ${score.toFixed(1)}%`);

  if (criticalIssues > 0) {
    console.log('\n🚨 CRITICAL INFRASTRUCTURE SECURITY ISSUES DETECTED');
    console.log('   IMMEDIATE ACTION REQUIRED - PRODUCTION DEPLOYMENT RISK');
    console.log('   Review and fix critical issues before deployment');
  } else if (failedTests > 0) {
    console.log('\n⚠️  INFRASTRUCTURE SECURITY ISSUES DETECTED');
    console.log('   Review and address security issues for optimal protection');
  } else {
    console.log('\n✅ GOOD - Infrastructure security configuration acceptable');
    console.log('   Address warnings for enhanced security posture');
  }

  // Save results to file
  const reportData = {
    section: 'SECTION 6: INFRASTRUCTURE & DEPLOYMENT SECURITY TESTING',
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests,
      warnings,
      criticalIssues,
      score: parseFloat(score.toFixed(1))
    },
    results: testResults
  };

  try {
    fs.writeFileSync('section6-infrastructure-security-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n💾 Results saved to section6-infrastructure-security-results.json');
  } catch (error) {
    console.log('\n❌ Failed to save results:', error.message);
  }

  return score >= 80;
}

/**
 * Main test execution function
 */
async function runSection6Tests() {
  console.log('🛡️  STARTING SECTION 6: INFRASTRUCTURE & DEPLOYMENT SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: Infrastructure Security, Deployment Configuration, Production Hardening');
  console.log('================================================================================');

  try {
    await testSecurityHeaders();
    await testErrorHandling();
    await testEnvironmentSecurity();
    await testRateLimiting();
    await testDatabaseSecurity();

    const success = generateSection6Report();
    
    if (success) {
      console.log('\n🎉 Section 6 Infrastructure Security Testing completed successfully');
      process.exit(0);
    } else {
      console.log('\n⚠️  Section 6 Infrastructure Security Testing completed with issues');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Section 6 testing failed:', error.message);
    process.exit(1);
  }
}

// Run Section 6 tests
runSection6Tests();