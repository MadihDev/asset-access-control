#!/usr/bin/env node

/**
 * COMPREHENSIVE API SURFACE SECURITY TESTS
 * Layer 1: API Surface Security Validation
 * 
 * Tests:
 * - Input Validation (SQL injection, XSS, command injection)
 * - Authentication (Token validation, invalid credentials)
 * - Rate Limiting (Brute force protection)
 * - Error Handling (Information disclosure prevention)
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

// Sleep utility for rate limiting tests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🔐 STARTING API SURFACE SECURITY TESTS'.cyan.bold);
console.log('=' * 60);

async function testInputValidation() {
  console.log('\n📝 TESTING INPUT VALIDATION'.blue.bold);
  
  // SQL Injection Tests
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'/*",
    "1' UNION SELECT NULL,NULL,NULL--",
    "'; UPDATE users SET role='ADMIN' WHERE id=1; --"
  ];
  
  for (const payload of sqlPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: payload,
        password: 'test',
        project: 'PerfectIT',
        city: 'Amsterdam'
      }, { timeout: 5000 });
      
      // Check if SQL payload was processed (bad)
      if (response.status === 200 || response.data.success) {
        addResult('INPUT_VALIDATION', 'SQL Injection', 'FAIL', 
          `SQL payload accepted: ${payload.substring(0, 20)}...`,
          `Response: ${JSON.stringify(response.data)}`);
      } else {
        addResult('INPUT_VALIDATION', 'SQL Injection', 'PASS', 
          `SQL payload rejected: ${payload.substring(0, 20)}...`);
      }
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        addResult('INPUT_VALIDATION', 'SQL Injection', 'PASS', 
          `SQL payload properly rejected: ${payload.substring(0, 20)}...`,
          `Status: ${error.response.status}`);
      } else {
        addResult('INPUT_VALIDATION', 'SQL Injection', 'WARN', 
          `Unexpected error for SQL payload: ${payload.substring(0, 20)}...`,
          error.message);
      }
    }
  }
  
  // XSS Tests
  const xssPayloads = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "';alert('xss');//",
    "<svg onload=alert('xss')>"
  ];
  
  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: payload,
        password: 'test',
        project: 'PerfectIT',
        city: 'Amsterdam'
      }, { timeout: 5000 });
      
      // Check if script tags are reflected in response (bad)
      const responseText = JSON.stringify(response.data);
      if (responseText.includes('<script') || responseText.includes('javascript:') || responseText.includes('onerror=')) {
        addResult('INPUT_VALIDATION', 'XSS Prevention', 'FAIL', 
          `XSS payload reflected: ${payload.substring(0, 20)}...`,
          `Response contains: ${responseText.substring(0, 100)}...`);
      } else {
        addResult('INPUT_VALIDATION', 'XSS Prevention', 'PASS', 
          `XSS payload sanitized: ${payload.substring(0, 20)}...`);
      }
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        addResult('INPUT_VALIDATION', 'XSS Prevention', 'PASS', 
          `XSS payload rejected: ${payload.substring(0, 20)}...`,
          `Status: ${error.response.status}`);
      } else {
        addResult('INPUT_VALIDATION', 'XSS Prevention', 'WARN', 
          `Unexpected error for XSS payload: ${payload.substring(0, 20)}...`,
          error.message);
      }
    }
  }
  
  // Command Injection Tests
  const cmdPayloads = [
    "test; ls -la",
    "test && cat /etc/passwd",
    "test | whoami",
    "test`whoami`",
    "test$(whoami)"
  ];
  
  for (const payload of cmdPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: payload,
        password: 'test',
        project: 'PerfectIT',
        city: 'Amsterdam'
      }, { timeout: 5000 });
      
      addResult('INPUT_VALIDATION', 'Command Injection', 'PASS', 
        `Command payload handled: ${payload.substring(0, 20)}...`);
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        addResult('INPUT_VALIDATION', 'Command Injection', 'PASS', 
          `Command payload rejected: ${payload.substring(0, 20)}...`,
          `Status: ${error.response.status}`);
      } else {
        addResult('INPUT_VALIDATION', 'Command Injection', 'WARN', 
          `Unexpected error for command payload: ${payload.substring(0, 20)}...`,
          error.message);
      }
    }
  }
}

async function testAuthentication() {
  console.log('\n🔐 TESTING AUTHENTICATION'.blue.bold);
  
  // Test invalid credentials
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'invalid_user',
      password: 'wrong_password',
      project: 'PerfectIT',
      city: 'Amsterdam'
    }, { timeout: 5000 });
    
    if (response.status === 200 && response.data.success) {
      addResult('AUTHENTICATION', 'Invalid Credentials', 'FAIL', 
        'Invalid credentials accepted',
        `Response: ${JSON.stringify(response.data)}`);
    } else {
      addResult('AUTHENTICATION', 'Invalid Credentials', 'PASS', 
        'Invalid credentials properly rejected');
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      addResult('AUTHENTICATION', 'Invalid Credentials', 'PASS', 
        'Invalid credentials properly rejected with 401');
    } else if (error.response && error.response.status === 400) {
      addResult('AUTHENTICATION', 'Invalid Credentials', 'PASS', 
        'Invalid credentials properly rejected with 400');
    } else {
      addResult('AUTHENTICATION', 'Invalid Credentials', 'WARN', 
        'Unexpected authentication response',
        error.message);
    }
  }
  
  // Test missing credentials
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {}, { timeout: 5000 });
    
    if (response.status === 200 && response.data.success) {
      addResult('AUTHENTICATION', 'Missing Credentials', 'FAIL', 
        'Empty credentials accepted');
    } else {
      addResult('AUTHENTICATION', 'Missing Credentials', 'PASS', 
        'Empty credentials properly rejected');
    }
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      addResult('AUTHENTICATION', 'Missing Credentials', 'PASS', 
        'Empty credentials properly rejected',
        `Status: ${error.response.status}`);
    } else {
      addResult('AUTHENTICATION', 'Missing Credentials', 'WARN', 
        'Unexpected response to empty credentials',
        error.message);
    }
  }
  
  // Test invalid token access
  try {
    const response = await axios.get(`${BASE_URL}/user`, {
      headers: { 'Authorization': 'Bearer invalid_token_12345' },
      timeout: 5000
    });
    
    if (response.status === 200) {
      addResult('AUTHENTICATION', 'Invalid Token', 'FAIL', 
        'Invalid token accepted for protected endpoint');
    } else {
      addResult('AUTHENTICATION', 'Invalid Token', 'PASS', 
        'Invalid token properly rejected');
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      addResult('AUTHENTICATION', 'Invalid Token', 'PASS', 
        'Invalid token properly rejected with 401');
    } else {
      addResult('AUTHENTICATION', 'Invalid Token', 'WARN', 
        'Unexpected response to invalid token',
        error.message);
    }
  }
  
  // Test missing token access
  try {
    const response = await axios.get(`${BASE_URL}/user`, { timeout: 5000 });
    
    if (response.status === 200) {
      addResult('AUTHENTICATION', 'Missing Token', 'FAIL', 
        'Protected endpoint accessible without token');
    } else {
      addResult('AUTHENTICATION', 'Missing Token', 'PASS', 
        'Protected endpoint properly secured');
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      addResult('AUTHENTICATION', 'Missing Token', 'PASS', 
        'Protected endpoint properly secured with 401');
    } else {
      addResult('AUTHENTICATION', 'Missing Token', 'WARN', 
        'Unexpected response to missing token',
        error.message);
    }
  }
}

async function testRateLimiting() {
  console.log('\n⏱️  TESTING RATE LIMITING'.blue.bold);
  
  const requests = [];
  const startTime = Date.now();
  
  // Attempt rapid requests to trigger rate limiting
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.post(`${BASE_URL}/auth/login`, {
        username: `test_user_${i}`,
        password: 'test_password',
        project: 'PerfectIT',
        city: 'Amsterdam'
      }, { timeout: 5000 }).catch(error => error.response || error)
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    let rateLimited = 0;
    let successful = 0;
    let errors = 0;
    
    responses.forEach((response, index) => {
      if (response.status === 429) {
        rateLimited++;
      } else if (response.status >= 200 && response.status < 400) {
        successful++;
      } else {
        errors++;
      }
    });
    
    if (rateLimited > 0) {
      addResult('RATE_LIMITING', 'Brute Force Protection', 'PASS', 
        `Rate limiting active: ${rateLimited}/15 requests blocked`,
        `Duration: ${duration}ms, Success: ${successful}, Errors: ${errors}`);
    } else if (successful === 15) {
      addResult('RATE_LIMITING', 'Brute Force Protection', 'FAIL', 
        'No rate limiting detected - all 15 requests processed',
        `Duration: ${duration}ms`);
    } else {
      addResult('RATE_LIMITING', 'Brute Force Protection', 'WARN', 
        'Rate limiting behavior unclear',
        `Duration: ${duration}ms, Success: ${successful}, Errors: ${errors}, Rate Limited: ${rateLimited}`);
    }
    
  } catch (error) {
    addResult('RATE_LIMITING', 'Brute Force Protection', 'WARN', 
      'Rate limiting test failed',
      error.message);
  }
  
  // Wait before next test to avoid affecting subsequent tests
  await sleep(2000);
}

async function testErrorHandling() {
  console.log('\n🚨 TESTING ERROR HANDLING'.blue.bold);
  
  // Test malformed JSON
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, 
      '{"username": "test", "password":}', // Malformed JSON
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 
      }
    );
    
    addResult('ERROR_HANDLING', 'Malformed JSON', 'FAIL', 
      'Malformed JSON accepted',
      `Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Check if error message reveals sensitive information
      const errorMessage = JSON.stringify(error.response.data);
      if (errorMessage.includes('SyntaxError') || errorMessage.includes('stack') || errorMessage.includes('line')) {
        addResult('ERROR_HANDLING', 'Malformed JSON', 'WARN', 
          'Malformed JSON rejected but may reveal sensitive info',
          `Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        addResult('ERROR_HANDLING', 'Malformed JSON', 'PASS', 
          'Malformed JSON properly rejected with generic error');
      }
    } else {
      addResult('ERROR_HANDLING', 'Malformed JSON', 'WARN', 
        'Unexpected response to malformed JSON',
        error.message);
    }
  }
  
  // Test non-existent endpoint
  try {
    const response = await axios.get(`${BASE_URL}/nonexistent-endpoint`, { timeout: 5000 });
    
    addResult('ERROR_HANDLING', 'Non-existent Endpoint', 'WARN', 
      'Non-existent endpoint returned response',
      `Status: ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Check if 404 response reveals server information
      const errorMessage = JSON.stringify(error.response.data);
      if (errorMessage.includes('Express') || errorMessage.includes('node') || errorMessage.includes('stack')) {
        addResult('ERROR_HANDLING', 'Non-existent Endpoint', 'WARN', 
          '404 error may reveal server information',
          `Error: ${errorMessage.substring(0, 100)}...`);
      } else {
        addResult('ERROR_HANDLING', 'Non-existent Endpoint', 'PASS', 
          'Non-existent endpoint properly returns 404 without sensitive info');
      }
    } else {
      addResult('ERROR_HANDLING', 'Non-existent Endpoint', 'WARN', 
        'Unexpected response to non-existent endpoint',
        error.message);
    }
  }
  
  // Test server error handling
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'a'.repeat(10000), // Extremely long input
      password: 'b'.repeat(10000),
      project: 'PerfectIT',
      city: 'Amsterdam'
    }, { timeout: 10000 });
    
    addResult('ERROR_HANDLING', 'Large Input Handling', 'PASS', 
      'Large input handled gracefully');
  } catch (error) {
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      addResult('ERROR_HANDLING', 'Large Input Handling', 'PASS', 
        'Large input properly rejected',
        `Status: ${error.response.status}`);
    } else if (error.code === 'ECONNABORTED') {
      addResult('ERROR_HANDLING', 'Large Input Handling', 'WARN', 
        'Large input caused timeout - possible DoS vector');
    } else {
      addResult('ERROR_HANDLING', 'Large Input Handling', 'WARN', 
        'Unexpected response to large input',
        error.message);
    }
  }
}

// Main test runner
async function runTests() {
  try {
    await testInputValidation();
    await testAuthentication();
    await testRateLimiting();
    await testErrorHandling();
    
    // Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('📊 API SURFACE SECURITY TEST SUMMARY'.cyan.bold);
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${RESULTS.passed}`.green);
    console.log(`❌ Tests Failed: ${RESULTS.failed}`.red);
    console.log(`⚠️  Warnings: ${RESULTS.warnings}`.yellow);
    console.log(`📝 Total Tests: ${RESULTS.tests.length}`);
    
    const score = Math.round((RESULTS.passed / RESULTS.tests.length) * 100);
    console.log(`🏆 Security Score: ${score}%`.cyan);
    
    if (RESULTS.failed > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:'.red.bold);
      RESULTS.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`   ❌ [${test.category}] ${test.test}: ${test.message}`.red);
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
    
    // Save detailed results to file
    const fs = require('fs');
    const reportPath = 'api-surface-security-test-report.json';
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
    
  } catch (error) {
    console.error('🚨 Test execution failed:'.red.bold, error.message);
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServerHealth() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is responding - starting tests...'.green);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log('⚠️  Server is responding but rate limited - continuing with tests...'.yellow);
      return true;
    }
    console.error('❌ Server is not responding. Please ensure the backend is running on http://localhost:5000'.red);
    console.error(`   Error: ${error.message}`.gray);
    return false;
  }
}

// Start tests
checkServerHealth().then(isHealthy => {
  if (isHealthy) {
    runTests();
  } else {
    process.exit(1);
  }
});