/**
 * Layer 3: Business Logic Security Testing
 * 
 * This test focuses on the critical vulnerabilities identified in our security audit:
 * 1. Tenant isolation validation
 * 2. Cross-tenant access prevention  
 * 3. Business logic authorization
 * 4. Data boundary enforcement
 * 
 * These tests go beyond API surface security to validate actual business logic
 * and multi-tenant data segregation - the areas where real vulnerabilities exist.
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
    tenantIsolationTests: [],
    businessLogicTests: [],
    dataIntegrityTests: [],
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
 * Initialize database connection for direct data analysis
 * Note: Disabled for now to focus on API-level testing
 */
async function initializePrismaClient() {
    console.log('ℹ️  Database tests disabled - focusing on API-level business logic testing');
    return null;
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
 * Get valid authentication token for testing
 */
async function getAuthToken() {
    const client = createSecurityTestClient();
    const testCredentials = [
        { username: 'john.doe', password: 'password123' },
        { username: 'alice.smith', password: 'password123' },
        { username: 'admin', password: 'admin123' },
        { username: 'testuser', password: 'password123' },
        { username: 'demo', password: 'demo123' }
    ];

    for (const creds of testCredentials) {
        try {
            const response = await client.post('/api/auth/login', creds);
            console.log(`   Trying ${creds.username}: Status ${response.status}`);
            
            if (response.data && response.data.data && response.data.data.accessToken) {
                console.log(`   ✓ Authenticated as: ${creds.username}`);
                return {
                    token: response.data.data.accessToken,
                    user: response.data.data.user,
                    username: creds.username
                };
            } else if (response.data) {
                console.log(`   ✗ ${creds.username}: ${JSON.stringify(response.data).slice(0, 100)}`);
            }
        } catch (error) {
            console.log(`   ✗ ${creds.username}: ${error.message}`);
        }
    }
    
    console.log('   ⚠️  No valid credentials found - will test with unauthenticated requests');
    return null;
}

/**
 * Test 1: Cross-Tenant Data Access Prevention
 * CRITICAL: This was identified as a real vulnerability in our audit
 */
async function testCrossTenantDataAccess() {
    console.log('\n🏢 TESTING CROSS-TENANT DATA ACCESS PREVENTION');
    const client = createSecurityTestClient();
    
    // Get authentication
    const auth = await getAuthToken();
    
    const headers = auth ? { Authorization: `Bearer ${auth.token}` } : {};

    // Test 1.1: Direct projectCityId manipulation
    try {
        const requestConfig = auth ? { headers } : {};
        const response1 = await client.get('/api/project', requestConfig);
        const response2 = await client.get('/api/project?projectCityId=999999', requestConfig);
        
        console.log(`   Response1 Status: ${response1.status}, Response2 Status: ${response2.status}`);
        
        if (response1.status === 401 || response2.status === 401) {
            logTest('Project endpoint tenant filtering', true, 'Properly requires authentication');
        } else if (response1.status === 200 && response2.status === 200) {
            const baseDataCount = response1.data?.data?.length || 0;
            const filteredDataCount = response2.data?.data?.length || 0;
            
            // If filtered request returns different data, it might be vulnerable
            const properlyFiltered = filteredDataCount === 0 || filteredDataCount === baseDataCount;
            
            logTest(
                'Project endpoint tenant filtering', 
                properlyFiltered, 
                `Base: ${baseDataCount} items, Filtered: ${filteredDataCount} items`,
                'CRITICAL'
            );
        } else {
            logTest('Project endpoint tenant filtering', false, `Unexpected response codes: ${response1.status}, ${response2.status}`, 'HIGH');
        }
        
        testResults.tenantIsolationTests.push({
            test: 'Project endpoint tenant filtering',
            passed: response1.status === 401 || response2.status === 401,
            status1: response1.status,
            status2: response2.status,
            details: 'Should require authentication or properly filter tenant data'
        });
    } catch (error) {
        logTest('Project endpoint tenant filtering', false, `Error: ${error.message}`, 'CRITICAL');
    }

    // Test 1.2: User data cross-tenant access
    try {
        const response = await client.get('/api/user/', { headers });
        const hasUserData = response.status === 200 && response.data?.data;
        
        if (hasUserData) {
            const users = response.data.data;
            const userTenants = [...new Set(users.map(u => u.projectCityId).filter(Boolean))];
            
            // Check if user can see users from multiple tenants
            const multipleTenants = userTenants.length > 1;
            logTest(
                'User endpoint tenant isolation', 
                !multipleTenants, 
                `Visible tenants: ${userTenants.length} (${userTenants.join(', ')})`,
                'CRITICAL'
            );
        } else {
            logTest('User endpoint tenant isolation', true, 'Properly restricted access');
        }
    } catch (error) {
        logTest('User endpoint tenant isolation', false, `Error: ${error.message}`, 'HIGH');
    }

    // Test 1.3: Device data cross-tenant access
    try {
        const response = await client.get('/api/device', { headers });
        if (response.status === 200 && response.data?.data) {
            const devices = response.data.data;
            const deviceTenants = [...new Set(devices.map(d => d.projectCityId).filter(Boolean))];
            
            const multipleTenants = deviceTenants.length > 1;
            logTest(
                'Device endpoint tenant isolation', 
                !multipleTenants, 
                `Visible tenants: ${deviceTenants.length}`,
                'HIGH'
            );
        } else {
            logTest('Device endpoint tenant isolation', true, 'Properly restricted or no data');
        }
    } catch (error) {
        logTest('Device endpoint tenant isolation', false, `Error: ${error.message}`, 'HIGH');
    }
}

/**
 * Test 2: Business Logic Authorization
 */
async function testBusinessLogicAuthorization() {
    console.log('\n🔐 TESTING BUSINESS LOGIC AUTHORIZATION');
    const client = createSecurityTestClient();
    
    const auth = await getAuthToken();
    const headers = auth ? { Authorization: `Bearer ${auth.token}` } : {};

    // Test 2.1: Resource creation with invalid tenant reference
    try {
        const maliciousLocationData = {
            name: 'Test Location',
            projectCityId: '99999999-9999-9999-9999-999999999999', // Invalid tenant ID
            type: 'building'
        };

        const response = await client.post('/api/location', maliciousLocationData, { headers });
        const blocked = response.status !== 200 && response.status !== 201;
        
        logTest(
            'Invalid tenant ID rejection', 
            blocked, 
            `Status: ${response.status}`,
            'HIGH'
        );
    } catch (error) {
        logTest('Invalid tenant ID rejection', true, 'Request properly rejected');
    }

    // Test 2.2: Permission scope validation
    try {
        // Try to access permissions endpoint
        const response = await client.get('/api/permission', { headers });
        
        if (response.status === 200 && response.data?.data) {
            const permissions = response.data.data;
            const permissionTenants = [...new Set(permissions.map(p => p.projectCityId).filter(Boolean))];
            
            const properTenantScope = permissionTenants.length <= 1;
            logTest(
                'Permission scope tenant validation', 
                properTenantScope, 
                `Permission tenants: ${permissionTenants.length}`,
                'HIGH'
            );
        } else {
            logTest('Permission scope tenant validation', true, 'Properly restricted access');
        }
    } catch (error) {
        logTest('Permission scope tenant validation', false, `Error: ${error.message}`, 'MEDIUM');
    }
}

/**
 * Test 3: Resource Access Pattern Analysis  
 */
async function testResourceAccessPatterns() {
    console.log('\n� TESTING RESOURCE ACCESS PATTERNS');
    const client = createSecurityTestClient();
    
    const auth = await getAuthToken();
    const headers = auth ? { Authorization: `Bearer ${auth.token}` } : {};

    // Test 3.1: Audit log access control
    try {
        const response = await client.get('/api/audit', { headers });
        
        if (response.status === 200 && response.data?.data) {
            const auditLogs = response.data.data;
            const logTenants = [...new Set(auditLogs.map(log => log.projectCityId).filter(Boolean))];
            
            const properAuditScope = logTenants.length <= 1;
            logTest(
                'Audit logs tenant isolation', 
                properAuditScope, 
                `Audit tenant scope: ${logTenants.length}`,
                properAuditScope ? 'LOW' : 'HIGH'
            );
        } else {
            logTest('Audit logs tenant isolation', true, 'Properly restricted audit access');
        }
    } catch (error) {
        logTest('Audit logs tenant isolation', false, `Error: ${error.message}`, 'MEDIUM');
    }

    // Test 3.2: Location hierarchy access control
    try {
        const response = await client.get('/api/location', { headers });
        
        if (response.status === 200 && response.data?.data) {
            const locations = response.data.data;
            const locationTenants = [...new Set(locations.map(loc => loc.projectCityId).filter(Boolean))];
            
            const properLocationScope = locationTenants.length <= 1;
            logTest(
                'Location hierarchy tenant isolation', 
                properLocationScope, 
                `Location tenant scope: ${locationTenants.length}`,
                properLocationScope ? 'LOW' : 'HIGH'
            );
        } else {
            logTest('Location hierarchy tenant isolation', true, 'Properly restricted location access');
        }
    } catch (error) {
        logTest('Location hierarchy tenant isolation', false, `Error: ${error.message}`, 'MEDIUM');
    }
}

/**
 * Test 4: API Endpoint Consistency
 */
async function testAPIEndpointConsistency() {
    console.log('\n🔗 TESTING API ENDPOINT CONSISTENCY');
    const client = createSecurityTestClient();
    
    const auth = await getAuthToken();
    const headers = auth ? { Authorization: `Bearer ${auth.token}` } : {};

    // Test endpoints that should implement tenant filtering
    const endpointsToTest = [
        '/api/project',
        '/api/location', 
        '/api/device',
        '/api/user/',
        '/api/permission',
        '/api/audit'
    ];

    for (const endpoint of endpointsToTest) {
        try {
            const response = await client.get(endpoint, { headers });
            
            if (response.status === 200 && response.data?.data) {
                const data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
                const tenantIds = [...new Set(data.map(item => item.projectCityId).filter(Boolean))];
                
                // Each endpoint should show data from at most one tenant
                const consistentTenantScope = tenantIds.length <= 1;
                logTest(
                    `${endpoint} tenant scope consistency`, 
                    consistentTenantScope, 
                    `Tenant IDs: ${tenantIds.length}`,
                    consistentTenantScope ? 'LOW' : 'HIGH'
                );
            } else {
                logTest(`${endpoint} tenant scope consistency`, true, 'No data or properly restricted');
            }
        } catch (error) {
            logTest(`${endpoint} tenant scope consistency`, false, `Error: ${error.message}`, 'MEDIUM');
        }
    }
}

/**
 * Generate comprehensive business logic security report
 */
function generateBusinessLogicSecurityReport() {
    console.log('\n📊 BUSINESS LOGIC SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    const criticalCount = criticalVulnerabilities.length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Critical Vulnerabilities: ${criticalCount}`);
    
    // Security score calculation focused on business logic
    let securityScore = 0;
    if (criticalCount === 0 && passedTests >= Math.ceil(totalTests * 0.9)) securityScore = 95;
    else if (criticalCount === 0 && passedTests >= Math.ceil(totalTests * 0.8)) securityScore = 85;
    else if (criticalCount <= 1 && passedTests >= Math.ceil(totalTests * 0.7)) securityScore = 75;
    else if (criticalCount <= 2) securityScore = 60;
    else securityScore = 40;
    
    console.log(`\n🎯 BUSINESS LOGIC SECURITY SCORE: ${securityScore}%`);
    
    // Risk assessment
    if (criticalCount === 0 && securityScore >= 85) {
        console.log('🟢 RISK LEVEL: LOW - Strong business logic security');
    } else if (criticalCount <= 1 && securityScore >= 70) {
        console.log('🟡 RISK LEVEL: MEDIUM - Some business logic vulnerabilities');
    } else {
        console.log('🔴 RISK LEVEL: HIGH - Critical business logic security issues');
    }

    // Critical vulnerabilities
    if (criticalVulnerabilities.length > 0) {
        console.log('\n🚨 CRITICAL VULNERABILITIES FOUND:');
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

    // Business logic specific recommendations
    if (criticalCount > 0) {
        console.log('\n🔧 PRIORITY BUSINESS LOGIC FIXES:');
        testResults.recommendations.push(
            'CRITICAL: Fix cross-tenant data access vulnerabilities immediately',
            'HIGH: Implement proper tenant boundary validation in all endpoints',
            'MEDIUM: Review and strengthen business logic authorization checks',
            'LOW: Ensure data integrity constraints are properly enforced'
        );
        testResults.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    const reportPath = './LAYER3_BUSINESS_LOGIC_SECURITY_RESULTS.md';
    
    let reportContent = `# Layer 3: Business Logic Security Test Results\n\n`;
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
    
    if (testResults.tenantIsolationTests.length > 0) {
        reportContent += `## Tenant Isolation Tests\n`;
        testResults.tenantIsolationTests.forEach((test, index) => {
            reportContent += `${index + 1}. **${test.test}**: ${test.passed ? '✅ PASS' : '❌ FAIL'}\n`;
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
async function runBusinessLogicSecurityTests() {
    console.log('🏢 LAYER 3: BUSINESS LOGIC SECURITY TESTING');
    console.log('===========================================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Focus: Multi-tenant isolation and business logic validation\n`);

    let prisma = null;
    
    try {
        prisma = await initializePrismaClient();
        
        await testCrossTenantDataAccess();
        await testBusinessLogicAuthorization();
        await testResourceAccessPatterns();
        await testAPIEndpointConsistency();
        
        generateBusinessLogicSecurityReport();
        
    } catch (error) {
        console.error('❌ Fatal error during business logic security testing:', error.message);
        process.exit(1);
    } finally {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}

// Execute if running directly
if (require.main === module) {
    runBusinessLogicSecurityTests();
}

module.exports = {
    runBusinessLogicSecurityTests,
    testResults
};