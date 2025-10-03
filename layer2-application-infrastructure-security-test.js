/**
 * LAYER 2: APPLICATION INFRASTRUCTURE SECURITY TESTING
 * Multi-Tenant RFID Access Control System
 * 
 * Tests: Web Server Security, Middleware Security, API Gateway Security
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

// Test results storage
const testResults = [];

function addResult(category, test, status, message, details = '') {
  const result = {
    layer: 'LAYER 2: APPLICATION INFRASTRUCTURE SECURITY',
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
 * 2.1 Web Server Security Testing
 */
async function testWebServerSecurity() {
  console.log('\n🏗️ TESTING WEB SERVER SECURITY'.blue?.bold || '\n🏗️ TESTING WEB SERVER SECURITY');
  
  // Test HTTP security headers in detail
  try {
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    
    const headers = response.headers;
    
    // Content Security Policy analysis
    if (headers['content-security-policy']) {
      const csp = headers['content-security-policy'];
      if (csp.includes("'unsafe-inline'") && csp.includes('style-src')) {
        addResult('WEB_SERVER_SECURITY', 'CSP unsafe-inline in styles', 'WARN', 
          'CSP allows unsafe-inline for styles', 'Consider removing unsafe-inline for better security');
      } else if (csp.includes("'unsafe-inline'")) {
        addResult('WEB_SERVER_SECURITY', 'CSP unsafe-inline usage', 'FAIL', 
          'CSP allows unsafe-inline scripting', 'Remove unsafe-inline directives');
      } else {
        addResult('WEB_SERVER_SECURITY', 'CSP configuration', 'PASS', 
          'CSP properly configured without unsafe directives');
      }
      
      if (csp.includes("'self'") && csp.includes('default-src')) {
        addResult('WEB_SERVER_SECURITY', 'CSP default-src restriction', 'PASS', 
          'CSP restricts default sources to self');
      }
    }
    
    // X-Frame-Options analysis
    if (headers['x-frame-options']) {
      const xfo = headers['x-frame-options'].toUpperCase();
      if (xfo === 'DENY' || xfo === 'SAMEORIGIN') {
        addResult('WEB_SERVER_SECURITY', 'X-Frame-Options configuration', 'PASS', 
          'Clickjacking protection properly configured', `Value: ${xfo}`);
      } else {
        addResult('WEB_SERVER_SECURITY', 'X-Frame-Options configuration', 'WARN', 
          'X-Frame-Options may not provide adequate protection', `Value: ${xfo}`);
      }
    }
    
    // HSTS analysis
    if (headers['strict-transport-security']) {
      const hsts = headers['strict-transport-security'];
      if (hsts.includes('max-age=') && hsts.includes('includeSubDomains')) {
        addResult('WEB_SERVER_SECURITY', 'HSTS configuration', 'PASS', 
          'HSTS properly configured with subdomains');
      } else if (hsts.includes('max-age=')) {
        addResult('WEB_SERVER_SECURITY', 'HSTS configuration', 'WARN', 
          'HSTS configured but missing includeSubDomains');
      }
    }
    
  } catch (error) {
    addResult('WEB_SERVER_SECURITY', 'Security headers analysis', 'FAIL', 
      'Unable to analyze security headers', error.message);
  }
  
  // Test error page information disclosure
  try {
    const response = await axios.get(`${BASE_URL}/nonexistent-endpoint`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    const responseText = JSON.stringify(response.data).toLowerCase();
    
    if (responseText.includes('stack trace') || 
        responseText.includes('internal server error') ||
        responseText.includes('debug') ||
        responseText.includes('development')) {
      addResult('WEB_SERVER_SECURITY', 'Error page information disclosure', 'FAIL', 
        'Error pages expose sensitive information', 'Stack traces or debug info visible');
    } else {
      addResult('WEB_SERVER_SECURITY', 'Error page information disclosure', 'PASS', 
        'Error pages do not expose sensitive information');
    }
    
  } catch (error) {
    addResult('WEB_SERVER_SECURITY', 'Error page analysis', 'WARN', 
      'Unable to analyze error pages', error.message);
  }
  
  // Test request size limits
  try {
    const largeHeader = 'A'.repeat(64 * 1024); // 64KB header
    
    const response = await axios.get(`${BASE_URL}/health`, {
      headers: {
        'X-Large-Header': largeHeader
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 413 || response.status === 400) {
      addResult('WEB_SERVER_SECURITY', 'Request header size limits', 'PASS', 
        'Large headers properly rejected', `Status: ${response.status}`);
    } else {
      addResult('WEB_SERVER_SECURITY', 'Request header size limits', 'WARN', 
        'Large headers not properly limited', 'Consider implementing header size limits');
    }
    
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.message.includes('header')) {
      addResult('WEB_SERVER_SECURITY', 'Request header size limits', 'PASS', 
        'Large headers properly rejected by server');
    } else {
      addResult('WEB_SERVER_SECURITY', 'Request header size limits', 'WARN', 
        'Unexpected error with large headers', error.message);
    }
  }
}

/**
 * 2.2 Middleware Security Testing
 */
async function testMiddlewareSecurity() {
  console.log('\n⚙️ TESTING MIDDLEWARE SECURITY'.blue?.bold || '\n⚙️ TESTING MIDDLEWARE SECURITY');
  
  // Test CORS policy
  try {
    const response = await axios.options(`${BASE_URL}/health`, {
      headers: {
        'Origin': 'https://malicious.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    const corsHeaders = response.headers;
    
    // Check Access-Control-Allow-Origin
    if (corsHeaders['access-control-allow-origin']) {
      if (corsHeaders['access-control-allow-origin'] === '*') {
        addResult('MIDDLEWARE_SECURITY', 'CORS wildcard origin', 'FAIL', 
          'CORS allows any origin', 'Restrict CORS to specific origins');
      } else if (corsHeaders['access-control-allow-origin'] === 'https://malicious.com') {
        addResult('MIDDLEWARE_SECURITY', 'CORS origin validation', 'FAIL', 
          'CORS accepts malicious origins', 'Implement proper origin validation');
      } else {
        addResult('MIDDLEWARE_SECURITY', 'CORS origin validation', 'PASS', 
          'CORS properly restricts origins');
      }
    } else {
      addResult('MIDDLEWARE_SECURITY', 'CORS configuration', 'PASS', 
        'CORS properly configured - no wildcard access');
    }
    
    // Check for dangerous CORS headers
    if (corsHeaders['access-control-allow-credentials'] === 'true' && 
        corsHeaders['access-control-allow-origin'] === '*') {
      addResult('MIDDLEWARE_SECURITY', 'CORS credentials with wildcard', 'FAIL', 
        'Dangerous CORS configuration', 'Never use credentials:true with origin:*');
    }
    
  } catch (error) {
    addResult('MIDDLEWARE_SECURITY', 'CORS policy testing', 'WARN', 
      'Unable to test CORS policy', error.message);
  }
  
  // Test rate limiting
  const rapidRequests = Array.from({length: 50}, (_, i) => 
    axios.get(`${BASE_URL}/health`, {
      timeout: 2000,
      validateStatus: () => true
    }).catch(err => ({ error: err.message, status: err.response?.status }))
  );
  
  try {
    console.log('   🔄 Testing rate limiting with 50 rapid requests...');
    const results = await Promise.all(rapidRequests);
    
    const rateLimitedCount = results.filter(r => 
      r.status === 429 || 
      (r.error && r.error.includes('429')) ||
      (r.error && r.error.includes('rate limit'))
    ).length;
    
    const successCount = results.filter(r => 
      !r.error && r.status === 200
    ).length;
    
    if (rateLimitedCount > 10) {
      addResult('MIDDLEWARE_SECURITY', 'Rate limiting effectiveness', 'PASS', 
        'Rate limiting actively blocking requests', 
        `${rateLimitedCount}/50 requests rate limited`);
    } else if (rateLimitedCount > 0) {
      addResult('MIDDLEWARE_SECURITY', 'Rate limiting effectiveness', 'WARN', 
        'Rate limiting partially effective', 
        `${rateLimitedCount}/50 requests rate limited`);
    } else if (successCount === 50) {
      addResult('MIDDLEWARE_SECURITY', 'Rate limiting effectiveness', 'WARN', 
        'No rate limiting detected', 'Consider implementing rate limiting');
    } else {
      addResult('MIDDLEWARE_SECURITY', 'Rate limiting effectiveness', 'INFO', 
        'Mixed results - server may have other protections', 
        `${successCount}/50 successful, ${rateLimitedCount}/50 rate limited`);
    }
    
  } catch (error) {
    addResult('MIDDLEWARE_SECURITY', 'Rate limiting testing', 'WARN', 
      'Error testing rate limiting', error.message);
  }
  
  // Test request logging security
  try {
    const sensitiveData = {
      username: 'testuser',
      password: 'sensitive_password_123',
      credit_card: '4111-1111-1111-1111',
      ssn: '123-45-6789'
    };
    
    await axios.post(`${BASE_URL}/auth/login`, {
      ...sensitiveData,
      project: 'test',
      city: 'test'
    }, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    addResult('MIDDLEWARE_SECURITY', 'Request logging security', 'INFO', 
      'Sensitive data sent to server', 'Verify logs do not contain sensitive data');
    
  } catch (error) {
    addResult('MIDDLEWARE_SECURITY', 'Request logging security', 'INFO', 
      'Request with sensitive data processed');
  }
  
  // Test body parser security
  try {
    const deepNestedObject = {};
    let current = deepNestedObject;
    for (let i = 0; i < 100; i++) {
      current.nested = {};
      current = current.nested;
    }
    current.value = 'deep';
    
    const response = await axios.post(`${BASE_URL}/auth/login`, deepNestedObject, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 400 || response.status === 413) {
      addResult('MIDDLEWARE_SECURITY', 'Body parser depth limits', 'PASS', 
        'Deep object nesting properly rejected', `Status: ${response.status}`);
    } else {
      addResult('MIDDLEWARE_SECURITY', 'Body parser depth limits', 'WARN', 
        'Deep object nesting not limited', 'Consider implementing depth limits');
    }
    
  } catch (error) {
    if (error.message.includes('depth') || error.message.includes('nested')) {
      addResult('MIDDLEWARE_SECURITY', 'Body parser depth limits', 'PASS', 
        'Body parser has depth protection');
    } else {
      addResult('MIDDLEWARE_SECURITY', 'Body parser depth limits', 'WARN', 
        'Error testing body parser', error.message);
    }
  }
}

/**
 * 2.3 API Gateway Security Testing
 */
async function testAPIGatewaySecurity() {
  console.log('\n🔗 TESTING API SECURITY'.blue?.bold || '\n🔗 TESTING API SECURITY');
  
  // Test API versioning security
  const versionTests = [
    { path: '/v1/health', version: 'v1' },
    { path: '/v2/health', version: 'v2' },
    { path: '/api/v1/health', version: 'api/v1' },
    { path: '/api/v2/health', version: 'api/v2' }
  ];
  
  for (const test of versionTests) {
    try {
      const response = await axios.get(`http://localhost:5000${test.path}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      if (response.status === 404) {
        addResult('API_SECURITY', `API version ${test.version} exposure`, 'PASS', 
          'Unused API version properly hidden');
      } else if (response.status === 200) {
        addResult('API_SECURITY', `API version ${test.version} exposure`, 'INFO', 
          'API version endpoint accessible', 'Verify this version should be public');
      }
    } catch (error) {
      // Expected for non-existent endpoints
    }
  }
  
  // Test API documentation exposure
  const docEndpoints = [
    '/docs',
    '/swagger',
    '/api-docs',
    '/documentation',
    '/openapi.json',
    '/swagger.json',
    '/redoc'
  ];
  
  for (const endpoint of docEndpoints) {
    try {
      const response = await axios.get(`http://localhost:5000${endpoint}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json') || 
            contentType.includes('text/html') ||
            response.data.toString().includes('swagger') ||
            response.data.toString().includes('openapi')) {
          addResult('API_SECURITY', 'API documentation exposure', 'WARN', 
            `API documentation accessible at ${endpoint}`, 
            'Consider restricting access to documentation in production');
        }
      } else {
        addResult('API_SECURITY', 'API documentation exposure', 'PASS', 
          'API documentation properly protected');
      }
    } catch (error) {
      // Expected for protected/non-existent endpoints
    }
  }
  
  // Test API endpoint enumeration
  const commonEndpoints = [
    '/admin',
    '/debug',
    '/test',
    '/dev',
    '/internal',
    '/system',
    '/config',
    '/status',
    '/metrics',
    '/monitoring'
  ];
  
  let exposedEndpoints = 0;
  for (const endpoint of commonEndpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 2000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        exposedEndpoints++;
        addResult('API_SECURITY', 'Sensitive endpoint exposure', 'WARN', 
          `Potentially sensitive endpoint accessible: ${endpoint}`, 
          'Verify this endpoint should be public');
      }
    } catch (error) {
      // Expected for protected endpoints
    }
  }
  
  if (exposedEndpoints === 0) {
    addResult('API_SECURITY', 'Sensitive endpoint protection', 'PASS', 
      'No sensitive endpoints exposed');
  }
  
  // Test API error handling consistency
  const errorTests = [
    { path: '/nonexistent', expected: 404 },
    { path: '/health/../admin', expected: 404 },
    { path: '/health?test=<script>alert(1)</script>', expected: 200 }
  ];
  
  for (const test of errorTests) {
    try {
      const response = await axios.get(`${BASE_URL}${test.path}`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      if (response.status === test.expected) {
        addResult('API_SECURITY', 'API error handling consistency', 'PASS', 
          `Endpoint ${test.path} handled correctly`);
      } else {
        addResult('API_SECURITY', 'API error handling consistency', 'WARN', 
          `Unexpected response for ${test.path}`, 
          `Expected: ${test.expected}, Got: ${response.status}`);
      }
    } catch (error) {
      addResult('API_SECURITY', 'API error handling consistency', 'WARN', 
        `Error testing ${test.path}`, error.message);
    }
  }
}

/**
 * Generate comprehensive Layer 2 security report
 */
function generateLayer2Report() {
  console.log('\n📊 LAYER 2 APPLICATION INFRASTRUCTURE SECURITY REPORT'.blue?.bold || '\n📊 LAYER 2 APPLICATION INFRASTRUCTURE SECURITY REPORT');
  console.log('='.repeat(60));
  
  const categories = ['WEB_SERVER_SECURITY', 'MIDDLEWARE_SECURITY', 'API_SECURITY'];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningTests = 0;
  
  categories.forEach(category => {
    const categoryResults = testResults.filter(r => r.category === category);
    console.log(`\n${category}:`);
    
    categoryResults.forEach(result => {
      totalTests++;
      if (result.status === 'PASS') passedTests++;
      else if (result.status === 'FAIL') failedTests++;
      else warningTests++;
      
      console.log(`  ${result.status}: ${result.test} - ${result.message}`);
    });
  });
  
  console.log('\n📈 LAYER 2 SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
  
  const score = ((passedTests + (warningTests * 0.5)) / totalTests) * 100;
  console.log(`\n🎯 LAYER 2 APPLICATION INFRASTRUCTURE SECURITY SCORE: ${score.toFixed(1)}%`);
  
  if (score >= 90) {
    console.log('✅ EXCELLENT application infrastructure security');
  } else if (score >= 75) {
    console.log('⚠️  GOOD application infrastructure security with minor improvements needed');
  } else if (score >= 60) {
    console.log('⚠️  MODERATE application infrastructure security - several issues to address');
  } else {
    console.log('❌ POOR application infrastructure security - immediate attention required');
  }
  
  return {
    layer: 'LAYER 2: APPLICATION INFRASTRUCTURE SECURITY',
    totalTests,
    passedTests,
    failedTests,
    warningTests,
    score: score.toFixed(1),
    results: testResults
  };
}

/**
 * Main execution function
 */
async function runLayer2Tests() {
  console.log('🛡️  STARTING LAYER 2: APPLICATION INFRASTRUCTURE SECURITY TESTING'.cyan?.bold || '🛡️  STARTING LAYER 2: APPLICATION INFRASTRUCTURE SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: Web Server, Middleware, API Gateway Security');
  console.log('=' .repeat(70));
  
  try {
    await testWebServerSecurity();
    await testMiddlewareSecurity();
    await testAPIGatewaySecurity();
    
    const report = generateLayer2Report();
    
    // Save results to file
    fs.writeFileSync('layer2-application-infrastructure-security-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to layer2-application-infrastructure-security-results.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Error during Layer 2 testing:', error.message);
    return null;
  }
}

// Execute if run directly
if (require.main === module) {
  runLayer2Tests()
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

module.exports = { runLayer2Tests };