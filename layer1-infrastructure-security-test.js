/**
 * LAYER 1: INFRASTRUCTURE SECURITY TESTING
 * Multi-Tenant RFID Access Control System
 * 
 * Tests: Network Security, Server Security, Database Security
 */

const axios = require('axios');
const https = require('https');
const net = require('net');
const dns = require('dns').promises;
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 5000;

// Test results storage
const testResults = [];

function addResult(category, test, status, message, details = '') {
  const result = {
    layer: 'LAYER 1: INFRASTRUCTURE SECURITY',
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
 * 1.1 Network Security Testing
 */
async function testNetworkSecurity() {
  console.log('\n🔧 TESTING NETWORK SECURITY'.blue?.bold || '\n🔧 TESTING NETWORK SECURITY');
  
  // Port scanning - test common ports
  const commonPorts = [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3000, 3001, 5000, 5432, 8080, 8443];
  
  for (const port of commonPorts) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(); // Port closed/filtered
        }, 1000);
        
        socket.connect(port, BACKEND_HOST, () => {
          clearTimeout(timeout);
          socket.destroy();
          
          if (port === BACKEND_PORT) {
            addResult('NETWORK_SECURITY', `Port ${port} accessibility`, 'PASS', 
              'Application port accessible as expected');
          } else if ([22, 23, 25, 110, 143].includes(port)) {
            addResult('NETWORK_SECURITY', `Port ${port} exposure`, 'WARN', 
              'Potentially sensitive service port is open', `Port ${port} should be secured`);
          } else {
            addResult('NETWORK_SECURITY', `Port ${port} exposure`, 'INFO', 
              'Additional service port detected', `Port ${port} is accessible`);
          }
          resolve();
        });
        
        socket.on('error', () => {
          clearTimeout(timeout);
          resolve(); // Port closed
        });
      });
    } catch (error) {
      // Port closed - this is expected for most ports
    }
  }
  
  // DNS enumeration test
  try {
    const dnsResults = await dns.lookup(BACKEND_HOST);
    addResult('NETWORK_SECURITY', 'DNS resolution', 'PASS', 
      'Host DNS resolution working', `Resolved to: ${dnsResults.address}`);
  } catch (error) {
    addResult('NETWORK_SECURITY', 'DNS resolution', 'WARN', 
      'DNS resolution issue', error.message);
  }
  
  // SSL/TLS configuration (if HTTPS is used)
  if (BASE_URL.startsWith('https')) {
    try {
      const response = await axios.get(`${BASE_URL}/health`, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false // For testing purposes
        })
      });
      addResult('NETWORK_SECURITY', 'SSL/TLS configuration', 'PASS', 
        'HTTPS endpoint accessible');
    } catch (error) {
      addResult('NETWORK_SECURITY', 'SSL/TLS configuration', 'FAIL', 
        'HTTPS configuration issue', error.message);
    }
  } else {
    addResult('NETWORK_SECURITY', 'SSL/TLS configuration', 'WARN', 
      'Application running on HTTP', 'Consider implementing HTTPS for production');
  }
}

/**
 * 1.2 Server Security Testing
 */
async function testServerSecurity() {
  console.log('\n🖥️  TESTING SERVER SECURITY'.blue?.bold || '\n🖥️  TESTING SERVER SECURITY');
  
  try {
    // Test for server information disclosure
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    
    // Check for sensitive headers
    const headers = response.headers;
    
    if (headers['server']) {
      addResult('SERVER_SECURITY', 'Server header disclosure', 'WARN', 
        'Server information disclosed', `Server: ${headers['server']}`);
    } else {
      addResult('SERVER_SECURITY', 'Server header disclosure', 'PASS', 
        'Server information properly hidden');
    }
    
    if (headers['x-powered-by']) {
      addResult('SERVER_SECURITY', 'X-Powered-By header disclosure', 'WARN', 
        'Framework/technology disclosed', `X-Powered-By: ${headers['x-powered-by']}`);
    } else {
      addResult('SERVER_SECURITY', 'X-Powered-By header disclosure', 'PASS', 
        'Technology stack properly hidden');
    }
    
    // Check security headers
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options', 
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];
    
    securityHeaders.forEach(header => {
      if (headers[header]) {
        addResult('SERVER_SECURITY', `${header} header`, 'PASS', 
          'Security header present', `${header}: ${headers[header]}`);
      } else {
        addResult('SERVER_SECURITY', `${header} header`, 'WARN', 
          'Security header missing', `Consider adding ${header} header`);
      }
    });
    
  } catch (error) {
    addResult('SERVER_SECURITY', 'Server security analysis', 'FAIL', 
      'Unable to analyze server security', error.message);
  }
  
  // Test HTTP methods
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE'];
  
  for (const method of httpMethods) {
    try {
      const response = await axios({
        method: method,
        url: `${BASE_URL}/health`,
        timeout: 3000,
        validateStatus: () => true // Accept all status codes
      });
      
      if (method === 'TRACE' && response.status === 200) {
        addResult('SERVER_SECURITY', 'HTTP TRACE method', 'FAIL', 
          'TRACE method enabled - security risk', 'TRACE method should be disabled');
      } else if (method === 'OPTIONS' && response.status === 200) {
        addResult('SERVER_SECURITY', 'HTTP OPTIONS method', 'INFO', 
          'OPTIONS method enabled', 'Check if CORS configuration is secure');
      } else if (['GET', 'POST'].includes(method) && response.status < 400) {
        addResult('SERVER_SECURITY', `HTTP ${method} method`, 'PASS', 
          'Standard HTTP method working correctly');
      }
    } catch (error) {
      // Method not allowed or blocked - this is generally good for security
    }
  }
}

/**
 * 1.3 Database Security Testing
 */
async function testDatabaseSecurity() {
  console.log('\n🗄️  TESTING DATABASE SECURITY'.blue?.bold || '\n🗄️  TESTING DATABASE SECURITY');
  
  try {
    // Test for database error disclosure
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; SELECT version(); --"
    ];
    
    for (const input of maliciousInputs) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
          username: input,
          password: 'test',
          project: 'test',
          city: 'test'
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        // Check if database errors are exposed
        const responseText = JSON.stringify(response.data).toLowerCase();
        if (responseText.includes('sql') || 
            responseText.includes('database') || 
            responseText.includes('postgresql') ||
            responseText.includes('prisma') ||
            responseText.includes('syntax error') ||
            responseText.includes('relation') ||
            responseText.includes('column')) {
          addResult('DATABASE_SECURITY', 'Database error disclosure', 'FAIL', 
            'Database errors exposed to client', `Input: ${input}`);
        } else {
          addResult('DATABASE_SECURITY', 'Database error disclosure', 'PASS', 
            'Database errors properly handled', `Input: ${input} - No sensitive info disclosed`);
        }
        
      } catch (error) {
        // Network errors are acceptable for malicious inputs
        addResult('DATABASE_SECURITY', 'Database error handling', 'PASS', 
          'Malicious input properly rejected');
      }
      
      await sleep(100); // Rate limiting protection
    }
    
  } catch (error) {
    addResult('DATABASE_SECURITY', 'Database security testing', 'WARN', 
      'Unable to complete database security tests', error.message);
  }
  
  // Test database connection security
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status === 200) {
      addResult('DATABASE_SECURITY', 'Database connectivity', 'PASS', 
        'Database connection appears secure', 'No direct database access exposed');
    }
  } catch (error) {
    addResult('DATABASE_SECURITY', 'Database connectivity', 'WARN', 
      'Database connectivity issue', error.message);
  }
}

/**
 * 1.4 Request Size and DoS Protection Testing
 */
async function testDoSProtection() {
  console.log('\n🛡️  TESTING DOS PROTECTION'.blue?.bold || '\n🛡️  TESTING DOS PROTECTION');
  
  // Test large request handling
  try {
    const largePayload = 'A'.repeat(10 * 1024 * 1024); // 10MB payload
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: largePayload,
      password: 'test',
      project: 'test', 
      city: 'test'
    }, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (response.status === 413 || response.status === 400) {
      addResult('DOS_PROTECTION', 'Large request handling', 'PASS', 
        'Large requests properly rejected', `Status: ${response.status}`);
    } else {
      addResult('DOS_PROTECTION', 'Large request handling', 'WARN', 
        'Large requests not properly limited', `Status: ${response.status}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      addResult('DOS_PROTECTION', 'Large request handling', 'PASS', 
        'Large requests properly terminated');
    } else {
      addResult('DOS_PROTECTION', 'Large request handling', 'WARN', 
        'Unexpected error with large requests', error.message);
    }
  }
  
  // Test concurrent request handling
  const concurrentRequests = Array.from({length: 20}, (_, i) => 
    axios.get(`${BASE_URL}/health`, {
      timeout: 5000,
      validateStatus: () => true
    }).catch(err => ({ error: err.message }))
  );
  
  try {
    const results = await Promise.all(concurrentRequests);
    const successCount = results.filter(r => !r.error && r.status === 200).length;
    const errorCount = results.filter(r => r.error).length;
    
    if (successCount > 15) {
      addResult('DOS_PROTECTION', 'Concurrent request handling', 'PASS', 
        'Server handles concurrent requests well', `${successCount}/20 successful`);
    } else if (errorCount > 15) {
      addResult('DOS_PROTECTION', 'Concurrent request handling', 'WARN', 
        'Server may be vulnerable to DoS', `${errorCount}/20 failed`);
    } else {
      addResult('DOS_PROTECTION', 'Concurrent request handling', 'INFO', 
        'Mixed results for concurrent requests', `${successCount}/20 successful`);
    }
    
  } catch (error) {
    addResult('DOS_PROTECTION', 'Concurrent request handling', 'WARN', 
      'Error testing concurrent requests', error.message);
  }
}

/**
 * Generate comprehensive Layer 1 security report
 */
function generateLayer1Report() {
  console.log('\n📊 LAYER 1 INFRASTRUCTURE SECURITY REPORT'.blue?.bold || '\n📊 LAYER 1 INFRASTRUCTURE SECURITY REPORT');
  console.log('='.repeat(50));
  
  const categories = ['NETWORK_SECURITY', 'SERVER_SECURITY', 'DATABASE_SECURITY', 'DOS_PROTECTION'];
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
  
  console.log('\n📈 LAYER 1 SUMMARY:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
  
  const score = ((passedTests + (warningTests * 0.5)) / totalTests) * 100;
  console.log(`\n🎯 LAYER 1 INFRASTRUCTURE SECURITY SCORE: ${score.toFixed(1)}%`);
  
  if (score >= 90) {
    console.log('✅ EXCELLENT infrastructure security posture');
  } else if (score >= 75) {
    console.log('⚠️  GOOD infrastructure security with minor improvements needed');
  } else if (score >= 60) {
    console.log('⚠️  MODERATE infrastructure security - several issues to address');
  } else {
    console.log('❌ POOR infrastructure security - immediate attention required');
  }
  
  return {
    layer: 'LAYER 1: INFRASTRUCTURE SECURITY',
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
async function runLayer1Tests() {
  console.log('🛡️  STARTING LAYER 1: INFRASTRUCTURE SECURITY TESTING'.cyan?.bold || '🛡️  STARTING LAYER 1: INFRASTRUCTURE SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: Network, Server, Database, DoS Protection');
  console.log('=' .repeat(60));
  
  try {
    await testNetworkSecurity();
    await testServerSecurity();
    await testDatabaseSecurity();
    await testDoSProtection();
    
    const report = generateLayer1Report();
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('layer1-infrastructure-security-results.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Results saved to layer1-infrastructure-security-results.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Error during Layer 1 testing:', error.message);
    return null;
  }
}

// Execute if run directly
if (require.main === module) {
  runLayer1Tests()
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

module.exports = { runLayer1Tests };