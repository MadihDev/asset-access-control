const axios = require('axios');

async function testTenantIsolation() {
  console.log('🧪 Testing Tenant Isolation\n');
  
  try {
    // Get projects and cities first
    console.log('📋 Getting projects...');
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    
    const perfectItProject = projects.find(p => p.slug === 'perfectit-solutions');
    const acmeProject = projects.find(p => p.slug === 'acme-corporation');
    
    if (!perfectItProject || !acmeProject) {
      throw new Error('Required projects not found');
    }
    
    console.log('🏢 PerfectIT Project ID:', perfectItProject.id);
    console.log('🏢 Acme Project ID:', acmeProject.id);
    
    // Get cities for each project
    const perfectItCitiesResponse = await axios.get(`http://localhost:5000/api/project/${perfectItProject.id}/cities`);
    const acmeCitiesResponse = await axios.get(`http://localhost:5000/api/project/${acmeProject.id}/cities`);
    
    const perfectItCities = perfectItCitiesResponse.data.data;
    const acmeCities = acmeCitiesResponse.data.data;
    
    const amsterdamPerfectIT = perfectItCities.find(c => c.name === 'Amsterdam');
    const amsterdamAcme = acmeCities.find(c => c.name === 'Amsterdam');
    
    console.log('🌍 Amsterdam (PerfectIT):', amsterdamPerfectIT?.id);
    console.log('🌍 Amsterdam (Acme):', amsterdamAcme?.id);
    
    // Test 1: Login as PerfectIT Administrator
    console.log('\n🔐 Testing PerfectIT Administrator...');
    const perfectItLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: perfectItProject.name, // Use project name, not ID
      cityName: 'Amsterdam',
      cityId: amsterdamPerfectIT.id
    });
    
    const perfectItToken = perfectItLoginResponse.data.data.accessToken;
    const perfectItUser = perfectItLoginResponse.data.data.user;
    
    console.log('✅ PerfectIT Login successful');
    console.log('👤 User:', perfectItUser.email, '| Role:', perfectItUser.role, '| ProjectCityId:', perfectItUser.projectCityId);
    
    // Test what PerfectIT admin can see
    console.log('\n📊 Testing PerfectIT Admin access...');
    
    // Test users
    const perfectItUsersResponse = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${perfectItToken}` }
    });
    console.log('👥 PerfectIT can see users:', perfectItUsersResponse.data.data.length);
    perfectItUsersResponse.data.data.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ProjectCity: ${user.projectCityId}`);
    });
    
    // Test access logs
    const perfectItLogsResponse = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${perfectItToken}` }
    });
    console.log('📝 PerfectIT can see access logs:', perfectItLogsResponse.data.data.length);
    if (perfectItLogsResponse.data.data.length > 0) {
      console.log('   First log ProjectCityId:', perfectItLogsResponse.data.data[0].projectCityId);
    }
    
    // Test 2: Login as Acme Administrator
    console.log('\n🔐 Testing Acme Administrator...');
    const acmeLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'acmeadmin',
      password: 'password123',
      projectId: acmeProject.name, // Use project name, not ID
      cityName: 'Amsterdam',
      cityId: amsterdamAcme.id
    });
    
    const acmeToken = acmeLoginResponse.data.data.accessToken;
    const acmeUser = acmeLoginResponse.data.data.user;
    
    console.log('✅ Acme Login successful');
    console.log('👤 User:', acmeUser.email, '| Role:', acmeUser.role, '| ProjectCityId:', acmeUser.projectCityId);
    
    // Test what Acme admin can see
    console.log('\n📊 Testing Acme Admin access...');
    
    // Test users
    const acmeUsersResponse = await axios.get('http://localhost:5000/api/user', {
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });
    console.log('👥 Acme can see users:', acmeUsersResponse.data.data.length);
    acmeUsersResponse.data.data.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ProjectCity: ${user.projectCityId}`);
    });
    
    // Test access logs
    const acmeLogsResponse = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });
    console.log('📝 Acme can see access logs:', acmeLogsResponse.data.data.length);
    if (acmeLogsResponse.data.data.length > 0) {
      console.log('   First log ProjectCityId:', acmeLogsResponse.data.data[0].projectCityId);
    }
    
    // Analysis
    console.log('\n🔍 Analysis:');
    if (perfectItUser.projectCityId === acmeUser.projectCityId) {
      console.log('❌ PROBLEM: Both users have the same projectCityId:', perfectItUser.projectCityId);
    } else {
      console.log('✅ GOOD: Users have different projectCityIds');
      console.log('   PerfectIT:', perfectItUser.projectCityId);
      console.log('   Acme:', acmeUser.projectCityId);
    }
    
    const perfectItEmails = perfectItUsersResponse.data.data.map(u => u.email);
    const acmeEmails = acmeUsersResponse.data.data.map(u => u.email);
    const overlap = perfectItEmails.filter(email => acmeEmails.includes(email));
    
    if (overlap.length > 0) {
      console.log('❌ PROBLEM: Users can see each other\'s data');
      console.log('   Overlap:', overlap);
    } else {
      console.log('✅ GOOD: No user data overlap between projects');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTenantIsolation();