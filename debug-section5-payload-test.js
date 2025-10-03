/**
 * SECTION 5 DEBUGGING - JWT Payload Manipulation Test
 * 
 * This test replicates the exact test from Section 5 to understand
 * why it's showing different results than our final validation.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugSection5PayloadTest() {
    console.log('🔍 DEBUGGING SECTION 5 JWT PAYLOAD MANIPULATION TEST');
    console.log('==============================================\n');

    // Step 1: Get a legitimate token (same as Section 5)
    console.log('1. 🔑 Getting legitimate authentication token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'techcorpadminamsterdam',
        password: 'demo123',
        projectId: 'techcorp',
        cityName: 'Amsterdam'
    }, { timeout: 10000 });

    if (loginResponse.status !== 200) {
        console.log('❌ Login failed:', loginResponse.status);
        return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Successfully authenticated');
    console.log('📋 Token length:', token.length);

    // Step 2: Parse the original token (same as Section 5)
    console.log('\n2. 🔍 Analyzing original token...');
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        console.log('❌ Invalid JWT structure');
        return;
    }

    const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('📋 Original payload:', JSON.stringify(originalPayload, null, 2));

    // Step 3: Create malicious payload (EXACT same logic as Section 5)
    console.log('\n3. 🚨 Creating malicious payload (Section 5 method)...');
    
    const modifiedPayload = { ...originalPayload };
    if (modifiedPayload.role) modifiedPayload.role = 'ADMIN';
    if (modifiedPayload.permissions) modifiedPayload.permissions = ['ALL'];
    
    console.log('🚨 Malicious payload:', JSON.stringify(modifiedPayload, null, 2));

    const modifiedPayloadB64 = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url');
    const modifiedToken = `${parts[0]}.${modifiedPayloadB64}.${parts[2]}`;

    console.log('📋 Malicious token created (first 50 chars):', modifiedToken.substring(0, 50) + '...');

    // Step 4: Test the malicious token against /api/user endpoint (EXACT same as Section 5)
    console.log('\n4. 🧪 Testing malicious token against /api/user (Section 5 endpoint)...');
    
    try {
        const response = await axios.get(`${BASE_URL}/user`, {
            headers: { Authorization: `Bearer ${modifiedToken}` },
            timeout: 8000,
            validateStatus: () => true
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', response.headers['content-type']);
        
        if (response.data) {
            console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
        }

        if (response.status === 401 || response.status === 403) {
            console.log('✅ SUCCESS: Malicious token properly rejected');
            console.log('✅ JWT security fix is working correctly');
        } else if (response.status === 200) {
            console.log('❌ CRITICAL: Malicious token was accepted!');
            console.log('❌ This indicates a security vulnerability');
        } else {
            console.log(`⚠️  Unexpected status: ${response.status}`);
            console.log('🔍 Need to investigate this response');
        }

    } catch (error) {
        console.log('✅ SUCCESS: Request failed (token rejected)');
        console.log('📋 Error:', error.message);
    }

    // Step 5: Test against other endpoints for comparison
    console.log('\n5. 🔍 Testing same malicious token against other endpoints...');
    
    const endpoints = [
        '/user/profile',
        '/rfid',
        '/lock'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${modifiedToken}` },
                timeout: 5000,
                validateStatus: () => true
            });

            console.log(`📊 ${endpoint}: Status ${response.status} - ${response.status === 401 || response.status === 403 ? '✅ SECURE' : '❌ VULNERABLE'}`);
        } catch (error) {
            console.log(`📊 ${endpoint}: Request failed - ✅ SECURE`);
        }
    }

    // Step 6: Test with legitimate token for comparison
    console.log('\n6. 🔍 Testing legitimate token against /api/user for comparison...');
    
    try {
        const response = await axios.get(`${BASE_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
            validateStatus: () => true
        });

        console.log('📊 Legitimate token response status:', response.status);
        
        if (response.status === 200) {
            console.log('✅ Legitimate token works correctly');
        } else {
            console.log('❌ Issue with legitimate token:', response.status);
        }

    } catch (error) {
        console.log('❌ Legitimate token test failed:', error.message);
    }

    console.log('\n🎯 DEBUGGING SUMMARY:');
    console.log('===================');
    console.log('This test replicates Section 5\'s exact payload manipulation test');
    console.log('to understand why it might show different results than our comprehensive validation.');
}

// Run the debug test
debugSection5PayloadTest()
    .then(() => {
        console.log('\n🏁 Section 5 debugging complete');
    })
    .catch(error => {
        console.error('❌ Debug test failed:', error.message);
    });