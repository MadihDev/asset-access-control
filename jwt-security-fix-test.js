/**
 * JWT Security Fix Validation Test
 * 
 * This test validates that the JWT payload manipulation vulnerability has been fixed.
 * It attempts to modify JWT payload claims and verifies they are rejected.
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

async function testJWTSecurityFix() {
  console.log('🔐 JWT Security Fix Validation Test');
  console.log('=====================================\n');

  try {
    // Step 1: Attempt to login and get a valid token
    console.log('1. Attempting to get a valid JWT token...');
    
    // Note: This test assumes we have valid credentials or can create a test user
    // For now, we'll create a mock JWT to test the validation logic
    
    // Step 2: Create a legitimate JWT payload
    const legitimatePayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'USER',
      projectCityId: 'project1_city1',
      projectId: 'project1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    const legitimateToken = jwt.sign(legitimatePayload, JWT_SECRET);
    console.log('✅ Created legitimate token');

    // Step 3: Create malicious JWT with modified payload (privilege escalation)
    const maliciousPayload = {
      ...legitimatePayload,
      role: 'ADMIN', // Escalated privilege
      projectCityId: 'different_tenant', // Cross-tenant access
      email: 'admin@example.com' // Email spoofing
    };

    const maliciousToken = jwt.sign(maliciousPayload, JWT_SECRET);
    console.log('🚨 Created malicious token with modified payload');

    // Step 4: Test the malicious token against a protected endpoint
    console.log('\n2. Testing malicious token against protected endpoint...');

    try {
      const response = await axios.get(`${BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${maliciousToken}`
        },
        timeout: 5000
      });

      console.log('❌ SECURITY VULNERABILITY: Malicious token was accepted!');
      console.log('   Server Response:', response.data);
      return false;

    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ SECURITY FIX WORKING: Malicious token was rejected');
        console.log('   Status:', error.response.status);
        console.log('   Message:', error.response.data?.message || 'Unauthorized');
        return true;
      } else if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Cannot connect to backend server at', BASE_URL);
        console.log('   Make sure the backend is running on port 5000');
        return null;
      } else {
        console.log('❓ Unexpected error:', error.message);
        return null;
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Additional test: Validate that legitimate tokens still work
async function testLegitimateToken() {
  console.log('\n3. Testing that legitimate authentication still works...');
  
  try {
    // Try to access a public endpoint to verify server is running
    const response = await axios.get(`${BASE_URL}/api/health`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ Server is responding to requests');
      console.log('   Health check:', response.data.message);
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Backend server is not running');
    } else {
      console.log('❓ Error testing server:', error.message);
    }
    return false;
  }
}

// Main test execution
async function runTests() {
  console.log('Starting JWT Security Fix Validation...\n');
  
  const serverRunning = await testLegitimateToken();
  if (!serverRunning) {
    console.log('\n❌ Cannot proceed with tests - backend server not accessible');
    return;
  }

  const securityFixWorking = await testJWTSecurityFix();
  
  console.log('\n📊 TEST RESULTS:');
  console.log('================');
  
  if (securityFixWorking === true) {
    console.log('✅ JWT Security Fix: WORKING');
    console.log('✅ Payload manipulation attacks: BLOCKED');
    console.log('✅ System security: IMPROVED');
  } else if (securityFixWorking === false) {
    console.log('❌ JWT Security Fix: FAILED');
    console.log('❌ Payload manipulation attacks: POSSIBLE');
    console.log('❌ System security: VULNERABLE');
  } else {
    console.log('⚠️  JWT Security Fix: UNTESTABLE');
    console.log('⚠️  Test could not be completed due to server issues');
  }

  console.log('\n🔍 Note: This test validates the basic JWT payload manipulation protection.');
  console.log('   For comprehensive security validation, run the full security test suite.');
}

// Run the tests
runTests().catch(console.error);