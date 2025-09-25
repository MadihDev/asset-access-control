const axios = require('axios')

async function testLocationEndpoints() {
  try {
    console.log('🧪 TESTING LOCATION ENDPOINTS')
    console.log('=' .repeat(50))
    
    const baseUrl = 'http://localhost:5000/api'
    
    // Test address listing first
    console.log('\n📍 Testing address listing...')
    const addressResponse = await axios.get(`${baseUrl}/address`)
    const perfectitAddresses = addressResponse.data.filter(addr => 
      addr.street.includes('PerfectIT')
    )
    
    console.log(`✅ Found ${perfectitAddresses.length} PerfectIT addresses`)
    
    for (const address of perfectitAddresses.slice(0, 2)) {
      console.log(`\n🏢 Testing: ${address.street} ${address.number}`)
      console.log(`   👥 User count: ${address.userCount}`)
      console.log(`   🔑 Key count: ${address.keyCount}`)
      
      const addressId = address.id
      
      // Test users endpoint
      console.log(`\n🔍 Testing users endpoint...`)
      try {
        const usersResponse = await axios.get(`${baseUrl}/location/${addressId}/users`)
        console.log(`✅ Users API returned ${usersResponse.data.length} users`)
        usersResponse.data.forEach(user => {
          console.log(`   👤 ${user.firstName} ${user.lastName} (${user.email})`)
        })
      } catch (error) {
        console.log(`❌ Users API error: ${error.response?.data?.message || error.message}`)
      }
      
      // Test keys endpoint
      console.log(`\n🔍 Testing keys endpoint...`)
      try {
        const keysResponse = await axios.get(`${baseUrl}/location/${addressId}/keys`)
        console.log(`✅ Keys API returned ${keysResponse.data.length} keys`)
        keysResponse.data.forEach(key => {
          console.log(`   🗝️  ${key.firstName} ${key.lastName} - Card: ${key.cardNumber}`)
        })
      } catch (error) {
        console.log(`❌ Keys API error: ${error.response?.data?.message || error.message}`)
      }
      
      // Test locks endpoint
      console.log(`\n🔍 Testing locks endpoint...`)
      try {
        const locksResponse = await axios.get(`${baseUrl}/location/${addressId}/locks`)
        console.log(`✅ Locks API returned ${locksResponse.data.length} locks`)
        locksResponse.data.forEach(lock => {
          console.log(`   🔒 ${lock.name} (${lock.isActive ? 'Active' : 'Inactive'})`)
        })
      } catch (error) {
        console.log(`❌ Locks API error: ${error.response?.data?.message || error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testLocationEndpoints()