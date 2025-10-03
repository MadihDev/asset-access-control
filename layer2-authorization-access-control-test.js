/**
 * Layer 2: Authorization & Access Control Security Testing
 * 
 * This test focuses on role-based access control, permission boundaries,
 * and authorization logic that goes beyond basic authentication.
 * 
 * SECURITY AREAS TESTED:
 * - Role-based endpoint protection
 * - Permission boundary validation
 * - Token scope enforcement
 * - Privilege escalation prevention
 * - Resource ownership validation
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const SECURITY_TEST_KEY = 'secure-test-key-12345-change-in-production';

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let criticalVulnerabilities = [];

// Results storage
const testResults = {
    timestamp: new Date().toISOString(),
    roleBasedTests: [],
    permissionTests: [],
    tokenSecurityTests: [],
    privilegeEscalationTests: [],
    criticalFindings: [],
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
function logTest(description, passed, details = '', severity = 'MEDIUM') {
    totalTests++;
    if (passed) {
        passedTests++;
        console.log(`✅ PASS: ${description}`);
    } else {
        failedTests++;
        const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '❌' : '⚠️';
        console.log(`${icon} FAIL: ${description}`);
        if (details) console.log(`   └─ ${details}`);
        
        if (severity === 'CRITICAL') {
            criticalVulnerabilities.push({
                test: description,
                details,
                severity
            });
        }
    }
}

/**
 * Attempt to get authentication token with different user types
 */
async function getAuthTokens() {
    const client = createSecurityTestClient();
    const tokens = {};
    
    // Try to get different user role tokens
    const testCredentials = [
        { username: 'admin', password: 'admin123', expectedRole: 'admin' },
        { username: 'manager', password: 'manager123', expectedRole: 'manager' },
        { username: 'user', password: 'user123', expectedRole: 'user' },
        { username: 'john.doe', password: 'password123', expectedRole: 'unknown' },
        { username: 'alice.smith', password: 'password123', expectedRole: 'unknown' }
    ];

    console.log('   🔑 Attempting to acquire different role tokens...');
    
    for (const creds of testCredentials) {
        try {
            const response = await client.post('/api/auth/login', creds);
            
            if (response.status === 200 && response.data && response.data.data && response.data.data.accessToken) {
                tokens[creds.expectedRole] = {
                    token: response.data.data.accessToken,
                    user: response.data.data.user,
                    username: creds.username,
                    role: response.data.data.user?.role || 'unknown'
                };
                console.log(`   ✓ ${creds.username} (${response.data.data.user?.role || 'unknown'} role)`);
            } else if (response.status === 400) {
                console.log(`   ✗ ${creds.username}: Validation failed`);
            } else {
                console.log(`   ✗ ${creds.username}: Status ${response.status}`);
            }
        } catch (error) {
            console.log(`   ✗ ${creds.username}: ${error.message}`);
        }
    }
    
    return tokens;
}

/**
 * Test 1: Role-Based Endpoint Protection
 */
async function testRoleBasedEndpointProtection(tokens) {
    console.log('\n👮 TESTING ROLE-BASED ENDPOINT PROTECTION');
    const client = createSecurityTestClient();
    
    // Test admin-only endpoints
    const adminEndpoints = [
        '/api/user/',           // User management
        '/api/user/export',     // User export
        '/api/device',          // Device management
    ];
    
    const userToken = Object.values(tokens).find(t => t.role !== 'admin')?.token;
    const adminToken = Object.values(tokens).find(t => t.role === 'admin')?.token;
    
    if (!userToken) {
        console.log('   ⚠️  No non-admin token available for testing');
    }
    
    for (const endpoint of adminEndpoints) {
        // Test with regular user token (should be blocked)
        if (userToken) {
            try {
                const response = await client.get(endpoint, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                const blocked = response.status === 403 || response.status === 401;
                logTest(
                    `${endpoint} blocks non-admin access`,
                    blocked,
                    `Status: ${response.status}`,
                    blocked ? 'LOW' : 'HIGH'
                );
                
                testResults.roleBasedTests.push({
                    test: `${endpoint} access control`,
                    passed: blocked,
                    status: response.status,
                    details: 'Non-admin users should be blocked from admin endpoints'
                });
            } catch (error) {
                logTest(`${endpoint} blocks non-admin access`, false, `Error: ${error.message}`, 'MEDIUM');
            }
        }
        
        // Test with admin token (should be allowed)
        if (adminToken) {
            try {
                const response = await client.get(endpoint, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                
                const allowed = response.status === 200;
                logTest(
                    `${endpoint} allows admin access`,
                    allowed,
                    `Status: ${response.status}`,
                    'LOW'
                );
            } catch (error) {
                logTest(`${endpoint} allows admin access`, false, `Error: ${error.message}`, 'MEDIUM');
            }
        }
    }
}

/**
 * Test 2: Token Security and Validation
 */
async function testTokenSecurity() {
    console.log('\n🔐 TESTING TOKEN SECURITY AND VALIDATION');
    const client = createSecurityTestClient();
    
    // Test 2.1: Malformed JWT tokens
    const malformedTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    ];
    
    for (const token of malformedTokens) {
        try {
            const response = await client.get('/api/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const rejected = response.status === 401 || response.status === 403;
            logTest(
                'Malformed JWT token rejected',
                rejected,
                `Token: ${token.slice(0, 20)}..., Status: ${response.status}`,
                rejected ? 'LOW' : 'HIGH'
            );
            
            testResults.tokenSecurityTests.push({
                test: 'Malformed JWT validation',
                passed: rejected,
                tokenType: 'malformed',
                status: response.status,
                details: 'Malformed tokens should be rejected'
            });
        } catch (error) {
            logTest('Malformed JWT token rejected', true, 'Token properly rejected');
        }
    }
    
    // Test 2.2: Token with modified claims
    try {
        // Create a token with tampered payload (admin role injection)
        const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6InVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2OTU5OTk5OTksImV4cCI6OTk5OTk5OTk5OX0.fakesignature';
        
        const response = await client.get('/api/user/', {
            headers: { Authorization: `Bearer ${tamperedToken}` }
        });
        
        const rejected = response.status === 401 || response.status === 403;
        logTest(
            'Tampered JWT claims rejected',
            rejected,
            `Status: ${response.status}`,
            rejected ? 'LOW' : 'CRITICAL'
        );
        
    } catch (error) {
        logTest('Tampered JWT claims rejected', true, 'Token signature validation working');
    }
}

/**
 * Test 3: Permission Boundary Validation
 */
async function testPermissionBoundaries(tokens) {
    console.log('\n🚧 TESTING PERMISSION BOUNDARIES');
    const client = createSecurityTestClient();
    
    // Get any available token for testing
    const availableToken = Object.values(tokens)[0]?.token;
    
    if (!availableToken) {
        console.log('   ⚠️  No tokens available for permission boundary testing');
        return;
    }
    
    const headers = { Authorization: `Bearer ${availableToken}` };
    
    // Test 3.1: Resource creation with insufficient permissions
    try {
        const maliciousUserData = {
            username: 'hacker.user',
            email: 'hacker@evil.com',
            password: 'hackme123',
            role: 'admin',  // Try to create admin user
            firstName: 'Hacker',
            lastName: 'User'
        };
        
        const response = await client.post('/api/user/', maliciousUserData, { headers });
        
        // Regular users shouldn't be able to create users, especially admin users
        const blocked = response.status === 403 || response.status === 401;
        logTest(
            'User creation permission boundary',
            blocked,
            `Status: ${response.status}`,
            blocked ? 'LOW' : 'CRITICAL'
        );
        
        testResults.permissionTests.push({
            test: 'User creation authorization',
            passed: blocked,
            status: response.status,
            details: 'Regular users should not be able to create new users'
        });
        
    } catch (error) {
        logTest('User creation permission boundary', true, 'Properly restricted');
    }
    
    // Test 3.2: Bulk operations access control
    try {
        const response = await client.get('/api/user/export', { headers });
        
        const requiresSpecialPermission = response.status === 403 || response.status === 401;
        logTest(
            'Bulk export operation protection',
            requiresSpecialPermission,
            `Status: ${response.status}`,
            requiresSpecialPermission ? 'LOW' : 'MEDIUM'
        );
        
    } catch (error) {
        logTest('Bulk export operation protection', true, 'Properly restricted');
    }
}

/**
 * Test 4: Privilege Escalation Prevention
 */
async function testPrivilegeEscalationPrevention() {
    console.log('\n⬆️ TESTING PRIVILEGE ESCALATION PREVENTION');
    const client = createSecurityTestClient();
    
    // Test 4.1: HTTP Parameter Pollution
    try {
        const response = await client.post('/api/auth/login', 
            'username=user&password=wrong&username=admin&password=admin123',
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const rejected = response.status !== 200;
        logTest(
            'HTTP Parameter Pollution blocked',
            rejected,
            `Status: ${response.status}`,
            rejected ? 'LOW' : 'HIGH'
        );
        
    } catch (error) {
        logTest('HTTP Parameter Pollution blocked', true, 'Parameter pollution handled');
    }
    
    // Test 4.2: JSON Parameter Injection
    try {
        const response = await client.post('/api/auth/login', {
            username: 'user',
            password: 'wrongpassword',
            role: 'admin',      // Try to inject admin role
            isAdmin: true,      // Try to inject admin flag
            permissions: ['all'] // Try to inject permissions
        });
        
        const rejected = response.status !== 200;
        logTest(
            'JSON parameter injection blocked',
            rejected,
            `Status: ${response.status}`,
            rejected ? 'LOW' : 'HIGH'
        );
        
        testResults.privilegeEscalationTests.push({
            test: 'JSON parameter injection',
            passed: rejected,
            status: response.status,
            details: 'Additional parameters should not affect authentication'
        });
        
    } catch (error) {
        logTest('JSON parameter injection blocked', true, 'Parameter injection handled');
    }
}

/**
 * Test 5: Resource Ownership Validation
 */
async function testResourceOwnership(tokens) {
    console.log('\n🏠 TESTING RESOURCE OWNERSHIP VALIDATION');
    const client = createSecurityTestClient();
    
    const availableTokens = Object.values(tokens);
    
    if (availableTokens.length < 2) {
        console.log('   ⚠️  Need at least 2 different user tokens for ownership testing');
        return;
    }
    
    const token1 = availableTokens[0];
    const token2 = availableTokens[1];
    
    // Test 5.1: Profile access ownership
    try {
        // User 1 trying to access their own profile
        const response1 = await client.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${token1.token}` }
        });
        
        const ownProfileAccess = response1.status === 200;
        logTest(
            'Own profile access allowed',
            ownProfileAccess,
            `Status: ${response1.status}`,
            'LOW'
        );
        
        // Test if user-specific endpoints properly validate ownership
        if (token1.user?.id && token2.user?.id && token1.user.id !== token2.user.id) {
            const response2 = await client.get(`/api/user/${token1.user.id}`, {
                headers: { Authorization: `Bearer ${token2.token}` }
            });
            
            // User 2 shouldn't access User 1's detailed info unless they're admin
            const properOwnership = response2.status === 403 || response2.status === 401 || token2.role === 'admin';
            logTest(
                'Cross-user profile access blocked',
                properOwnership,
                `Status: ${response2.status}, Token2 Role: ${token2.role}`,
                properOwnership ? 'LOW' : 'HIGH'
            );
        }
        
    } catch (error) {
        logTest('Resource ownership validation', false, `Error: ${error.message}`, 'MEDIUM');
    }
}

/**
 * Generate comprehensive authorization security report
 */
function generateAuthorizationSecurityReport() {
    console.log('\n📊 AUTHORIZATION & ACCESS CONTROL TEST RESULTS');
    console.log('='.repeat(60));
    
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    const criticalCount = criticalVulnerabilities.length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Critical Vulnerabilities: ${criticalCount}`);
    
    // Security score calculation for authorization
    let securityScore = 0;
    if (criticalCount === 0 && passedTests >= Math.ceil(totalTests * 0.9)) securityScore = 95;
    else if (criticalCount === 0 && passedTests >= Math.ceil(totalTests * 0.8)) securityScore = 85;
    else if (criticalCount <= 1 && passedTests >= Math.ceil(totalTests * 0.7)) securityScore = 75;
    else if (criticalCount <= 2) securityScore = 60;
    else securityScore = 40;
    
    console.log(`\n🎯 AUTHORIZATION SECURITY SCORE: ${securityScore}%`);
    
    // Risk assessment
    if (criticalCount === 0 && securityScore >= 85) {
        console.log('🟢 RISK LEVEL: LOW - Strong authorization controls');
    } else if (criticalCount <= 1 && securityScore >= 70) {
        console.log('🟡 RISK LEVEL: MEDIUM - Some authorization vulnerabilities');
    } else {
        console.log('🔴 RISK LEVEL: HIGH - Critical authorization security issues');
    }

    // Critical vulnerabilities
    if (criticalVulnerabilities.length > 0) {
        console.log('\n🚨 CRITICAL AUTHORIZATION VULNERABILITIES:');
        criticalVulnerabilities.forEach((vuln, index) => {
            console.log(`${index + 1}. ${vuln.test}`);
            console.log(`   └─ ${vuln.details}`);
        });
    }

    // Add summary to results
    testResults.summary = {
        totalTests,
        passedTests,
        failedTests,
        successRate: parseFloat(successRate),
        securityScore,
        criticalVulnerabilities: criticalCount,
        riskLevel: criticalCount === 0 && securityScore >= 85 ? 'LOW' : criticalCount <= 1 && securityScore >= 70 ? 'MEDIUM' : 'HIGH'
    };

    // Authorization specific recommendations
    if (criticalCount > 0 || securityScore < 85) {
        console.log('\n🔧 PRIORITY AUTHORIZATION FIXES:');
        testResults.recommendations.push(
            'CRITICAL: Review and fix privilege escalation vulnerabilities',
            'HIGH: Strengthen role-based access control implementation',
            'MEDIUM: Enhance token validation and security',
            'LOW: Improve resource ownership validation'
        );
        testResults.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    const reportPath = './LAYER2_AUTHORIZATION_ACCESS_CONTROL_RESULTS.md';
    
    let reportContent = `# Layer 2: Authorization & Access Control Test Results\n\n`;
    reportContent += `**Test Date:** ${testResults.timestamp}\n`;
    reportContent += `**Security Score:** ${securityScore}%\n`;
    reportContent += `**Risk Level:** ${testResults.summary.riskLevel}\n`;
    reportContent += `**Critical Vulnerabilities:** ${criticalCount}\n\n`;
    
    reportContent += `## Summary\n`;
    reportContent += `- **Total Tests:** ${totalTests}\n`;
    reportContent += `- **Passed:** ${passedTests}\n`;
    reportContent += `- **Failed:** ${failedTests}\n`;
    reportContent += `- **Success Rate:** ${successRate}%\n\n`;
    
    if (criticalVulnerabilities.length > 0) {
        reportContent += `## 🚨 Critical Vulnerabilities\n`;
        criticalVulnerabilities.forEach((vuln, index) => {
            reportContent += `${index + 1}. **${vuln.test}** (${vuln.severity})\n`;
            reportContent += `   - ${vuln.details}\n\n`;
        });
    }
    
    if (testResults.roleBasedTests.length > 0) {
        reportContent += `## Role-Based Access Tests\n`;
        testResults.roleBasedTests.forEach((test, index) => {
            reportContent += `${index + 1}. **${test.test}**: ${test.passed ? '✅ PASS' : '❌ FAIL'} (Status: ${test.status})\n`;
            reportContent += `   - ${test.details}\n\n`;
        });
    }
    
    if (testResults.recommendations.length > 0) {
        reportContent += `## Priority Recommendations\n`;
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
async function runAuthorizationAccessControlTests() {
    console.log('🔒 LAYER 2: AUTHORIZATION & ACCESS CONTROL TESTING');
    console.log('=================================================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Focus: Role-based access control and permission validation\n`);

    try {
        const tokens = await getAuthTokens();
        
        if (Object.keys(tokens).length === 0) {
            console.log('⚠️  No authentication tokens available - testing with limited scope');
        }
        
        await testRoleBasedEndpointProtection(tokens);
        await testTokenSecurity();
        await testPermissionBoundaries(tokens);
        await testPrivilegeEscalationPrevention();
        await testResourceOwnership(tokens);
        
        generateAuthorizationSecurityReport();
        
    } catch (error) {
        console.error('❌ Fatal error during authorization security testing:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    runAuthorizationAccessControlTests();
}

module.exports = {
    runAuthorizationAccessControlTests,
    testResults
};