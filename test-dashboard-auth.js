const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testDashboardLocations() {
  console.log('🔐 Testing Dashboard Locations with Authentication...');
  
  try {
    // Step 1: Get projects and cities first  
    console.log('📋 Getting projects...');
    const projectsResponse = await axios.get(`${API_BASE}/project`);
    const projects = projectsResponse.data.data;
    
    const defaultProject = projects.find(p => p.slug === 'default' || p.name === 'Default Project');
    if (!defaultProject) {
      throw new Error('Default project not found');
    }
    
    console.log('🏢 Using project:', defaultProject.name);
    
    // Get cities for the project
    const citiesResponse = await axios.get(`${API_BASE}/project/${defaultProject.id}/cities`);
    const cities = citiesResponse.data.data;
    
    const amsterdamCity = cities.find(c => c.name === 'Amsterdam');
    if (!amsterdamCity) {
      throw new Error('Amsterdam city not found');
    }
    
    console.log('🌍 Using city:', amsterdamCity.name);
    
    // Step 2: Login to get auth token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'password123',
      projectId: defaultProject.name, // Use project name
      cityName: 'Amsterdam',
      cityId: amsterdamCity.id
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.error);
    }
    
    const token = loginResponse.data.data.accessToken; // Use accessToken, not token
    console.log('✅ Login successful, got token');
    
    // Step 2: Fetch dashboard data
    console.log('2. Fetching dashboard data...');
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!dashboardResponse.data.success) {
      throw new Error('Dashboard fetch failed: ' + dashboardResponse.data.error);
    }
    
    const stats = dashboardResponse.data.data;
    console.log('✅ Dashboard data fetched successfully');
    
    // Step 3: Analyze locations data
    console.log('\n📊 DASHBOARD ANALYSIS:');
    console.log('=======================');
    
    console.log('📈 General Stats:');
    console.log(`   - Total Users: ${stats.totalUsers}`);
    console.log(`   - Total Locks: ${stats.totalLocks}`);
    console.log(`   - Online Locks: ${stats.onlineLocks}`);
    console.log(`   - Active Keys: ${stats.activeKeys}`);
    console.log(`   - Access Attempts: ${stats.totalAccessAttempts}`);
    console.log(`   - Recent Logs: ${stats.recentAccessLogs?.length || 0}`);
    
    if (stats.debug) {
      console.log('\n🔍 Debug Info:');
      console.log(`   - Address Count: ${stats.debug.addressCount}`);
      console.log(`   - Effective City ID: ${stats.debug.effectiveCityId || 'none'}`);
      console.log(`   - Address Where Clause:`, stats.debug.addressWhereClause);
      console.log(`   - User Where Clause:`, stats.debug.userWhere);
    }
    
    console.log('\n🏢 LOCATIONS ANALYSIS:');
    console.log('=======================');
    
    if (!stats.locations) {
      console.log('❌ No locations property in response');
    } else if (!Array.isArray(stats.locations)) {
      console.log('❌ Locations is not an array:', typeof stats.locations);
      console.log('   Value:', stats.locations);
    } else if (stats.locations.length === 0) {
      console.log('⚠️  Locations array is empty');
      console.log('   Possible causes:');
      console.log('   - All addresses filtered out by scoping');
      console.log('   - No addresses in database for this user/city');
      console.log('   - Address query returned no results');
    } else {
      console.log(`✅ Found ${stats.locations.length} locations:`);
      console.log('');
      
      stats.locations.forEach((loc, index) => {
        console.log(`   📍 Location ${index + 1}:`);
        console.log(`      Name: ${loc.name}`);
        console.log(`      Address ID: ${loc.addressId}`);
        console.log(`      City ID: ${loc.cityId}`);
        console.log(`      Total Locks: ${loc.totalLocks}`);
        console.log(`      Active Locks: ${loc.activeLocks}/${loc.totalLocks}`);
        console.log(`      Active Users: ${loc.activeUsers}`);
        console.log(`      Active Keys: ${loc.activeKeys}`);
        console.log(`      Access Stats: ${loc.successfulAttempts}/${loc.totalAttempts} (${loc.successRate.toFixed(1)}%)`);
        console.log('');
      });
    }
    
    console.log('🎯 FRONTEND IMPACT:');
    console.log('===================');
    if (stats.locations && stats.locations.length > 0) {
      console.log('✅ Frontend should display locations table');
      console.log('   - Table should have sorting controls');
      console.log('   - Each location should be clickable');
      console.log('   - "View logs" links should work');
    } else {
      console.log('⚠️  Frontend will show "No locations found" message');
      console.log('   - This is the gray box with no table');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testDashboardLocations();