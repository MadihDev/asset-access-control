const axios = require('axios');

async function debugAccessLogsCall() {
  try {
    // Login as PerfectIT Administrator
    console.log('🔐 Logging in as PerfectIT Administrator...');
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    const perfectItProject = projects.find(p => p.slug === 'perfectit-solutions');
    
    const perfectItCitiesResponse = await axios.get(`http://localhost:5000/api/project/${perfectItProject.id}/cities`);
    const perfectItCities = perfectItCitiesResponse.data.data;
    const amsterdam = perfectItCities.find(c => c.name === 'Amsterdam');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: perfectItProject.name,
      cityName: 'Amsterdam',
      cityId: amsterdam.id
    });
    
    const token = loginResponse.data.data.accessToken;
    const user = loginResponse.data.data.user;
    
    console.log('✅ Login successful');
    console.log('👤 User projectCityId:', user.projectCityId);
    
    // Test access logs with different parameter combinations
    console.log('\n🧪 Testing different access log parameters...');
    
    // Test 1: No parameters (should be scoped automatically)
    console.log('\n1️⃣ No parameters:');
    const response1 = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   Found ${response1.data.data.length} logs`);
    if (response1.data.data.length > 0) {
      const firstLog = response1.data.data[0];
      console.log(`   First log: ${firstLog.user?.firstName} ${firstLog.user?.lastName} | ProjectCityId: ${firstLog.projectCityId}`);
    }
    
    // Test 2: With projectCityId parameter
    console.log('\n2️⃣ With projectCityId parameter:');
    const response2 = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { projectCityId: user.projectCityId }
    });
    console.log(`   Found ${response2.data.data.length} logs`);
    if (response2.data.data.length > 0) {
      const firstLog = response2.data.data[0];
      console.log(`   First log: ${firstLog.user?.firstName} ${firstLog.user?.lastName} | ProjectCityId: ${firstLog.projectCityId}`);
    }
    
    // Test 3: With cityId parameter (legacy mode)
    console.log('\n3️⃣ With cityId parameter:');
    const response3 = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { cityId: amsterdam.id }
    });
    console.log(`   Found ${response3.data.data.length} logs`);
    if (response3.data.data.length > 0) {
      const firstLog = response3.data.data[0];
      console.log(`   First log: ${firstLog.user?.firstName} ${firstLog.user?.lastName} | ProjectCityId: ${firstLog.projectCityId}`);
    }
    
    // Show all users in each response to identify the issue
    console.log('\n📊 All users in response 1 (no params):');
    response1.data.data.forEach((log, i) => {
      console.log(`   ${i+1}. ${log.user?.firstName} ${log.user?.lastName} | ProjectCityId: ${log.projectCityId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugAccessLogsCall();