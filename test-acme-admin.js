const axios = require('axios');

async function testAcmeAdminAccess() {
  try {
    console.log('🔐 Logging in as Acme Administrator...');
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    const acmeProject = projects.find(p => p.slug === 'acme-corporation');
    
    const acmeCitiesResponse = await axios.get(`http://localhost:5000/api/project/${acmeProject.id}/cities`);
    const acmeCities = acmeCitiesResponse.data.data;
    const amsterdam = acmeCities.find(c => c.name === 'Amsterdam');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'acmeadmin',
      password: 'password123',
      projectId: acmeProject.name,
      cityName: 'Amsterdam',
      cityId: amsterdam.id
    });
    
    const token = loginResponse.data.data.accessToken;
    const user = loginResponse.data.data.user;
    
    console.log('✅ Acme Login successful');
    console.log('👤 User projectCityId:', user.projectCityId);
    
    // Test access logs
    const response = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`📊 Acme Admin can see ${response.data.data.length} logs:`);
    response.data.data.forEach((log, i) => {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown';
      console.log(`   ${i+1}. ${userName} | ProjectCityId: ${log.projectCityId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAcmeAdminAccess();