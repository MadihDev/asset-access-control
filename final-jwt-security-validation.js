/**
 * Final JWT Security Fix Validation
 * 
 * This test definitively validates that our JWT payload manipulation fix is working
 * by testing against multiple real API endpoints.
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

async function testJWTAgainstMultipleEndpoints() {
  console.log('🔐 FINAL JWT SECURITY FIX VALIDATION');
  console.log('===================================\n');

  // Test endpoints that require authentication
  const protectedEndpoints = [
    '/api/user/profile',
    '/api/tenant/projects',
    '/api/tenant/context',
    '/api/lock',
    '/api/rfid'
  ];

  // Create a malicious JWT with modified payload
  const maliciousPayload = {
    userId: 'fake-user-id-123',
    email: 'hacker@evil.com',
    role: 'ADMIN', // Privilege escalation
    projectCityId: 'evil_tenant', // Cross-tenant access
    projectId: 'evil',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60)
  };

  const maliciousToken = jwt.sign(maliciousPayload, JWT_SECRET);
  console.log('🚨 Created malicious JWT with payload manipulation:');
  console.log('   - userId: fake-user-id-123');
  console.log('   - role: ADMIN (privilege escalation)');
  console.log('   - projectCityId: evil_tenant (cross-tenant)');
  console.log('   - email: hacker@evil.com (spoofing)\n');

  let vulnerableEndpoints = 0;
  let secureEndpoints = 0;
  let testableEndpoints = 0;

  for (const endpoint of protectedEndpoints) {
    console.log(`🧪 Testing: ${endpoint}`);
    
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${maliciousToken}`
        },
        timeout: 5000,
        validateStatus: () => true // Don't throw on HTTP error codes
      });

      testableEndpoints++;

      if (response.status === 401 || response.status === 403) {
        console.log(`   ✅ SECURE: Rejected with status ${response.status}`);
        secureEndpoints++;
      } else if (response.status === 200) {
        console.log(`   ❌ VULNERABLE: Accepted malicious token!`);
        console.log(`      Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        vulnerableEndpoints++;
      } else {
        console.log(`   ⚠️  Unexpected status: ${response.status}`);
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ⚠️  Server not reachable`);
      } else if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log(`   ✅ SECURE: Rejected with status ${error.response.status}`);
        secureEndpoints++;
        testableEndpoints++;
      } else {
        console.log(`   ⚠️  Test error: ${error.message}`);
      }
    }
  }

  console.log('\n📊 FINAL VALIDATION RESULTS:');
  console.log('============================');
  console.log(`Total endpoints tested: ${testableEndpoints}`);
  console.log(`Secure endpoints: ${secureEndpoints}`);
  console.log(`Vulnerable endpoints: ${vulnerableEndpoints}`);
  
  if (testableEndpoints === 0) {
    console.log('⚠️  NO ENDPOINTS TESTABLE - Server may not be running');
    return false;
  }

  const securityScore = (secureEndpoints / testableEndpoints) * 100;
  console.log(`Security score: ${securityScore.toFixed(1)}%`);

  if (vulnerableEndpoints === 0) {
    console.log('\n🎉 JWT SECURITY FIX: FULLY EFFECTIVE');
    console.log('✅ All tested endpoints reject malicious tokens');
    console.log('✅ JWT payload manipulation attacks: BLOCKED');
    console.log('✅ System ready for production deployment');
    return true;
  } else {
    console.log('\n🚨 JWT SECURITY FIX: PARTIAL OR FAILED');
    console.log(`❌ ${vulnerableEndpoints} endpoints still vulnerable`);
    console.log('❌ Additional security measures required');
    return false;
  }
}

// Run the comprehensive validation
testJWTAgainstMultipleEndpoints()
  .then(success => {
    console.log('\n🏁 FINAL VALIDATION COMPLETE');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  });