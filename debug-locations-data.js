// This script will help debug the locations page data by:
// 1. Getting addresses from the database via API
// 2. Getting users, locks, and keys for each address
// 3. Comparing with what the frontend displays

const BASE_URL = 'http://localhost:5000';

// You'll need to get a valid token by logging in first
// For now, we'll test without authentication to see the error responses
async function testAddressAPI() {
  try {
    console.log('🔍 Testing Address API endpoints...\n');
    
    // Test 1: Get addresses list
    console.log('1️⃣ Getting addresses list:');
    const addressResponse = await fetch(`${BASE_URL}/api/address`);
    console.log(`Status: ${addressResponse.status}`);
    const addressData = await addressResponse.json();
    console.log('Response:', JSON.stringify(addressData, null, 2));
    
    if (addressData.success && addressData.data && addressData.data.length > 0) {
      const firstAddress = addressData.data[0];
      console.log(`\n📍 Testing with first address: ${firstAddress.street} ${firstAddress.number}`);
      console.log(`Address ID: ${firstAddress.id}`);
      
      // Test 2: Get users for this address
      console.log('\n2️⃣ Getting users for address:');
      const usersResponse = await fetch(`${BASE_URL}/api/location/${firstAddress.id}/users`);
      console.log(`Status: ${usersResponse.status}`);
      const usersData = await usersResponse.json();
      console.log('Users Response:', JSON.stringify(usersData, null, 2));
      
      // Test 3: Get locks for this address
      console.log('\n3️⃣ Getting locks for address:');
      const locksResponse = await fetch(`${BASE_URL}/api/location/${firstAddress.id}/locks`);
      console.log(`Status: ${locksResponse.status}`);
      const locksData = await locksResponse.json();
      console.log('Locks Response:', JSON.stringify(locksData, null, 2));
      
      // Test 4: Get keys for this address
      console.log('\n4️⃣ Getting keys for address:');
      const keysResponse = await fetch(`${BASE_URL}/api/location/${firstAddress.id}/keys`);
      console.log(`Status: ${keysResponse.status}`);
      const keysData = await keysResponse.json();
      console.log('Keys Response:', JSON.stringify(keysData, null, 2));
      
      // Summary
      console.log('\n📊 SUMMARY:');
      console.log(`Address: ${firstAddress.street} ${firstAddress.number}, ${firstAddress.city?.name || 'Unknown City'}`);
      console.log(`Expected counts from address API:`);
      console.log(`  - Users: ${firstAddress._count?.users || 0}`);
      console.log(`  - Locks: ${firstAddress._count?.locks || 0}`);
      
      if (usersData.success) {
        console.log(`Actual users returned: ${usersData.data?.length || 0}`);
      }
      if (locksData.success) {
        console.log(`Actual locks returned: ${locksData.data?.length || 0}`);
      }
      if (keysData.success) {
        console.log(`Actual keys returned: ${keysData.data?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAddressAPI();