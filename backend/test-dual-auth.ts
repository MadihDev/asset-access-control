import AuthService from './src/services/auth.service'

async function testDualAuth() {
  console.log('Testing dual-mode authentication...')

  try {
    // Test 1: New project+city login
    console.log('\n1. Testing new project+city login...')
    try {
      const legacyResult = await AuthService.login({
        username: 'admin',
        password: 'password123',
        projectId: 'Default Project', // Use the actual project name
        cityName: 'Amsterdam'
      })
      console.log('✅ Project+city login successful:', {
        user: legacyResult.user.username,
        projectCityId: legacyResult.user.projectCityId
      })
    } catch (error) {
      console.log('❌ Legacy login failed:', (error as Error).message)
    }

    // Test 2: Alternative project+city login
    console.log('\n2. Testing alternative project+city login...')
    try {
      const newResult = await AuthService.login({
        username: 'manager',
        password: 'password123',
        projectId: 'Default Project', // Use the actual project name
        cityName: 'Rotterdam'
      })
      console.log('✅ Project+city login successful:', {
        user: newResult.user.username,
        projectCityId: newResult.user.projectCityId
      })
    } catch (error) {
      console.log('❌ Project+city login failed:', (error as Error).message)
    }

    // Test 3: Invalid combinations
    console.log('\n3. Testing invalid login attempts...')
    try {
      await AuthService.login({
        username: 'nonexistent',
        password: 'wrong'
      })
      console.log('❌ Should have failed - no cityId or project+city')
    } catch (error) {
      console.log('✅ Correctly rejected login without city info:', (error as Error).message)
    }

  } catch (error) {
    console.error('Test error:', error)
  }
}

testDualAuth()
  .then(() => {
    console.log('\nDual auth test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })