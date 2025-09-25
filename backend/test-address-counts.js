// Test address endpoint to verify keys count is included
const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testAddressEndpoint() {
  try {
    console.log('🔐 Logging in...');
    
    // Login to get token
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      email: 'perfectit_admin@perfectitsolutions.com',
      password: 'admin123'
    }));

    if (!loginResponse.success) {
      console.log('❌ Login failed:', loginResponse.error);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test address endpoint
    console.log('🏠 Testing address endpoint...');
    const addressResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/address',
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (addressResponse.success) {
      // Find Damrak 100 address
      const damrakAddress = addressResponse.data.find(addr => 
        addr.street === 'Damrak' && addr.number === '100'
      );

      if (damrakAddress) {
        console.log('🎯 Found Damrak 100 address:');
        console.log('  Users count:', damrakAddress._count?.users || 'N/A');
        console.log('  Locks count:', damrakAddress._count?.locks || 'N/A');
        console.log('  Keys count:', damrakAddress._count?.keys || 'N/A');
        
        if (damrakAddress._count?.keys !== undefined) {
          console.log('✅ SUCCESS: Keys count is now included in address endpoint!');
          console.log(`   Expected: 4 keys, Got: ${damrakAddress._count.keys}`);
        } else {
          console.log('❌ Keys count still missing from address endpoint');
        }
      } else {
        console.log('❌ Could not find Damrak 100 address');
      }
    } else {
      console.log('❌ Address endpoint failed:', addressResponse.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAddressEndpoint();