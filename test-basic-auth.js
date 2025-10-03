/**
 * Simple Authentication Test
 * Test basic authentication to identify the issue
 */

const axios = require('axios');

async function testBasicAuth() {
  console.log('🔍 Testing basic authentication...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'techcorpadminamsterdam',
      password: 'demo123',
      projectId: 'techcorp',
      cityName: 'Amsterdam'
    }, { 
      timeout: 10000,
      validateStatus: () => true 
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.accessToken) {
      console.log('✅ Authentication SUCCESS');
      console.log('Token length:', response.data.accessToken.length);
      console.log('User info:', response.data.user);
    } else {
      console.log('❌ Authentication FAILED');
      console.log('Error details:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Request ERROR:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testBasicAuth();