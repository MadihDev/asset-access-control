// Simple test script to verify the keys fix
const http = require('http');

// Test function to make HTTP requests
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

async function testKeysFix() {
  try {
    console.log('🔐 Logging in as admin...');
    
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

    // Test keys endpoint
    console.log('🧪 Testing keys endpoint...');
    const keysResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/location/cmfuzzxau0001g2ed7sjkwa6x/keys',
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🎯 Keys API Results:');
    console.log('Total keys returned:', keysResponse.pagination?.total || 0);
    console.log('Expected: 4 keys (one per user)');
    console.log('');
    console.log('Keys shown:');
    keysResponse.data?.forEach((key, index) => {
      const user = key.user;
      console.log(`  ${index + 1}. ${key.cardId} - ${user?.firstName} ${user?.lastName}`);
    });

    const totalKeys = keysResponse.pagination?.total || 0;
    if (totalKeys === 4) {
      console.log('\n🎉 SUCCESS: Now showing 4 keys (one per user)!');
    } else {
      console.log(`\n⚠️  Expected 4 keys, got ${totalKeys}`);
    }

    // Test with status=all
    console.log('\n🔍 Testing with status=all...');
    const allKeysResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/location/cmfuzzxau0001g2ed7sjkwa6x/keys?status=all',
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Total with status=all:', allKeysResponse.pagination?.total || 0);
    console.log('(This should show all keys for users with access)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testKeysFix();