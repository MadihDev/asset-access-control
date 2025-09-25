const axios = require('axios');

async function investigateKeysIssue() {
  try {
    console.log('🔍 Investigating why there are 14 active keys per address...\n');
    
    // Get authentication token
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    const perfectItProject = projects.find(p => p.slug === 'perfectit-solutions');
    
    const citiesResponse = await axios.get(`http://localhost:5000/api/project/${perfectItProject.id}/cities`);
    const cities = citiesResponse.data.data;
    const amsterdam = cities.find(c => c.name === 'Amsterdam');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: perfectItProject.name,
      cityName: 'Amsterdam',
      cityId: amsterdam.id
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Authenticated successfully\n');
    
    // Get first address
    const addressesResponse = await axios.get('http://localhost:5000/api/address', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const firstAddress = addressesResponse.data.data[0];
    console.log(`📍 Analyzing address: ${firstAddress.street} ${firstAddress.number}`);
    console.log(`Address ID: ${firstAddress.id}\n`);
    
    // Get users for this address
    const usersResponse = await axios.get(`http://localhost:5000/api/location/${firstAddress.id}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`👥 Users with access (${usersResponse.data.data.length}):`);
    usersResponse.data.data.forEach((user, i) => {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      console.log(`  ${i+1}. ${userName} (${user.email})`);
      console.log(`     User ID: ${user.id}`);
      console.log(`     RFID Keys: ${user.rfidKeys?.length || 0}`);
      if (user.rfidKeys && user.rfidKeys.length > 0) {
        user.rfidKeys.forEach((key, j) => {
          console.log(`       ${j+1}. ${key.cardId} (Active: ${key.isActive})`);
        });
      }
    });
    
    // Get all keys for this address
    console.log(`\n🗝️ All active keys for this address:`);
    const keysResponse = await axios.get(`http://localhost:5000/api/location/${firstAddress.id}/keys`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Total keys returned: ${keysResponse.data.data.length}`);
    
    // Group keys by user
    const keysByUser = {};
    keysResponse.data.data.forEach((key, i) => {
      const userName = key.user ? `${key.user.firstName || ''} ${key.user.lastName || ''}`.trim() : 'Unknown';
      const userId = key.user ? key.user.id : 'unknown';
      
      if (!keysByUser[userId]) {
        keysByUser[userId] = {
          userName,
          keys: []
        };
      }
      keysByUser[userId].keys.push(key);
      
      console.log(`  ${i+1}. ${key.cardId} - ${userName} (User ID: ${userId}) - Active: ${key.isActive}`);
    });
    
    console.log(`\n📊 Keys grouped by user:`);
    Object.entries(keysByUser).forEach(([userId, data]) => {
      console.log(`  ${data.userName} (${userId}): ${data.keys.length} keys`);
      data.keys.forEach(key => {
        console.log(`    - ${key.cardId}`);
      });
    });
    
    // Analysis
    console.log(`\n🤔 ANALYSIS:`);
    console.log(`- Address has ${usersResponse.data.data.length} users with access`);
    console.log(`- Keys endpoint returns ${keysResponse.data.data.length} keys`);
    console.log(`- This suggests the keys query might be too broad`);
    
    // Check if the issue is with permissions query
    console.log(`\n🔍 Let's check what the query logic might be doing...`);
    console.log(`The keys endpoint finds users who have permission for ANY lock at this address,`);
    console.log(`then returns ALL active RFID keys for those users.`);
    console.log(`This means if a user has access to this address, ALL their active keys are returned,`);
    console.log(`even if those keys are associated with other addresses too.`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

investigateKeysIssue();