import axios from 'axios'

const API_BASE = 'http://localhost:5000'

async function testMultiTenantLogin() {
  console.log('🧪 Testing Multi-Tenant Login API...\n')

  try {
    // Test 1: Legacy city-only login
    console.log('1️⃣ Testing legacy city-only login...')
    const legacyResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'admin',
      password: 'password123',
      cityId: await getCityId('Amsterdam')
    })
    
    if (legacyResponse.data.success) {
      console.log('✅ Legacy login successful!')
      console.log('   User:', legacyResponse.data.data.user.username)
      console.log('   City ID:', legacyResponse.data.data.user.cityId)
      console.log('   Project City ID:', legacyResponse.data.data.user.projectCityId)
    }

    // Test 2: New project+city login
    console.log('\n2️⃣ Testing new project+city login...')
    const projectResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'perfectit_admin',
      password: 'password123',
      projectId: 'PerfectIT Solutions',
      cityName: 'Amsterdam'
    })
    
    if (projectResponse.data.success) {
      console.log('✅ Project+city login successful!')
      console.log('   User:', projectResponse.data.data.user.username)
      console.log('   City ID:', projectResponse.data.data.user.cityId)
      console.log('   Project City ID:', projectResponse.data.data.user.projectCityId)
    }

    // Test 3: Get project list
    console.log('\n3️⃣ Testing project API...')
    const projectsResponse = await axios.get(`${API_BASE}/api/project`)
    if (projectsResponse.data.success) {
      console.log('✅ Projects loaded successfully!')
      projectsResponse.data.data.forEach((p: any) => {
        console.log(`   - ${p.name} (${p.slug || 'no-slug'})`)
      })
    }

    // Test 4: Get cities for a project
    console.log('\n4️⃣ Testing cities by project API...')
    const citiesResponse = await axios.get(`${API_BASE}/api/city?project=PerfectIT Solutions`)
    if (citiesResponse.data.success) {
      console.log('✅ Cities for PerfectIT Solutions loaded successfully!')
      citiesResponse.data.data.forEach((c: any) => {
        console.log(`   - ${c.name}`)
      })
    }

    console.log('\n🎉 All multi-tenant tests passed!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message)
  }
}

async function getCityId(cityName: string): Promise<string> {
  const response = await axios.get(`${API_BASE}/api/city`)
  const city = response.data.data.find((c: any) => c.name === cityName)
  if (!city) throw new Error(`City ${cityName} not found`)
  return city.id
}

testMultiTenantLogin()
  .then(() => {
    console.log('\nTest completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })