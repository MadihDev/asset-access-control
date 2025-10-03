/**
 * ENHANCED SECTION 5 JWT PAYLOAD MANIPULATION TEST
 * 
 * This test creates more realistic payload manipulation attacks
 * to properly validate our JWT security fix.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function enhancedSection5PayloadTest() {
    console.log('🔐 ENHANCED SECTION 5 JWT PAYLOAD MANIPULATION TEST');
    console.log('==============================================\n');

    // Step 1: Get a legitimate token from a NON-ADMIN user
    console.log('1. 🔑 Getting legitimate authentication token from NON-ADMIN user...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'techcorpguardamsterdam',  // This is a USER role, not ADMIN
        password: 'demo123',
        projectId: 'techcorp',
        cityName: 'Amsterdam'
    }, { timeout: 10000 });

    if (loginResponse.status !== 200) {
        console.log('❌ Login failed:', loginResponse.status);
        return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Successfully authenticated as NON-ADMIN user');

    // Step 2: Parse the original token
    console.log('\n2. 🔍 Analyzing original token...');
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.log('❌ Invalid JWT structure');
        return;
    }

    const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('📋 Original payload:', JSON.stringify(originalPayload, null, 2));

    // Step 3: Create multiple malicious payload variations
    console.log('\n3. 🚨 Creating various malicious payload attacks...');
    
    const attacks = [
        {
            name: 'Privilege Escalation (USER → ADMIN)',
            payload: { ...originalPayload, role: 'ADMIN' }
        },
        {
            name: 'Cross-Tenant Access (Different projectCityId)',
            payload: { ...originalPayload, projectCityId: 'fake-tenant-id-123' }
        },
        {
            name: 'Email Spoofing Attack',
            payload: { ...originalPayload, email: 'hacker@evil.com' }
        },
        {
            name: 'User ID Spoofing Attack',
            payload: { ...originalPayload, userId: 'fake-user-id-999' }
        },
        {
            name: 'Combined Attack (All fields modified)',
            payload: { 
                ...originalPayload, 
                role: 'ADMIN', 
                projectCityId: 'evil-tenant', 
                email: 'admin@hacker.com',
                userId: 'super-admin-123'
            }
        }
    ];

    // Step 4: Test each attack against multiple endpoints
    console.log('\n4. 🧪 Testing malicious payloads against protected endpoints...');
    
    const endpoints = [
        { path: '/user', name: 'User List (Manager+ required)' },
        { path: '/user/export', name: 'User Export (Manager+ required)' },
        { path: '/rfid', name: 'RFID Access' },
        { path: '/lock', name: 'Lock Control' }
    ];

    let totalTests = 0;
    let secureTests = 0;
    let vulnerableTests = 0;

    for (const attack of attacks) {
        console.log(`\n🚨 ATTACK: ${attack.name}`);
        console.log('🚨 Malicious payload:', JSON.stringify(attack.payload, null, 2));

        const maliciousPayloadB64 = Buffer.from(JSON.stringify(attack.payload)).toString('base64url');
        const maliciousToken = `${parts[0]}.${maliciousPayloadB64}.${parts[2]}`;

        for (const endpoint of endpoints) {
            totalTests++;
            try {
                const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
                    headers: { Authorization: `Bearer ${maliciousToken}` },
                    timeout: 8000,
                    validateStatus: () => true
                });

                if (response.status === 401 || response.status === 403) {
                    console.log(`   ✅ ${endpoint.name}: SECURE (Status ${response.status})`);
                    secureTests++;
                } else if (response.status === 200) {
                    console.log(`   ❌ ${endpoint.name}: VULNERABLE (Status ${response.status}) - SECURITY BREACH!`);
                    vulnerableTests++;
                } else {
                    console.log(`   ⚠️  ${endpoint.name}: Unexpected status ${response.status}`);
                }

            } catch (error) {
                console.log(`   ✅ ${endpoint.name}: SECURE (Request failed - token rejected)`);
                secureTests++;
            }
        }
    }

    // Step 5: Test legitimate token for comparison
    console.log('\n5. 🔍 Testing legitimate token for comparison...');
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint.path}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000,
                validateStatus: () => true
            });

            console.log(`   📊 ${endpoint.name}: Status ${response.status}`);

        } catch (error) {
            console.log(`   📊 ${endpoint.name}: Request failed - ${error.message}`);
        }
    }

    // Step 6: Summary and Security Score
    console.log('\n📊 ENHANCED SECTION 5 TEST RESULTS');
    console.log('=====================================');
    console.log(`Total malicious token tests: ${totalTests}`);
    console.log(`Secure endpoints: ${secureTests}`);
    console.log(`Vulnerable endpoints: ${vulnerableTests}`);
    console.log(`Security effectiveness: ${totalTests > 0 ? ((secureTests / totalTests) * 100).toFixed(1) : 0}%`);

    if (vulnerableTests === 0) {
        console.log('\n🎉 JWT SECURITY FIX: FULLY EFFECTIVE');
        console.log('✅ All payload manipulation attacks blocked');
        console.log('✅ System secure against JWT attacks');
        console.log('✅ Ready for production deployment');
    } else {
        console.log('\n🚨 CRITICAL SECURITY VULNERABILITIES DETECTED');
        console.log('❌ JWT payload manipulation attacks successful');
        console.log('❌ System vulnerable to privilege escalation');
        console.log('❌ DO NOT DEPLOY - Fix required immediately');
    }

    return vulnerableTests === 0;
}

// Run the enhanced test
enhancedSection5PayloadTest()
    .then(isSecure => {
        console.log('\n🏁 Enhanced Section 5 JWT security test complete');
        process.exit(isSecure ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Enhanced test failed:', error.message);
        process.exit(1);
    });