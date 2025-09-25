const axios = require('axios');

async function testLocationsData() {
  try {
    console.log('🔐 Getting authentication token...');
    
    // First get project and city info
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    const perfectItProject = projects.find(p => p.slug === 'perfectit-solutions');
    
    if (!perfectItProject) {
      console.error('❌ PerfectIT Solutions project not found');
      return;
    }
    
    const citiesResponse = await axios.get(`http://localhost:5000/api/project/${perfectItProject.id}/cities`);
    const cities = citiesResponse.data.data;
    const amsterdam = cities.find(c => c.name === 'Amsterdam');
    
    if (!amsterdam) {
      console.error('❌ Amsterdam city not found');
      return;
    }
    
    // Login as admin
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
    console.log(`👤 User: ${user.name} (${user.role})`);
    console.log(`🏙️ Project-City ID: ${user.projectCityId}\n`);
    
    // Test addresses endpoint
    console.log('📍 Testing Addresses API...');
    const addressesResponse = await axios.get('http://localhost:5000/api/address', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Found ${addressesResponse.data.data.length} addresses:`);
    
    for (const address of addressesResponse.data.data.slice(0, 3)) { // Test first 3 addresses
      console.log(`\n🏢 ${address.street} ${address.number}, ${address.city.name}`);
      console.log(`   ID: ${address.id}`);
      console.log(`   Expected users: ${address._count?.users || 0}`);
      console.log(`   Expected locks: ${address._count?.locks || 0}`);
      
      // Test users endpoint
      try {
        const usersResponse = await axios.get(`http://localhost:5000/api/location/${address.id}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   👥 Actual users: ${usersResponse.data.data.length}`);
        
        // Show user details
        usersResponse.data.data.forEach((user, i) => {
          const keyCount = user.rfidKeys ? user.rfidKeys.length : 0;
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
          console.log(`      ${i+1}. ${userName} (${user.email}) - ${keyCount} RFID keys`);
        });
        
      } catch (error) {
        console.log(`   ❌ Users error: ${error.response?.data?.error || error.message}`);
      }
      
      // Test locks endpoint
      try {
        const locksResponse = await axios.get(`http://localhost:5000/api/location/${address.id}/locks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   🔒 Actual locks: ${locksResponse.data.data.length}`);
        
        // Show lock details
        locksResponse.data.data.forEach((lock, i) => {
          const permCount = lock._count?.permissions || 0;
          console.log(`      ${i+1}. ${lock.name} (${lock.lockType || 'Unknown'}) - ${permCount} permissions - Online: ${lock.isOnline}`);
        });
        
      } catch (error) {
        console.log(`   ❌ Locks error: ${error.response?.data?.error || error.message}`);
      }
      
      // Test keys endpoint
      try {
        const keysResponse = await axios.get(`http://localhost:5000/api/location/${address.id}/keys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   🗝️ Actual keys: ${keysResponse.data.data.length}`);
        
        // Show key details
        keysResponse.data.data.forEach((key, i) => {
          const userName = key.user ? `${key.user.firstName || ''} ${key.user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User';
          console.log(`      ${i+1}. ${key.cardId} - ${userName} - Active: ${key.isActive}`);
        });
        
      } catch (error) {
        console.log(`   ❌ Keys error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('This data should match what you see in the Locations page tabs.');
    console.log('If counts don\'t match, there may be:');
    console.log('- Permission filtering differences');
    console.log('- Active/inactive status filtering');
    console.log('- Tenant isolation issues');
    console.log('- Frontend state management issues');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message || error);
  }
}

testLocationsData();