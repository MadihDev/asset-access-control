const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test script to simulate access attempts and check if dashboard updates in real-time
async function testRealTimeUpdates() {
  console.log('🚀 Testing real-time dashboard updates...');
  
  try {
    // Get authentication token first
    console.log('📋 Getting projects...');
    const projectsResponse = await axios.get(`${API_BASE}/project`);
    const projects = projectsResponse.data.data;
    const project = projects.find(p => p.name === 'PerfectIT Solutions') || projects[0];
    console.log(`🏢 Using project: ${project.name}`);

    console.log('🌍 Getting cities...');
    const citiesResponse = await axios.get(`${API_BASE}/project/${project.id}/cities`);
    const cities = citiesResponse.data.data;
    const city = cities.find(c => c.name === 'Amsterdam') || cities[0];
    console.log(`🌍 Using city: ${city.name}`);

    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: project.name,
      cityName: city.name,
      cityId: city.id
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    // Set default authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // First, get a valid lock ID from the system
    console.log('📡 Fetching available locks...');
    const locksResponse = await axios.get(`${API_BASE}/lock`);
    const locks = locksResponse.data.data;
    
    if (!locks || locks.length === 0) {
      console.log('❌ No locks available for testing');
      return;
    }
    
    const testLock = locks[0];
    console.log(`✅ Using lock: ${testLock.name} (ID: ${testLock.id})`);
    
    // Simulate multiple access attempts
    const attempts = [
      { cardId: 'TEST-CARD-001', result: 'Should create access log' },
      { cardId: 'TEST-CARD-002', result: 'Should create access log' },
      { cardId: 'TEST-CARD-003', result: 'Should create access log' }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      console.log(`\n🔑 Simulating access attempt ${i + 1}/3...`);
      
      try {
        const accessAttempt = await axios.post(`${API_BASE}/lock/access-attempt`, {
          cardId: attempt.cardId,
          lockId: testLock.id,
          accessType: 'RFID_CARD',
          deviceInfo: {
            deviceModel: 'Test-Device',
            firmwareVersion: '1.0.0',
            signalStrength: 100
          }
        });
        
        console.log(`✅ Access attempt logged: ${accessAttempt.data.message}`);
        console.log(`   📊 Dashboard should update via WebSocket...`);
        
        // Wait 2 seconds between attempts
        if (i < attempts.length - 1) {
          console.log('   ⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`❌ Failed to log access attempt: ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n🎉 Test completed! Check your dashboard for real-time updates.');
    console.log('💡 You should see:');
    console.log('   - Updated access attempt counts');
    console.log('   - New entries in recent access logs');
    console.log('   - "Last updated" timestamp should change');
    console.log('   - WebSocket notifications (if authenticated)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealTimeUpdates();