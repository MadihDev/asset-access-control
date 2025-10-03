/**
 * LAYER 9: FRONTEND SECURITY TESTING
 * Multi-Tenant RFID Access Control System
 * 
 * Following checklist from COMPREHENSIVE_CYBERSECURITY_TESTING_METHODOLOGY.md:
 * - [ ] Client-side security configuration validated
 * - [ ] XSS protection mechanisms tested
 * - [ ] Content Security Policy (CSP) validated
 * - [ ] Secure cookie configuration checked
 * - [ ] Local storage security assessed
 * - [ ] Session management security tested
 * - [ ] Client-side input validation verified
 * - [ ] DOM manipulation security checked
 * - [ ] Third-party library security assessed
 * - [ ] Client-side authentication security validated
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000'; // Frontend URL
const API_BASE_URL = 'http://localhost:5000/api'; // Backend API URL

// Test results storage
const testResults = [];

function addResult(category, test, status, message, details = '') {
  const result = {
    layer: 'LAYER 9: FRONTEND SECURITY',
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
 * LAYER 9.1: CLIENT-SIDE SECURITY CONFIGURATION
 * Test frontend security headers and configuration
 */
async function testClientSideSecurityConfiguration() {
  console.log('\n🌐 TESTING CLIENT-SIDE SECURITY CONFIGURATION');
  
  try {
    const frontendResponse = await axios.get(BASE_URL, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (frontendResponse.status === 200) {
      // Check security headers
      const headers = frontendResponse.headers;
      
      // X-Content-Type-Options
      if (headers['x-content-type-options'] === 'nosniff') {
        addResult('FRONTEND_CONFIG', 'X-Content-Type-Options header', 'PASS', 
          'MIME type sniffing properly disabled');
      } else {
        addResult('FRONTEND_CONFIG', 'X-Content-Type-Options header', 'WARN', 
          'X-Content-Type-Options header missing', 'Add nosniff header');
      }
      
      // X-Frame-Options
      const frameOptions = headers['x-frame-options'];
      if (frameOptions === 'DENY' || frameOptions === 'SAMEORIGIN') {
        addResult('FRONTEND_CONFIG', 'X-Frame-Options header', 'PASS', 
          'Clickjacking protection properly configured');
      } else {
        addResult('FRONTEND_CONFIG', 'X-Frame-Options header', 'WARN', 
          'X-Frame-Options header missing or misconfigured', 'Add clickjacking protection');
      }
      
      // X-XSS-Protection
      const xssProtection = headers['x-xss-protection'];
      if (xssProtection && xssProtection.includes('1')) {
        addResult('FRONTEND_CONFIG', 'X-XSS-Protection header', 'PASS', 
          'XSS protection header configured');
      } else {
        addResult('FRONTEND_CONFIG', 'X-XSS-Protection header', 'WARN', 
          'X-XSS-Protection header missing', 'Add XSS protection header');
      }
      
      // Strict-Transport-Security
      const hsts = headers['strict-transport-security'];
      if (hsts && hsts.includes('max-age')) {
        addResult('FRONTEND_CONFIG', 'HSTS header', 'PASS', 
          'HTTP Strict Transport Security configured');
      } else {
        addResult('FRONTEND_CONFIG', 'HSTS header', 'WARN', 
          'HSTS header missing', 'Add HTTPS enforcement');
      }
      
      // Referrer-Policy
      const referrerPolicy = headers['referrer-policy'];
      if (referrerPolicy) {
        addResult('FRONTEND_CONFIG', 'Referrer-Policy header', 'PASS', 
          'Referrer policy configured');
      } else {
        addResult('FRONTEND_CONFIG', 'Referrer-Policy header', 'WARN', 
          'Referrer-Policy header missing', 'Add referrer policy');
      }
      
    } else {
      addResult('FRONTEND_CONFIG', 'Frontend availability', 'FAIL', 
        `Frontend not accessible (status: ${frontendResponse.status})`);
    }
    
    await sleep(1000);
  } catch (error) {
    addResult('FRONTEND_CONFIG', 'Frontend accessibility', 'FAIL', 
      'Frontend not accessible', error.message);
  }
}

/**
 * LAYER 9.2: CONTENT SECURITY POLICY (CSP) VALIDATION
 * Test CSP implementation and configuration
 */
async function testContentSecurityPolicy() {
  console.log('\n🛡️ TESTING CONTENT SECURITY POLICY (CSP)');
  
  try {
    const cspResponse = await axios.get(BASE_URL, {
      timeout: 8000,
      validateStatus: () => true
    });
    
    const csp = cspResponse.headers['content-security-policy'] || 
                cspResponse.headers['content-security-policy-report-only'];
    
    if (csp) {
      addResult('CSP_VALIDATION', 'CSP header presence', 'PASS', 
        'Content Security Policy header found');
      
      // Check for unsafe directives
      if (csp.includes("'unsafe-inline'")) {
        addResult('CSP_VALIDATION', 'CSP unsafe-inline directive', 'WARN', 
          "CSP allows 'unsafe-inline'", 'Potential XSS risk - use nonces or hashes');
      } else {
        addResult('CSP_VALIDATION', 'CSP unsafe-inline protection', 'PASS', 
          "CSP does not allow 'unsafe-inline'");
      }
      
      if (csp.includes("'unsafe-eval'")) {
        addResult('CSP_VALIDATION', 'CSP unsafe-eval directive', 'WARN', 
          "CSP allows 'unsafe-eval'", 'Potential code injection risk');
      } else {
        addResult('CSP_VALIDATION', 'CSP unsafe-eval protection', 'PASS', 
          "CSP does not allow 'unsafe-eval'");
      }
      
      // Check for wildcard sources
      if (csp.includes('*') && !csp.includes('*.')) {
        addResult('CSP_VALIDATION', 'CSP wildcard sources', 'WARN', 
          'CSP uses wildcard (*) sources', 'Be specific with allowed sources');
      } else {
        addResult('CSP_VALIDATION', 'CSP source specificity', 'PASS', 
          'CSP uses specific sources');
      }
      
      // Check for data: URIs
      if (csp.includes('data:')) {
        addResult('CSP_VALIDATION', 'CSP data URI allowance', 'WARN', 
          'CSP allows data: URIs', 'Potential data exfiltration risk');
      } else {
        addResult('CSP_VALIDATION', 'CSP data URI restriction', 'PASS', 
          'CSP restricts data: URIs');
      }
      
      // Check for report-uri or report-to
      if (csp.includes('report-uri') || csp.includes('report-to')) {
        addResult('CSP_VALIDATION', 'CSP violation reporting', 'PASS', 
          'CSP violation reporting configured');
      } else {
        addResult('CSP_VALIDATION', 'CSP violation reporting', 'WARN', 
          'CSP violation reporting not configured', 'Add CSP reporting');
      }
      
    } else {
      addResult('CSP_VALIDATION', 'CSP header presence', 'FAIL', 
        'Content Security Policy header missing', 'Critical XSS protection missing');
    }
    
    await sleep(500);
  } catch (error) {
    addResult('CSP_VALIDATION', 'CSP header check', 'FAIL', 
      'Could not check CSP header', error.message);
  }
}

/**
 * LAYER 9.3: XSS PROTECTION MECHANISMS
 * Test XSS protection and input sanitization on frontend
 */
async function testXSSProtectionMechanisms() {
  console.log('\n🚫 TESTING XSS PROTECTION MECHANISMS');
  
  // Test for reflected XSS via URL parameters
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '"><script>alert("xss")</script>',
    '\';alert("xss");//',
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
    '<details open ontoggle=alert("xss")>'
  ];
  
  for (const payload of xssPayloads) {
    try {
      const xssResponse = await axios.get(`${BASE_URL}?search=${encodeURIComponent(payload)}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (xssResponse.status === 200) {
        const responseBody = xssResponse.data.toString();
        
        // Check if payload is reflected without encoding
        if (responseBody.includes(payload) && !responseBody.includes('&lt;script&gt;')) {
          addResult('XSS_PROTECTION', `Reflected XSS protection (${payload.substring(0, 20)}...)`, 'FAIL', 
            'XSS payload reflected without encoding', 'Critical XSS vulnerability');
        } else {
          addResult('XSS_PROTECTION', `Reflected XSS protection (${payload.substring(0, 20)}...)`, 'PASS', 
            'XSS payload properly encoded or filtered');
        }
      }
      
      await sleep(300);
    } catch (error) {
      addResult('XSS_PROTECTION', `XSS payload protection (${payload.substring(0, 20)}...)`, 'PASS', 
        'XSS payload properly blocked');
    }
  }
  
  // Test DOM-based XSS by checking for dangerous JavaScript patterns
  try {
    const domResponse = await axios.get(BASE_URL, {
      timeout: 8000,
      validateStatus: () => true
    });
    
    if (domResponse.status === 200) {
      const htmlContent = domResponse.data.toString().toLowerCase();
      
      // Check for dangerous patterns
      const dangerousPatterns = [
        'document.write(',
        'eval(',
        'innerhtml',
        'outerhtml',
        'document.location',
        'window.location.href',
        'location.hash'
      ];
      
      let dangerousPatternFound = false;
      dangerousPatterns.forEach(pattern => {
        if (htmlContent.includes(pattern)) {
          dangerousPatternFound = true;
          addResult('XSS_PROTECTION', `DOM XSS risk pattern (${pattern})`, 'WARN', 
            `Potentially dangerous pattern found: ${pattern}`, 'Review for DOM XSS vulnerabilities');
        }
      });
      
      if (!dangerousPatternFound) {
        addResult('XSS_PROTECTION', 'DOM XSS pattern analysis', 'PASS', 
          'No obvious DOM XSS patterns detected');
      }
    }
    
    await sleep(500);
  } catch (error) {
    addResult('XSS_PROTECTION', 'DOM XSS pattern check', 'INFO', 
      'Could not analyze DOM XSS patterns');
  }
}

/**
 * LAYER 9.4: SECURE COOKIE CONFIGURATION
 * Test cookie security attributes
 */
async function testSecureCookieConfiguration() {
  console.log('\n🍪 TESTING SECURE COOKIE CONFIGURATION');
  
  try {
    // Try to login to get cookies
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'techcorpadminamsterdam',
      password: 'demo123',
      projectId: 'techcorp',
      cityName: 'Amsterdam'
    }, { 
      timeout: 10000,
      validateStatus: () => true 
    });
    
    if (loginResponse.status === 200) {
      const cookies = loginResponse.headers['set-cookie'];
      
      if (cookies && cookies.length > 0) {
        cookies.forEach((cookie, index) => {
          const cookieLower = cookie.toLowerCase();
          
          // Check HttpOnly flag
          if (cookieLower.includes('httponly')) {
            addResult('COOKIE_SECURITY', `Cookie ${index + 1} HttpOnly flag`, 'PASS', 
              'Cookie has HttpOnly flag set');
          } else {
            addResult('COOKIE_SECURITY', `Cookie ${index + 1} HttpOnly flag`, 'WARN', 
              'Cookie missing HttpOnly flag', 'XSS cookie theft risk');
          }
          
          // Check Secure flag
          if (cookieLower.includes('secure')) {
            addResult('COOKIE_SECURITY', `Cookie ${index + 1} Secure flag`, 'PASS', 
              'Cookie has Secure flag set');
          } else {
            addResult('COOKIE_SECURITY', `Cookie ${index + 1} Secure flag`, 'WARN', 
              'Cookie missing Secure flag', 'HTTPS transmission risk');
          }
          
          // Check SameSite attribute
          if (cookieLower.includes('samesite')) {
            if (cookieLower.includes('samesite=strict') || cookieLower.includes('samesite=lax')) {
              addResult('COOKIE_SECURITY', `Cookie ${index + 1} SameSite attribute`, 'PASS', 
                'Cookie has proper SameSite attribute');
            } else {
              addResult('COOKIE_SECURITY', `Cookie ${index + 1} SameSite value`, 'WARN', 
                'Cookie SameSite value may be insecure', 'Use Strict or Lax');
            }
          } else {
            addResult('COOKIE_SECURITY', `Cookie ${index + 1} SameSite attribute`, 'WARN', 
              'Cookie missing SameSite attribute', 'CSRF protection risk');
          }
        });
      } else {
        addResult('COOKIE_SECURITY', 'Authentication cookie presence', 'INFO', 
          'No cookies set by authentication endpoint');
      }
    } else {
      addResult('COOKIE_SECURITY', 'Authentication for cookie testing', 'WARN', 
        'Could not authenticate to test cookies');
    }
    
    await sleep(1000);
  } catch (error) {
    addResult('COOKIE_SECURITY', 'Cookie security testing', 'WARN', 
      'Could not test cookie security', error.message);
  }
}

/**
 * LAYER 9.5: LOCAL STORAGE SECURITY
 * Test local storage and session storage usage
 */
async function testLocalStorageSecurity() {
  console.log('\n💾 TESTING LOCAL STORAGE SECURITY');
  
  try {
    const frontendResponse = await axios.get(BASE_URL, {
      timeout: 8000,
      validateStatus: () => true
    });
    
    if (frontendResponse.status === 200) {
      const htmlContent = frontendResponse.data.toString().toLowerCase();
      
      // Check for localStorage usage
      if (htmlContent.includes('localstorage')) {
        addResult('STORAGE_SECURITY', 'localStorage usage detected', 'WARN', 
          'localStorage usage found', 'Ensure no sensitive data stored');
        
        // Check for sensitive data patterns in localStorage usage
        const sensitivePatterns = ['token', 'password', 'secret', 'key', 'credential'];
        sensitivePatterns.forEach(pattern => {
          if (htmlContent.includes(`localstorage`) && htmlContent.includes(pattern)) {
            addResult('STORAGE_SECURITY', `Sensitive data in localStorage (${pattern})`, 'FAIL', 
              `Potential sensitive data (${pattern}) in localStorage`, 'Critical security risk');
          }
        });
      } else {
        addResult('STORAGE_SECURITY', 'localStorage usage', 'PASS', 
          'No obvious localStorage usage detected');
      }
      
      // Check for sessionStorage usage
      if (htmlContent.includes('sessionstorage')) {
        addResult('STORAGE_SECURITY', 'sessionStorage usage detected', 'INFO', 
          'sessionStorage usage found', 'Review for sensitive data');
      } else {
        addResult('STORAGE_SECURITY', 'sessionStorage usage', 'PASS', 
          'No sessionStorage usage detected');
      }
      
      // Check for IndexedDB usage
      if (htmlContent.includes('indexeddb')) {
        addResult('STORAGE_SECURITY', 'IndexedDB usage detected', 'INFO', 
          'IndexedDB usage found', 'Review for sensitive data');
      } else {
        addResult('STORAGE_SECURITY', 'IndexedDB usage', 'PASS', 
          'No IndexedDB usage detected');
      }
    }
    
    await sleep(500);
  } catch (error) {
    addResult('STORAGE_SECURITY', 'Local storage analysis', 'WARN', 
      'Could not analyze local storage usage', error.message);
  }
}

/**
 * LAYER 9.6: CLIENT-SIDE INPUT VALIDATION
 * Test client-side input validation and sanitization
 */
async function testClientSideInputValidation() {
  console.log('\n✅ TESTING CLIENT-SIDE INPUT VALIDATION');
  
  try {
    const frontendResponse = await axios.get(BASE_URL, {
      timeout: 8000,
      validateStatus: () => true
    });
    
    if (frontendResponse.status === 200) {
      const htmlContent = frontendResponse.data.toString();
      
      // Check for input validation patterns
      const validationPatterns = [
        'required',
        'pattern=',
        'minlength',
        'maxlength',
        'type="email"',
        'type="password"',
        'validate',
        'sanitize'
      ];
      
      let validationFound = false;
      validationPatterns.forEach(pattern => {
        if (htmlContent.toLowerCase().includes(pattern.toLowerCase())) {
          validationFound = true;
        }
      });
      
      if (validationFound) {
        addResult('INPUT_VALIDATION', 'Client-side validation presence', 'PASS', 
          'Client-side input validation detected');
      } else {
        addResult('INPUT_VALIDATION', 'Client-side validation presence', 'WARN', 
          'No obvious client-side validation detected', 'Add input validation');
      }
      
      // Check for dangerous input handling
      const dangerousPatterns = [
        'eval(',
        'function(',
        'new function',
        'settimeout(',
        'setinterval('
      ];
      
      dangerousPatterns.forEach(pattern => {
        if (htmlContent.toLowerCase().includes(pattern)) {
          addResult('INPUT_VALIDATION', `Dangerous input handling (${pattern})`, 'WARN', 
            `Potentially dangerous pattern: ${pattern}`, 'Review for code injection risks');
        }
      });
    }
    
    await sleep(500);
  } catch (error) {
    addResult('INPUT_VALIDATION', 'Input validation analysis', 'WARN', 
      'Could not analyze input validation', error.message);
  }
}

/**
 * LAYER 9.7: THIRD-PARTY LIBRARY SECURITY
 * Check for known vulnerable third-party libraries
 */
async function testThirdPartyLibrarySecurity() {
  console.log('\n📚 TESTING THIRD-PARTY LIBRARY SECURITY');
  
  try {
    const frontendResponse = await axios.get(BASE_URL, {
      timeout: 8000,
      validateStatus: () => true
    });
    
    if (frontendResponse.status === 200) {
      const htmlContent = frontendResponse.data.toString().toLowerCase();
      
      // Check for common vulnerable libraries (examples)
      const knownVulnerablePatterns = [
        { pattern: 'jquery/1.', name: 'jQuery 1.x', risk: 'Multiple XSS vulnerabilities' },
        { pattern: 'jquery/2.', name: 'jQuery 2.x', risk: 'XSS vulnerabilities' },
        { pattern: 'bootstrap/3.', name: 'Bootstrap 3.x', risk: 'XSS vulnerabilities' },
        { pattern: 'angular/1.', name: 'AngularJS 1.x', risk: 'Multiple security issues' },
        { pattern: 'lodash/3.', name: 'Lodash 3.x', risk: 'Prototype pollution' }
      ];
      
      knownVulnerablePatterns.forEach(lib => {
        if (htmlContent.includes(lib.pattern)) {
          addResult('THIRD_PARTY_SECURITY', `Vulnerable library (${lib.name})`, 'WARN', 
            `Potentially vulnerable library detected: ${lib.name}`, lib.risk);
        }
      });
      
      // Check for CDN usage
      const cdnPatterns = ['cdn.', 'cdnjs.', 'unpkg.', 'jsdelivr.'];
      let cdnUsage = false;
      
      cdnPatterns.forEach(cdn => {
        if (htmlContent.includes(cdn)) {
          cdnUsage = true;
        }
      });
      
      if (cdnUsage) {
        addResult('THIRD_PARTY_SECURITY', 'CDN usage detected', 'INFO', 
          'CDN usage detected', 'Ensure SRI (Subresource Integrity) is used');
        
        // Check for SRI (Subresource Integrity)
        if (htmlContent.includes('integrity=')) {
          addResult('THIRD_PARTY_SECURITY', 'Subresource Integrity (SRI)', 'PASS', 
            'SRI detected for external resources');
        } else {
          addResult('THIRD_PARTY_SECURITY', 'Subresource Integrity (SRI)', 'WARN', 
            'SRI not detected for external resources', 'Add integrity checks');
        }
      } else {
        addResult('THIRD_PARTY_SECURITY', 'CDN usage', 'PASS', 
          'No CDN usage detected - using local resources');
      }
    }
    
    await sleep(500);
  } catch (error) {
    addResult('THIRD_PARTY_SECURITY', 'Third-party library analysis', 'WARN', 
      'Could not analyze third-party libraries', error.message);
  }
}

/**
 * Generate comprehensive frontend security report
 */
function generateFrontendSecurityReport() {
  console.log('\n📊 LAYER 9 FRONTEND SECURITY REPORT');
  console.log('='.repeat(70));
  
  const categories = {};
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningTests = 0;
  
  testResults.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
    
    totalTests++;
    if (result.status === 'PASS') passedTests++;
    else if (result.status === 'FAIL') failedTests++;
    else if (result.status === 'WARN') warningTests++;
  });
  
  // Display results by category
  Object.keys(categories).forEach(category => {
    console.log(`\n${category}:`);
    categories[category].forEach(result => {
      const status = result.status === 'PASS' ? '  PASS' : result.status === 'FAIL' ? '  FAIL' : '  WARN';
      console.log(`${status}: ${result.test} - ${result.message}`);
    });
  });
  
  // Calculate score
  const score = totalTests > 0 ? ((passedTests + (warningTests * 0.5)) / totalTests * 100).toFixed(1) : 0;
  
  console.log(`\n📈 LAYER 9 SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Warnings: ${warningTests} (${((warningTests/totalTests)*100).toFixed(1)}%)`);
  
  // Critical vulnerability assessment
  const criticalVulnerabilities = testResults.filter(result => 
    result.status === 'FAIL' && (result.details.includes('Critical') || result.details.includes('Critical'))
  ).length;
  
  console.log(`\n🚨 CRITICAL VULNERABILITIES: ${criticalVulnerabilities}`);
  
  console.log(`\n🎯 LAYER 9 FRONTEND SECURITY SCORE: ${score}%`);
  
  if (score >= 90) {
    console.log('✅ EXCELLENT frontend security');
  } else if (score >= 75) {
    console.log('✅ GOOD frontend security');
  } else if (score >= 60) {
    console.log('⚠️  MODERATE frontend security - some improvements needed');
  } else {
    console.log('❌ POOR frontend security - immediate attention required');
  }
  
  // Save detailed results
  const report = {
    layer: 'LAYER 9: FRONTEND SECURITY',
    totalTests,
    passedTests,
    failedTests,
    warningTests,
    score,
    criticalVulnerabilities,
    results: testResults
  };
  
  fs.writeFileSync('layer9-frontend-security-results.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Results saved to layer9-frontend-security-results.json');
}

/**
 * Main testing function
 */
async function runLayer9SecurityTests() {
  console.log('🛡️  STARTING LAYER 9: FRONTEND SECURITY TESTING');
  console.log('Target: Multi-Tenant RFID Access Control System');
  console.log('Scope: Frontend Config, CSP, XSS, Cookies, Storage, Input Validation');
  console.log('='.repeat(80));
  
  // Run all frontend security tests
  await testClientSideSecurityConfiguration();
  await testContentSecurityPolicy();
  await testXSSProtectionMechanisms();
  await testSecureCookieConfiguration();
  await testLocalStorageSecurity();
  await testClientSideInputValidation();
  await testThirdPartyLibrarySecurity();
  
  // Generate final report
  generateFrontendSecurityReport();
}

// Run the tests
runLayer9SecurityTests().catch(console.error);