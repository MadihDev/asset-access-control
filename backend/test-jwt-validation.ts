import AuthService from './src/services/auth.service'

async function testJWTValidation() {
  console.log('Testing JWT validation with tenant data...')

  try {
    // Test login and token validation
    const result = await AuthService.login({
      username: 'admin',
      password: 'password123',
      projectId: 'Default Project',
      cityName: 'Amsterdam'
    })

    console.log('Login result:', {
      username: result.user.username,
      projectCityId: result.user.projectCityId,
      role: result.user.role
    })

    // Validate the token
    const validatedUser = await AuthService.validateToken(result.accessToken)
    if (validatedUser) {
      console.log('✅ Token validation successful:', {
        username: validatedUser.username,
        projectCityId: validatedUser.projectCityId,
        role: validatedUser.role
      })
    } else {
      console.log('❌ Token validation failed')
    }

  } catch (error) {
    console.error('Test error:', error)
  }
}

testJWTValidation()
  .then(() => {
    console.log('\nJWT validation test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })