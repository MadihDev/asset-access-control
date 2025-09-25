const axios = require('axios');

async function testDashboardTenantIsolation() {
  console.log('🧪 Testing Dashboard Tenant Isolation...\n');

  try {
    // Test PerfectIT Administrator Dashboard
    console.log('📊 Testing PerfectIT Administrator Dashboard...');
    const perfectitLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: 'PerfectIT Solutions',
      cityName: 'Amsterdam',
      cityId: 'cmfuhkvzb0000ez4f28vfb0a8'  // Amsterdam city ID
    });

    const perfectitToken = perfectitLogin.data.token;
    const perfectitResponse = await axios.get('http://localhost:5000/api/dashboard', {
      headers: { Authorization: `Bearer ${perfectitToken}` }
    });

    console.log('PerfectIT Dashboard Data:');
    console.log('- Total Access Attempts:', perfectitResponse.data.data.totalAccessAttempts);
    console.log('- Successful Access:', perfectitResponse.data.data.successfulAccess);
    console.log('- Recent Access Logs Count:', perfectitResponse.data.data.recentAccessLogs.length);
    console.log('- Scope:', perfectitResponse.data.data.scope);
    
    console.log('\nPerfectIT Recent Access Logs:');
    perfectitResponse.data.data.recentAccessLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. User: ${log.user?.firstName} ${log.user?.lastName}, Lock: ${log.lock?.name}, Result: ${log.result}, ProjectCityId: ${log.projectCityId}`);
    });

    // Test Acme Administrator Dashboard
    console.log('\n📊 Testing Acme Administrator Dashboard...');
    const acmeLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'acmeadmin',
      password: 'password123',
      projectId: 'Acme Corporation',
      cityName: 'Amsterdam',
      cityId: 'cmfuhkvzb0000ez4f28vfb0a8'  // Amsterdam city ID
    });

    const acmeToken = acmeLogin.data.token;
    const acmeResponse = await axios.get('http://localhost:5000/api/dashboard', {
      headers: { Authorization: `Bearer ${acmeToken}` }
    });

    console.log('Acme Dashboard Data:');
    console.log('- Total Access Attempts:', acmeResponse.data.data.totalAccessAttempts);
    console.log('- Successful Access:', acmeResponse.data.data.successfulAccess);
    console.log('- Recent Access Logs Count:', acmeResponse.data.data.recentAccessLogs.length);
    console.log('- Scope:', acmeResponse.data.data.scope);
    
    console.log('\nAcme Recent Access Logs:');
    acmeResponse.data.data.recentAccessLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. User: ${log.user?.firstName} ${log.user?.lastName}, Lock: ${log.lock?.name}, Result: ${log.result}, ProjectCityId: ${log.projectCityId}`);
    });

    // Verify tenant isolation
    console.log('\n🔍 Tenant Isolation Analysis:');
    
    const perfectitProjectCityId = perfectitResponse.data.data.scope?.projectCityId;
    const acmeProjectCityId = acmeResponse.data.data.scope?.projectCityId;
    
    console.log(`PerfectIT ProjectCityId: ${perfectitProjectCityId}`);
    console.log(`Acme ProjectCityId: ${acmeProjectCityId}`);
    
    // Check if PerfectIT sees only its own data
    const perfectitLogProjectCities = perfectitResponse.data.data.recentAccessLogs.map(log => log.projectCityId);
    const perfectitSeesOnlyOwnData = perfectitLogProjectCities.every(id => id === perfectitProjectCityId);
    console.log(`✅ PerfectIT sees only own data: ${perfectitSeesOnlyOwnData}`);
    
    // Check if Acme sees only its own data
    const acmeLogProjectCities = acmeResponse.data.data.recentAccessLogs.map(log => log.projectCityId);
    const acmeSeesOnlyOwnData = acmeLogProjectCities.every(id => id === acmeProjectCityId);
    console.log(`✅ Acme sees only own data: ${acmeSeesOnlyOwnData}`);
    
    if (perfectitSeesOnlyOwnData && acmeSeesOnlyOwnData) {
      console.log('\n🎉 Dashboard tenant isolation is WORKING correctly!');
    } else {
      console.log('\n❌ Dashboard tenant isolation FAILED - cross-project data visible!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDashboardTenantIsolation();