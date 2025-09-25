const axios = require('axios')

const API_BASE = 'http://localhost:5000/api'

async function testLocationEndpointsWithAuth() {
  try {
    console.log('🧪 TESTING LOCATION ENDPOINTS WITH AUTH')
    console.log('=' .repeat(50))
    
    // Step 1: Get project and city info
    console.log('\n📋 Getting project and city info...')
    const projectsResponse = await axios.get(`${API_BASE}/project`)
    const projects = projectsResponse.data.data
    
    const perfectitProject = projects.find(p => p.name === 'PerfectIT Solutions')
    if (!perfectitProject) {
      throw new Error('PerfectIT Solutions project not found')
    }
    
    const citiesResponse = await axios.get(`${API_BASE}/project/${perfectitProject.id}/cities`)
    const cities = citiesResponse.data.data
    
    const amsterdamCity = cities.find(c => c.name === 'Amsterdam')
    if (!amsterdamCity) {
      throw new Error('Amsterdam city not found')
    }
    
    console.log(`🏢 Using project: ${perfectitProject.name}`)
    console.log(`🌍 Using city: ${amsterdamCity.name}`)
    
    // Step 2: Login as Test User (Admin)
    console.log('\n🔐 Logging in as Test User (Admin)...')
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'testuser123',
      password: 'Password123!',
      projectId: perfectitProject.name,
      cityName: 'Amsterdam',
      cityId: amsterdamCity.id
    })
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.error)
    }
    
    const token = loginResponse.data.data.accessToken
    console.log('✅ Login successful, got token')
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    // Step 3: Get addresses
    console.log('\n📍 Getting addresses...')
    const addressResponse = await axios.get(`${API_BASE}/address`, { headers })
    
    if (!addressResponse.data.success) {
      throw new Error('Address fetch failed: ' + addressResponse.data.error)
    }
    
    const addresses = addressResponse.data.data
    const perfectitAddresses = addresses.filter(addr => 
      addr.street.includes('PerfectIT')
    )
    
    console.log(`✅ Found ${perfectitAddresses.length} PerfectIT addresses`)
    
    // Step 4: Test location endpoints for each address
    for (const address of perfectitAddresses.slice(0, 2)) {
      console.log(`\n🏢 Testing: ${address.street} ${address.number}`)
      console.log(`   👥 User count: ${address.userCount}`)
      console.log(`   🔑 Key count: ${address.keyCount}`)
      console.log(`   🔒 Lock count: ${address.lockCount}`)
      
      const addressId = address.id
      
      // Test users endpoint
      console.log(`\n🔍 Testing users endpoint...`)
      try {
        const usersResponse = await axios.get(`${API_BASE}/location/${addressId}/users`, { headers })
        if (usersResponse.data.success) {
          console.log(`✅ Users API returned ${usersResponse.data.data.length} users`)
          usersResponse.data.data.forEach(user => {
            console.log(`   👤 ${user.firstName} ${user.lastName} (${user.email})`)
          })
        } else {
          console.log(`❌ Users API failed: ${usersResponse.data.error}`)
        }
      } catch (error) {
        console.log(`❌ Users API error: ${error.response?.data?.message || error.message}`)
      }
      
      // Test keys endpoint
      console.log(`\n🔍 Testing keys endpoint...`)
      try {
        const keysResponse = await axios.get(`${API_BASE}/location/${addressId}/keys`, { headers })
        if (keysResponse.data.success) {
          console.log(`✅ Keys API returned ${keysResponse.data.data.length} keys`)
          keysResponse.data.data.forEach(key => {
            console.log(`   🗝️  ${key.firstName} ${key.lastName} - Card: ${key.cardNumber}`)
          })
        } else {
          console.log(`❌ Keys API failed: ${keysResponse.data.error}`)
        }
      } catch (error) {
        console.log(`❌ Keys API error: ${error.response?.data?.message || error.message}`)
      }
      
      // Test locks endpoint
      console.log(`\n🔍 Testing locks endpoint...`)
      try {
        const locksResponse = await axios.get(`${API_BASE}/location/${addressId}/locks`, { headers })
        if (locksResponse.data.success) {
          console.log(`✅ Locks API returned ${locksResponse.data.data.length} locks`)
          locksResponse.data.data.forEach(lock => {
            console.log(`   🔒 ${lock.name} (${lock.isActive ? 'Active' : 'Inactive'})`)
          })
        } else {
          console.log(`❌ Locks API failed: ${locksResponse.data.error}`)
        }
      } catch (error) {
        console.log(`❌ Locks API error: ${error.response?.data?.message || error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response) {
      console.error('   Response status:', error.response.status)
      console.error('   Response data:', error.response.data)
    }
  }
}

testLocationEndpointsWithAuth()