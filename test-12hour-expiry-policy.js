const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials for PerfectIT-Amsterdam admin
const PERFECTIT_ADMIN = {
  username: 'perfectitadmin',
  password: 'password123',
  projectId: 'PerfectIT Solutions',
  cityName: 'Amsterdam'
};

async function test12HourExpiryPolicy() {
  try {
    console.log('🧪 Testing 12-Hour Permission Expiry Policy...');
    
    // Login as PerfectIT admin
    console.log('🔐 Logging in as PerfectIT admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, PERFECTIT_ADMIN);
    const token = loginResponse.data.data.accessToken;
    const loggedInUser = loginResponse.data.data.user;
    
    console.log(`✅ Logged in as: ${loggedInUser.email} (Role: ${loggedInUser.role})`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get current permissions to see their expiry times
    console.log('\n📋 Checking current permission expiry times...');
    const permissionsResponse = await axios.get(`${API_BASE}/permission`, { headers });
    const permissions = permissionsResponse.data.data;
    
    console.log(`Found ${permissions.length} permissions:`);
    permissions.forEach((perm, index) => {
      const now = new Date();
      const validTo = new Date(perm.validTo);
      const hoursUntilExpiry = (validTo - now) / (1000 * 60 * 60);
      
      console.log(`  ${index + 1}. User: ${perm.user.email} | Lock: ${perm.lock.name}`);
      console.log(`     Expires: ${validTo.toISOString()} (${hoursUntilExpiry.toFixed(1)} hours from now)`);
      console.log(`     Active: ${perm.canAccess} | Valid: ${perm.validFrom} to ${perm.validTo}`);
    });
    
    // Test creating a new permission without specifying validTo
    console.log('\n🆕 Testing permission creation without validTo (should default to 12 hours)...');
    
    if (permissions.length > 0) {
      const testPerm = permissions[0];
      
      try {
        // First, revoke the permission to test creation
        await axios.delete(`${API_BASE}/permission/${testPerm.id}`, { headers });
        console.log(`✅ Revoked permission for testing`);
        
        // Now create a new permission without specifying validTo
        const createResponse = await axios.post(`${API_BASE}/permission`, {
          userId: testPerm.userId,
          lockId: testPerm.lockId,
          canAccess: true
          // Note: not specifying validTo - should default to 12 hours
        }, { headers });
        
        const newPerm = createResponse.data.data;
        console.log(`✅ Created new permission:`);
        
        const now = new Date();
        const validTo = new Date(newPerm.validTo);
        const hoursUntilExpiry = (validTo - now) / (1000 * 60 * 60);
        
        console.log(`   Expires: ${validTo.toISOString()} (${hoursUntilExpiry.toFixed(1)} hours from now)`);
        
        // Verify it's approximately 12 hours
        if (hoursUntilExpiry >= 11.9 && hoursUntilExpiry <= 12.1) {
          console.log(`✅ SUCCESS: Permission correctly set to expire in ~12 hours`);
        } else {
          console.log(`❌ FAIL: Permission expiry is ${hoursUntilExpiry.toFixed(1)} hours, expected ~12 hours`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing permission creation: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test active permission counting (should exclude expired permissions)
    console.log('\n📊 Testing active permission counting...');
    const usersResponse = await axios.get(`${API_BASE}/user/with-permissions`, { headers });
    const users = usersResponse.data.data;
    
    users.forEach(user => {
      const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
      console.log(`  ${userName}: ${user.permissionCount} active permissions`);
    });
    
    console.log('\n✅ 12-Hour Expiry Policy Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

test12HourExpiryPolicy();