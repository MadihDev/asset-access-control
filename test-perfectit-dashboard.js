const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testPerfectITDashboard() {
  console.log('🔐 Testing PerfectIT Administrator Dashboard...');
  
  try {
    // Get projects
    console.log('📋 Getting projects...');
    const projectsResponse = await axios.get(`${API_BASE}/project`);
    const projects = projectsResponse.data.data;
    const perfectItProject = projects.find(p => p.name === 'PerfectIT Solutions');
    
    if (!perfectItProject) {
      throw new Error('PerfectIT Solutions project not found');
    }
    
    console.log(`🏢 Using project: ${perfectItProject.name}`);
    
    // Get cities for PerfectIT project
    console.log('🌍 Getting cities for PerfectIT...');
    const citiesResponse = await axios.get(`${API_BASE}/project/${perfectItProject.id}/cities`);
    const cities = citiesResponse.data.data;
    const amsterdamCity = cities.find(c => c.name === 'Amsterdam');
    
    if (!amsterdamCity) {
      throw new Error('Amsterdam city not found for PerfectIT');
    }
    
    console.log(`🌍 Using city: ${amsterdamCity.name}`);
    
    // Login as PerfectIT Administrator
    console.log('🔐 Logging in as PerfectIT Administrator...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: perfectItProject.name,
      cityName: amsterdamCity.name,
      cityId: amsterdamCity.id
    });
    
    const token = loginResponse.data.data.accessToken;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    console.log(`👤 User: ${user.email} | Role: ${user.role} | ProjectCityId: ${user.projectCityId}`);
    
    // Set authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Fetch dashboard data
    console.log('\n📊 Fetching dashboard data...');
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard`);
    const dashboardData = dashboardResponse.data.data;
    
    console.log('✅ Dashboard data fetched successfully\n');
    
    console.log('📈 PERFECTIT DASHBOARD STATS:');
    console.log('===============================');
    console.log(`   - Total Users: ${dashboardData.totalUsers}`);
    console.log(`   - Total Locks: ${dashboardData.totalLocks}`);
    console.log(`   - Online Locks: ${dashboardData.onlineLocks}`);
    console.log(`   - Active Keys: ${dashboardData.activeKeys}`);
    console.log(`   - Access Attempts: ${dashboardData.totalAccessAttempts}`);
    console.log(`   - Recent Logs: ${dashboardData.recentAccessLogs.length}`);
    
    if (dashboardData.locations && dashboardData.locations.length > 0) {
      console.log('\n🏢 ALL LOCATIONS FROM DASHBOARD:');
      console.log('=======================');
      console.log(`✅ Found ${dashboardData.locations.length} total locations:\n`);
      
      dashboardData.locations.forEach((location, index) => {
        console.log(`   📍 Location ${index + 1}:`);
        console.log(`      Name: ${location.name}`);
        console.log(`      Address ID: ${location.addressId}`);
        console.log(`      City ID: ${location.cityId}`);
        console.log(`      Total Locks: ${location.totalLocks}`);
        console.log(`      Active Locks: ${location.activeLocks}/${location.totalLocks}`);
        console.log(`      Active Users: ${location.activeUsers}`);
        console.log(`      Active Keys: ${location.activeKeys}`);
        console.log(`      Access Stats: ${location.successfulAttempts}/${location.totalAttempts} (${location.successRate.toFixed(1)}%)\n`);
      });
      
      // Filter only PerfectIT locations  
      const perfectItLocations = dashboardData.locations.filter(loc => 
        loc.name.includes('PerfectIT Solutions')
      );
      
      console.log(`\n🔍 PerfectIT filter found ${perfectItLocations.length} locations (should be 0 since names don't include 'PerfectIT Solutions'):\n`);
      
      perfectItLocations.forEach((location, index) => {
        console.log(`   📍 Location ${index + 1}:`);
        console.log(`      Name: ${location.name}`);
        console.log(`      Address ID: ${location.addressId}`);
        console.log(`      City ID: ${location.cityId}`);
        console.log(`      Total Locks: ${location.totalLocks}`);
        console.log(`      Active Locks: ${location.activeLocks}/${location.totalLocks}`);
        console.log(`      Active Users: ${location.activeUsers}`);
        console.log(`      Active Keys: ${location.activeKeys}`);
        console.log(`      Access Stats: ${location.successfulAttempts}/${location.totalAttempts} (${location.successRate}%)\n`);
      });
    }
    
    // Test recent access logs
    if (dashboardData.recentAccessLogs && dashboardData.recentAccessLogs.length > 0) {
      console.log('📝 RECENT ACCESS LOGS:');
      console.log('======================');
      dashboardData.recentAccessLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${new Date(log.timestamp).toLocaleString()}`);
        console.log(`      User: ${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'}`);
        console.log(`      Lock: ${log.lock.name}`);
        console.log(`      Result: ${log.result}`);
        console.log(`      Type: ${log.accessType}\n`);
      });
    } else {
      console.log('\n📝 No recent access logs found');
    }
    
    console.log('\n🎯 VERIFICATION NOTES:');
    console.log('======================');
    console.log('- Dashboard data is scoped to PerfectIT Solutions project');
    console.log('- Only showing Amsterdam city data (based on login)');
    console.log('- User should only see PerfectIT-related locations and access logs');
    console.log('- Stats should reflect only PerfectIT tenant data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPerfectITDashboard();