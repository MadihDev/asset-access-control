/**
 * Enhanced Authentication Security Testing with Rate Limiting Bypass
 * 
 * This test performs comprehensive authentication and authorization validation
 * using the testing bypass mechanism to circumvent rate limiting for thorough security analysis.
 * 
 * SECURITY LAYERS TESTED:
 * - Layer 1: Input validation and sanitization
 * - Layer 2: Authentication mechanisms and token handling  
 * - Layer 3: Authorization logic and role enforcement
 * - Layer 4: Error handling and information disclosure
 * 
 * BYPASS MECHANISM:
 * Uses x-security-test and x-security-test-key headers to bypass rate limiting
 * in development/testing environments only.
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:5000';
const SECURITY_TEST_KEY = 'secure-test-key-12345-change-in-production';

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Results storage
const testResults = {
    timestamp: new Date().toISOString(),
    authenticationTests: [],
    authorizationTests: [],
    errorHandlingTests: [],
    vulnerabilities: [],
    recommendations: []
};

/**
 * Create axios instance with security test bypass headers
 */
function createSecurityTestClient() {
    return axios.create({
        baseURL: BASE_URL,
        timeout: 10000,
        headers: {
            'x-security-test': 'true',
            'x-security-test-key': SECURITY_TEST_KEY,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true // Accept all status codes
    });
}

/**
 * Log test results with color coding
 */
function logTest(description, passed, details = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        console.log(`✅ PASS: ${description}`);
    } else {
        failedTests++;
        console.log(`❌ FAIL: ${description}`);
        if (details) console.log(`   └─ ${details}`);
    }
}

/**
 * Generate random test data
 */
function generateTestData() {
    const randomId = Math.floor(Math.random() * 1000000);
    return {
        username: `test_user_${randomId}`,
        email: `test${randomId}@example.com`,
        password: 'TestPassword123!',
        phone: '+1234567890',
        firstName: 'Test',
        lastName: 'User'
    };
}

/**
 * Test 1: Authentication Bypass Attempts
 */
