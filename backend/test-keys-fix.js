const fetch = require('node-fetch');

async function testKeysFix() {
  try {
    console.log('🧪 Testing UPDATED keys endpoint...');
    const response = await fetch('http://localhost:5000/api/location/cmfuzzxau0001g2ed7sjkwa6x/keys');
    const data = await response.json();
    
    console.log('✅ API Response:');
    console.log('Total keys:', data.pagination?.total || 0);
    console.log('Keys shown:');
    data.data?.forEach((key, index) => {
      const user = key.user;
      console.log(`  ${index + 1}. ${key.cardId} - ${user?.firstName} ${user?.lastName} (${key.isActive ? 'Active' : 'Inactive'})`);
    });
    
    console.log('\n📈 Expected: 4 keys (one per user)');
    console.log('📉 Actual:', data.pagination?.total || 0, 'keys');
    
    if ((data.pagination?.total || 0) === 4) {
      console.log('🎉 SUCCESS: Now showing one key per user!');
    } else {
      console.log('⚠️  Still showing multiple keys per user');
    }
    
    // Test the 'all' status as well
    console.log('\n🔍 Testing with status=all...');
    const allResponse = await fetch('http://localhost:5000/api/location/cmfuzzxau0001g2ed7sjkwa6x/keys?status=all');
    const allData = await allResponse.json();
    console.log('Total with status=all:', allData.pagination?.total || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testKeysFix();