const fetch = require('node-fetch');

async function testEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔍 Testing backend endpoints...\n');
  
  try {
    // Test health endpoint (no auth required)
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const health = await healthResponse.text();
    console.log(`✅ Health: ${healthResponse.status} - ${health}\n`);
  } catch (error) {
    console.log(`❌ Health failed: ${error.message}\n`);
  }

  try {
    // Test locks endpoint without auth
    console.log('2. Testing locks endpoint (no auth)...');
    const locksResponse = await fetch(`${baseUrl}/api/lock`);
    const locksStatus = locksResponse.status;
    const locksText = await locksResponse.text();
    console.log(`📍 Locks: ${locksStatus} - ${locksText.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`❌ Locks failed: ${error.message}\n`);
  }

  try {
    // Test available locks endpoint without auth
    console.log('3. Testing available locks endpoint (no auth)...');
    const availableLocksResponse = await fetch(`${baseUrl}/api/lock/available?userId=test`);
    const availableLocksStatus = availableLocksResponse.status;
    const availableLocksText = await availableLocksResponse.text();
    console.log(`🔒 Available locks: ${availableLocksStatus} - ${availableLocksText.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`❌ Available locks failed: ${error.message}\n`);
  }

  try {
    // Test RFID endpoint without auth
    console.log('4. Testing RFID available endpoint (no auth)...');
    const rfidResponse = await fetch(`${baseUrl}/api/rfid/available`);
    const rfidStatus = rfidResponse.status;
    const rfidText = await rfidResponse.text();
    console.log(`🏷️ RFID available: ${rfidStatus} - ${rfidText.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`❌ RFID available failed: ${error.message}\n`);
  }

  console.log('🔍 Endpoint testing complete!');
}

testEndpoints().catch(console.error);