async function testAuthenticationBypass() {
    console.log('\n🔐 TESTING AUTHENTICATION BYPASS ATTEMPTS');
    const client = createSecurityTestClient();

    // Test 1.1: Missing JWT token
    try {
        const response = await client.get('/api/auth/profile');
        const passed = response.status === 401;
        logTest('Missing JWT token rejected', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'Missing JWT token',
            passed,
            status: response.status,
            details: 'Should return 401 for missing authorization'
        });
    } catch (error) {
        logTest('Missing JWT token rejected', false, `Error: ${error.message}`);
    }

    // Test 1.2: Invalid JWT token format
    try {
        const response = await client.get('/api/auth/profile', {
            headers: { Authorization: 'Bearer invalid-token-format' }
        });
        const passed = response.status === 401;
        logTest('Invalid JWT format rejected', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'Invalid JWT format',
            passed,
            status: response.status,
            details: 'Should return 401 for malformed JWT'
        });
    } catch (error) {
        logTest('Invalid JWT format rejected', false, `Error: ${error.message}`);
    }

    // Test 1.3: Expired JWT token simulation
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6InRlc3QiLCJyb2xlIjoidXNlciIsImV4cCI6MTYwMDAwMDAwMH0.invalid';
    try {
        const response = await client.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${expiredToken}` }
        });
        const passed = response.status === 401;
        logTest('Expired JWT token rejected', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'Expired JWT token',
            passed,
            status: response.status,
            details: 'Should return 401 for expired tokens'
        });
    } catch (error) {
        logTest('Expired JWT token rejected', false, `Error: ${error.message}`);
    }

    // Test 1.4: SQL injection in login
    try {
        const response = await client.post('/api/auth/login', {
            username: "admin' OR '1'='1",
            password: "anything"
        });
        const passed = response.status !== 200;
        logTest('SQL injection in login blocked', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'SQL injection in login',
            passed,
            status: response.status,
            details: 'Should not authenticate with SQL injection attempts'
        });
    } catch (error) {
        logTest('SQL injection in login blocked', false, `Error: ${error.message}`);
    }
}

/**
 * Test 2: Role-Based Authorization
 */
async function testRoleBasedAuthorization() {
    console.log('\n👮 TESTING ROLE-BASED AUTHORIZATION');
    const client = createSecurityTestClient();

    // Try to login with common test credentials to get a valid token
    let userToken = null;
    const testCredentials = [
        { username: 'admin', password: 'admin123' },
        { username: 'john.doe', password: 'password123' },
        { username: 'alice.smith', password: 'password123' },
        { username: 'bob.wilson', password: 'password123' },
        { username: 'testuser', password: 'password123' },
        { username: 'user', password: 'user123' },
        { username: 'demo', password: 'demo123' }
    ];

    for (const creds of testCredentials) {
        try {
            const loginResponse = await client.post('/api/auth/login', creds);
            if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.accessToken) {
                userToken = loginResponse.data.data.accessToken;
                console.log(`   ✓ Successfully logged in with credentials: ${creds.username}`);
                break;
            }
        } catch (error) {
            // Try next credentials
        }
    }
    
    if (!userToken) {
        console.log('   ⚠️  Could not find valid test credentials for authorization tests');
    }

    if (userToken) {
        // Test 2.1: Admin endpoint access with regular user token
        try {
            const response = await client.get('/api/user/', {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const passed = response.status === 403 || response.status === 401;
            logTest('Admin endpoint blocks regular user', passed, `Status: ${response.status}`);
            
            testResults.authorizationTests.push({
                test: 'Admin endpoint access control',
                passed,
                status: response.status,
                details: 'Regular users should not access admin endpoints'
            });
        } catch (error) {
            logTest('Admin endpoint blocks regular user', false, `Error: ${error.message}`);
        }

        // Test 2.2: User profile access with valid token
        try {
            const response = await client.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            const passed = response.status === 200;
            logTest('Valid user can access own profile', passed, `Status: ${response.status}`);
            
            testResults.authorizationTests.push({
                test: 'Valid user profile access',
                passed,
                status: response.status,
                details: 'Authenticated users should access their own profile'
            });
        } catch (error) {
            logTest('Valid user can access own profile', false, `Error: ${error.message}`);
        }
    }

    // Test 2.3: Cross-tenant data access prevention
    try {
        const response = await client.get('/api/project?projectCityId=999999', {
            headers: userToken ? { Authorization: `Bearer ${userToken}` } : {}
        });
        
        // Should either require auth (401) or properly filter by tenant (200 with empty/filtered results)
        const passed = response.status === 401 || (response.status === 200 && (!response.data || response.data.length === 0));
        logTest('Cross-tenant data access prevention', passed, `Status: ${response.status}, Data: ${JSON.stringify(response.data).slice(0, 100)}`);
        
        testResults.authorizationTests.push({
            test: 'Cross-tenant data access',
            passed,
            status: response.status,
            details: 'Should prevent access to other tenant data'
        });
    } catch (error) {
        logTest('Cross-tenant data access prevention', false, `Error: ${error.message}`);
    }
}

/**
 * Test 3: Input Validation and Sanitization
 */
async function testInputValidationAndSanitization() {
    console.log('\n🛡️  TESTING INPUT VALIDATION AND SANITIZATION');
    const client = createSecurityTestClient();

    // Test 3.1: XSS payload in login
    try {
        const response = await client.post('/api/auth/login', {
            username: '<script>alert("xss")</script>',
            password: 'anypassword'
        });
        
        const passed = response.status === 400 || response.status === 401; // Should be rejected for validation or auth failure
        logTest('XSS payload in login blocked/sanitized', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'XSS payload in login',
            passed,
            status: response.status,
            details: 'Should reject or sanitize XSS payloads'
        });
    } catch (error) {
        logTest('XSS payload in login blocked/sanitized', false, `Error: ${error.message}`);
    }

    // Test 3.2: Excessively long input in login
    const longString = 'a'.repeat(10000);
    try {
        const response = await client.post('/api/auth/login', {
            username: longString,
            password: 'ValidPassword123!'
        });
        
        const passed = response.status === 400; // Should be rejected for validation
        logTest('Excessively long input rejected', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'Excessively long input',
            passed,
            status: response.status,
            details: 'Should reject inputs exceeding length limits'
        });
    } catch (error) {
        logTest('Excessively long input rejected', false, `Error: ${error.message}`);
    }

    // Test 3.3: Empty/null input validation
    try {
        const response = await client.post('/api/auth/login', {
            username: '',
            password: ''
        });
        
        const passed = response.status === 400;
        logTest('Empty input validation works', passed, `Status: ${response.status}`);
        
        testResults.authenticationTests.push({
            test: 'Empty input validation',
            passed,
            status: response.status,
            details: 'Should validate required fields'
        });
    } catch (error) {
        logTest('Empty input validation works', false, `Error: ${error.message}`);
    }
}

/**
 * Test 4: Error Handling and Information Disclosure
 */
async function testErrorHandling() {
    console.log('\n🚨 TESTING ERROR HANDLING AND INFORMATION DISCLOSURE');
    const client = createSecurityTestClient();

    // Test 4.1: Database error exposure
    try {
        const response = await client.get('/api/nonexistent-endpoint');
        const passed = response.status === 404 && !response.data.stack && !response.data.query;
        logTest('Database errors do not expose sensitive info', passed, `Status: ${response.status}`);
        
        testResults.errorHandlingTests.push({
            test: 'Database error exposure',
            passed,
            status: response.status,
            details: 'Should not expose stack traces or SQL queries'
        });
    } catch (error) {
        logTest('Database errors do not expose sensitive info', false, `Error: ${error.message}`);
    }

    // Test 4.2: Rate limiting bypass confirmation
    try {
        const response = await client.get('/api/auth/profile'); // This endpoint goes through rate limiting
        const bypassConfirmed = response.headers['x-security-test-bypass'] === 'active';
        logTest('Rate limiting bypass works in testing', bypassConfirmed, `Bypass header: ${response.headers['x-security-test-bypass']}, Status: ${response.status}`);
        
        testResults.errorHandlingTests.push({
            test: 'Rate limiting bypass',
            passed: bypassConfirmed,
            status: response.status,
            details: 'Should confirm bypass is working for testing'
        });
    } catch (error) {
        logTest('Rate limiting bypass works in testing', false, `Error: ${error.message}`);
    }

    // Test 4.3: Consistent error responses
    const invalidEndpoints = ['/api/invalid1', '/api/invalid2', '/api/invalid3'];
    const responses = [];
    
    for (const endpoint of invalidEndpoints) {
        try {
            const response = await client.get(endpoint);
            responses.push(response.status);
        } catch (error) {
            responses.push('ERROR');
        }
    }
    
    const consistentResponses = responses.every(status => status === responses[0]);
    logTest('Consistent error responses across endpoints', consistentResponses, `Responses: ${responses.join(', ')}`);
    
    testResults.errorHandlingTests.push({
        test: 'Consistent error responses',
        passed: consistentResponses,
        responses: responses,
        details: 'Should return consistent error codes for similar invalid requests'
    });
}

/**
 * Test 5: Session and Token Security
 */
async function testSessionSecurity() {
    console.log('\n🔑 TESTING SESSION AND TOKEN SECURITY');
    const client = createSecurityTestClient();

    // Test 5.1: Token reuse after logout (using test credentials from earlier)
    let testToken = null;
    const testCreds = { username: 'john.doe', password: 'password123' };

    try {
        // Login to get a token
        const loginResponse = await client.post('/api/auth/login', testCreds);
        
        if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.accessToken) {
            testToken = loginResponse.data.data.accessToken;
            
            // Logout
            await client.post('/api/auth/logout', {}, {
                headers: { Authorization: `Bearer ${testToken}` }
            });
            
            // Try to use token after logout
            const response = await client.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${testToken}` }
            });
            
            const passed = response.status === 401;
            logTest('Token invalidated after logout', passed, `Status: ${response.status}`);
            
            testResults.authenticationTests.push({
                test: 'Token invalidation after logout',
                passed,
                status: response.status,
                details: 'Tokens should be invalidated after logout'
            });
        } else {
            logTest('Token invalidated after logout', false, 'Could not get test token');
        }
    } catch (error) {
        logTest('Token invalidated after logout', false, `Error: ${error.message}`);
    }

    // Test 5.2: Token structure analysis
    if (testToken) {
        const tokenParts = testToken.split('.');
        const hasThreeParts = tokenParts.length === 3;
        logTest('JWT token has valid structure', hasThreeParts, `Parts: ${tokenParts.length}`);
        
        testResults.authenticationTests.push({
            test: 'JWT token structure',
            passed: hasThreeParts,
            details: 'JWT should have header, payload, and signature'
        });
    }
}

/**
 * Generate comprehensive security report
 */
function generateSecurityReport() {
    console.log('\n📊 ENHANCED AUTHENTICATION SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    
    // Security score calculation
    let securityScore = 0;
    if (passedTests >= Math.ceil(totalTests * 0.9)) securityScore = 95; // Excellent
    else if (passedTests >= Math.ceil(totalTests * 0.8)) securityScore = 85; // Good
    else if (passedTests >= Math.ceil(totalTests * 0.7)) securityScore = 75; // Fair
    else if (passedTests >= Math.ceil(totalTests * 0.6)) securityScore = 65; // Poor
    else securityScore = 45; // Critical
    
    console.log(`\n🎯 ENHANCED AUTHENTICATION SECURITY SCORE: ${securityScore}%`);
    
    // Risk assessment
    if (securityScore >= 90) {
        console.log('🟢 RISK LEVEL: LOW - Strong authentication security posture');
    } else if (securityScore >= 75) {
        console.log('🟡 RISK LEVEL: MEDIUM - Some authentication vulnerabilities present');
    } else {
        console.log('🔴 RISK LEVEL: HIGH - Critical authentication security issues detected');
    }

    // Add summary to results
    testResults.summary = {
        totalTests,
        passedTests,
        failedTests,
        successRate: parseFloat(successRate),
        securityScore,
        riskLevel: securityScore >= 90 ? 'LOW' : securityScore >= 75 ? 'MEDIUM' : 'HIGH'
    };

    // Recommendations based on failures
    if (failedTests > 0) {
        console.log('\n🔧 SECURITY RECOMMENDATIONS:');
        testResults.recommendations.push(
            'Review failed authentication tests and implement proper security controls',
            'Ensure all user inputs are properly validated and sanitized',
            'Implement proper role-based access control (RBAC)',
            'Configure secure error handling without information disclosure',
            'Validate JWT token lifecycle management'
        );
        testResults.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    const reportPath = './ENHANCED_AUTHENTICATION_SECURITY_RESULTS.md';
    
    let reportContent = `# Enhanced Authentication Security Test Results\n\n`;
    reportContent += `**Test Date:** ${testResults.timestamp}\n`;
    reportContent += `**Security Score:** ${securityScore}%\n`;
    reportContent += `**Risk Level:** ${testResults.summary.riskLevel}\n\n`;
    
    reportContent += `## Summary\n`;
    reportContent += `- **Total Tests:** ${totalTests}\n`;
    reportContent += `- **Passed:** ${passedTests}\n`;
    reportContent += `- **Failed:** ${failedTests}\n`;
    reportContent += `- **Success Rate:** ${successRate}%\n\n`;
    
    if (testResults.authenticationTests.length > 0) {
        reportContent += `## Authentication Tests\n`;
        testResults.authenticationTests.forEach((test, index) => {
            reportContent += `${index + 1}. **${test.test}**: ${test.passed ? '✅ PASS' : '❌ FAIL'} (Status: ${test.status})\n`;
            reportContent += `   - ${test.details}\n\n`;
        });
    }
    
    if (testResults.authorizationTests.length > 0) {
        reportContent += `## Authorization Tests\n`;
        testResults.authorizationTests.forEach((test, index) => {
            reportContent += `${index + 1}. **${test.test}**: ${test.passed ? '✅ PASS' : '❌ FAIL'} (Status: ${test.status})\n`;
            reportContent += `   - ${test.details}\n\n`;
        });
    }
    
    if (testResults.errorHandlingTests.length > 0) {
        reportContent += `## Error Handling Tests\n`;
        testResults.errorHandlingTests.forEach((test, index) => {
            reportContent += `${index + 1}. **${test.test}**: ${test.passed ? '✅ PASS' : '❌ FAIL'} (Status: ${test.status})\n`;
            reportContent += `   - ${test.details}\n\n`;
        });
    }
    
    if (testResults.recommendations.length > 0) {
        reportContent += `## Security Recommendations\n`;
        testResults.recommendations.forEach((rec, index) => {
            reportContent += `${index + 1}. ${rec}\n`;
        });
    }
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);
}

/**
 * Main execution
 */
async function runEnhancedAuthenticationSecurityTests() {
    console.log('🔒 ENHANCED AUTHENTICATION SECURITY TESTING');
    console.log('============================================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Security Test Key: ${SECURITY_TEST_KEY ? '[CONFIGURED]' : '[MISSING]'}`);
    console.log(`Environment: Testing with rate limiting bypass\n`);

    try {
        await testAuthenticationBypass();
        await testRoleBasedAuthorization(); 
        await testInputValidationAndSanitization();
        await testErrorHandling();
        await testSessionSecurity();
        
        generateSecurityReport();
        
    } catch (error) {
        console.error('❌ Fatal error during security testing:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    runEnhancedAuthenticationSecurityTests();
}

module.exports = {
    runEnhancedAuthenticationSecurityTests,
    createSecurityTestClient,
    testResults
};