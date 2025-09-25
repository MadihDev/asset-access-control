const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const PERFECTIT_ADMIN = {
  username: 'perfectitadmin',
  password: 'password123',
  projectId: 'PerfectIT Solutions',
  cityName: 'Amsterdam'
};

const ACME_ADMIN = {
  username: 'acmeadmin',
  password: 'password123',
  projectId: 'Acme Corporation',
  cityName: 'Amsterdam'
};

async function debugTenantIsolationIssues() {
  console.log('🔍 DEBUGGING TENANT ISOLATION ISSUES');
  console.log('=====================================\n');
  
  try {
    // Login to both tenants
    const perfectitLogin = await axios.post(`${API_BASE}/auth/login`, PERFECTIT_ADMIN);
    const perfectitToken = perfectitLogin.data.data.accessToken;
    const perfectitUser = perfectitLogin.data.data.user;
    
    const acmeLogin = await axios.post(`${API_BASE}/auth/login`, ACME_ADMIN);
    const acmeToken = acmeLogin.data.data.accessToken;
    const acmeUser = acmeLogin.data.data.user;
    
    const perfectitHeaders = { Authorization: `Bearer ${perfectitToken}` };
    const acmeHeaders = { Authorization: `Bearer ${acmeToken}` };
    
    console.log(`✅ PerfectIT: ${perfectitUser.email} (Role: ${perfectitUser.role}, ProjectCity: ${perfectitUser.projectCityId})`);
    console.log(`✅ Acme: ${acmeUser.email} (Role: ${acmeUser.role}, ProjectCity: ${acmeUser.projectCityId})\n`);
    
    // === DEBUG DASHBOARD ISSUE ===
    console.log('1️⃣ DEBUGGING DASHBOARD ISSUE');
    console.log('----------------------------');
    
    try {
      const dashboardResponse = await axios.get(`${API_BASE}/dashboard`, { headers: perfectitHeaders });
      console.log('📊 Dashboard Response Structure:');
      console.log(JSON.stringify(dashboardResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Dashboard Error:', error.response?.data || error.message);
    }
    
    // === DEBUG CROSS-TENANT USER ACCESS ===
    console.log('\n2️⃣ DEBUGGING CROSS-TENANT USER ACCESS');
    console.log('-------------------------------------');
    
    // Get users from both tenants
    const perfectitUsers = await axios.get(`${API_BASE}/user/with-permissions`, { headers: perfectitHeaders });
    const acmeUsers = await axios.get(`${API_BASE}/user/with-permissions`, { headers: acmeHeaders });
    
    console.log(`PerfectIT Users: ${perfectitUsers.data.data.map(u => u.id).join(', ')}`);
    console.log(`Acme Users: ${acmeUsers.data.data.map(u => u.id).join(', ')}`);
    
    // Try accessing each other's users
    if (acmeUsers.data.data.length > 0) {
      const acmeUserId = acmeUsers.data.data[0].id;
      console.log(`\nTrying to access Acme user ${acmeUserId} with PerfectIT token...`);
      
      try {
        const response = await axios.get(`${API_BASE}/user/${acmeUserId}`, { headers: perfectitHeaders });
        console.log('❌ SECURITY ISSUE: Access allowed!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log(`✅ Access blocked: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
    if (perfectitUsers.data.data.length > 0) {
      const perfectitUserId = perfectitUsers.data.data[0].id;
      console.log(`\nTrying to access PerfectIT user ${perfectitUserId} with Acme token...`);
      
      try {
        const response = await axios.get(`${API_BASE}/user/${perfectitUserId}`, { headers: acmeHeaders });
        console.log('❌ SECURITY ISSUE: Access allowed!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log(`✅ Access blocked: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
    // === DEBUG PERMISSION ASSIGNMENT ===
    console.log('\n3️⃣ DEBUGGING CROSS-TENANT PERMISSION ASSIGNMENT');
    console.log('-----------------------------------------------');
    
    // Get locks from both tenants
    const perfectitLocks = await axios.get(`${API_BASE}/lock`, { headers: perfectitHeaders });
    const acmeLocks = await axios.get(`${API_BASE}/lock`, { headers: acmeHeaders });
    
    if (perfectitUsers.data.data.length > 0 && acmeLocks.data.data.length > 0) {
      const perfectitUserId = perfectitUsers.data.data[0].id;
      const acmeLockId = acmeLocks.data.data[0].id;
      
      console.log(`Trying to assign PerfectIT user ${perfectitUserId} to Acme lock ${acmeLockId}...`);
      
      try {
        const response = await axios.post(`${API_BASE}/permission`, {
          userId: perfectitUserId,
          lockId: acmeLockId,
          canAccess: true
        }, { headers: perfectitHeaders });
        
        console.log('❌ SECURITY ISSUE: Cross-tenant permission assignment allowed!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log(`✅ Assignment blocked: ${error.response?.status} - ${error.response?.data?.error}`);
      }
    }
    
    // === ADMIN ROLE CHECK ===
    console.log('\n4️⃣ CHECKING ADMIN ROLES');
    console.log('-----------------------');
    
    console.log(`PerfectIT Admin Role: ${perfectitUser.role}`);
    console.log(`Acme Admin Role: ${acmeUser.role}`);
    
    // Check if the role is causing bypass of tenant checks
    if (perfectitUser.role === 'ADMIN' || acmeUser.role === 'ADMIN') {
      console.log('⚠️ WARNING: ADMIN role detected - this might bypass tenant isolation!');
      console.log('ADMIN roles should not bypass project-city isolation in the current design.');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugTenantIsolationIssues();