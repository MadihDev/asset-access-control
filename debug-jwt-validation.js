/**
 * Debug JWT Validation Test
 * 
 * This test helps us understand why the Section 5 test is still failing
 * by testing the exact same scenario with detailed logging.
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

async function debugJWTValidation() {
  console.log('🔍 DEBUG: JWT Validation Test');
  console.log('=============================\n');

  try {
    // Step 1: Get a legitimate token by logging in
    console.log('1. Attempting to login to get a valid token...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'techcorpadminamsterdam',
      password: 'demo123',
      projectId: 'techcorp',
      cityName: 'Amsterdam'
    }, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.data);
      return;
    }

    const originalToken = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, got token');
    console.log('📋 Login response:', JSON.stringify(loginResponse.data, null, 2));

    if (!originalToken) {
      console.log('❌ No access token in response');
      return;
    }

    // Step 2: Decode the original token to understand its structure
    const tokenParts = originalToken.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid token structure');
      return;
    }

    const originalPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('📋 Original payload:', JSON.stringify(originalPayload, null, 2));

    // Step 3: Test the original token
    console.log('\n2. Testing original (valid) token...');
    const validResponse = await axios.get(`${BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${originalToken}` },
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   Original token status: ${validResponse.status}`);

    // Step 4: Create a modified payload (exactly like Section 5 test)
    console.log('\n3. Creating modified payload token...');
    const modifiedPayload = { ...originalPayload };
    if (modifiedPayload.role) {
      console.log(`   Changing role from ${modifiedPayload.role} to ADMIN`);
      modifiedPayload.role = 'ADMIN';
    }
    if (modifiedPayload.projectCityId) {
      console.log(`   Changing projectCityId from ${modifiedPayload.projectCityId} to evil_tenant`);
      modifiedPayload.projectCityId = 'evil_tenant';
    }

    const modifiedPayloadB64 = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url');
    const modifiedToken = `${tokenParts[0]}.${modifiedPayloadB64}.${tokenParts[2]}`;
    
    console.log('📋 Modified payload:', JSON.stringify(modifiedPayload, null, 2));

    // Step 5: Test the modified token
    console.log('\n4. Testing modified payload token...');
    const modifiedResponse = await axios.get(`${BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${modifiedToken}` },
      timeout: 5000,
      validateStatus: () => true
    });

    console.log(`   Modified token status: ${modifiedResponse.status}`);
    
    if (modifiedResponse.status === 200) {
      console.log('🚨 CRITICAL: Modified token was ACCEPTED!');
      console.log('   Response data:', JSON.stringify(modifiedResponse.data, null, 2));
      console.log('\n🔍 This suggests our JWT validation fix is not working properly');
    } else if (modifiedResponse.status === 401 || modifiedResponse.status === 403) {
      console.log('✅ GOOD: Modified token was REJECTED');
      console.log('   Response:', modifiedResponse.data);
    } else {
      console.log('❓ Unexpected response status:', modifiedResponse.status);
      console.log('   Response:', modifiedResponse.data);
    }

    // Step 6: Test specific endpoints
    console.log('\n5. Testing against different endpoints...');
    const endpoints = ['/user', '/tenant/projects', '/rfid'];
    
    for (const endpoint of endpoints) {
      try {
        const testResponse = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${modifiedToken}` },
          timeout: 5000,
          validateStatus: () => true
        });
        console.log(`   ${endpoint}: Status ${testResponse.status}`);
      } catch (error) {
        console.log(`   ${endpoint}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Run the debug test
debugJWTValidation().catch(console.error);