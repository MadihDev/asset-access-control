const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials for PerfectIT-Amsterdam admin
const PERFECTIT_ADMIN = {
  username: 'perfectitadmin',
  password: 'password123',
  projectId: 'PerfectIT Solutions',
  cityName: 'Amsterdam'
};

async function testUserAPIEndpoints() {
  try {
    // Login as PerfectIT admin
    console.log('🔐 Logging in as PerfectIT admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, PERFECTIT_ADMIN);
    const token = loginResponse.data.data.accessToken;
    const loggedInUser = loginResponse.data.data.user;
    
    console.log(`✅ Logged in as: ${loggedInUser.email} (Role: ${loggedInUser.role}, ProjectCity: ${loggedInUser.projectCityId})`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get all users in the tenant
    console.log('\n📋 Getting all users with permissions...');
    const usersResponse = await axios.get(`${API_BASE}/user/with-permissions`, { headers });
    const users = usersResponse.data.data;
    
    console.log(`Found ${users.length} users in PerfectIT-Amsterdam:`);
    users.forEach((user, index) => {
      const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
      console.log(`  ${index + 1}. ${userName} (${user.email}) - Role: ${user.role} - Permissions: ${user.permissionCount || 'N/A'}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // Test getUserById for each user
    console.log('\n🔍 Testing getUserById for each user:');
    for (const user of users) {
      try {
        const userDetailResponse = await axios.get(`${API_BASE}/user/${user.id}`, { headers });
        const userDetail = userDetailResponse.data.data;
        const userName = userDetail.firstName && userDetail.lastName ? `${userDetail.firstName} ${userDetail.lastName}` : userDetail.email;
        
        console.log(`\n📄 User Details for ${userName}:`);
        console.log(`  ID: ${userDetail.id}`);
        console.log(`  Email: ${userDetail.email}`);
        console.log(`  Role: ${userDetail.role}`);
        console.log(`  ProjectCityId: ${userDetail.projectCityId}`);
        
        // Check if permissions are included in the user detail
        if (userDetail.permissions) {
          console.log(`  Permissions (included in detail): ${userDetail.permissions.length}`);
          userDetail.permissions.forEach((perm, idx) => {
            console.log(`    ${idx + 1}. Lock: ${perm.lockId}, Active: ${perm.canAccess}, Valid: ${perm.validFrom} to ${perm.validTo || 'Never'}, Project: ${perm.lock?.projectCityId || 'N/A'}`);
          });
        } else {
          console.log('  Permissions: Not included in user detail response');
        }
      } catch (error) {
        console.log(`  ❌ Error getting details for user ${user.email}: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test getUserStats for each user
    console.log('\n📊 Testing getUserStats for each user:');
    for (const user of users) {
      try {
        const statsResponse = await axios.get(`${API_BASE}/user/${user.id}/stats`, { headers });
        const stats = statsResponse.data.data;
        
        const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
        
        console.log(`\n📈 User Stats for ${userName}:`);
        console.log(`  Total Permissions: ${stats.totalPermissions || 'N/A'}`);
        console.log(`  Active Permissions: ${stats.activePermissions || 'N/A'}`);
        console.log(`  Access Logs: ${stats.accessLogs || 'N/A'}`);
        console.log(`  Last Access: ${stats.lastAccess || 'N/A'}`);
        
        // Show all properties in the stats object
        console.log('  All Stats Properties:');
        Object.keys(stats).forEach(key => {
          console.log(`    ${key}: ${stats[key]}`);
        });
      } catch (error) {
        console.log(`  ❌ Error getting stats for user ${user.email}: ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUserAPIEndpoints();