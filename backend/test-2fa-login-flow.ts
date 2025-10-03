// test-2fa-login-flow.ts
// Test script to verify 2FA login flow is working

import api from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function test2FALoginFlow() {
  console.log('🧪 Testing 2FA Login Flow...\n')

  try {
    // Test credentials
    const credentials = {
      username: 'perfectitadmin',
      password: 'PerfectIT123!',
      projectId: 'perfect-it',
      cityName: 'Amsterdam'
    }

    console.log('1️⃣  Testing login with Perfect IT Admin...')
    console.log('Credentials:', JSON.stringify(credentials, null, 2))

    // Step 1: Login request
    const loginResponse = await api.post(`${API_BASE}/auth/login`, credentials)

    console.log('\n📤 Login Response:')
    console.log('Status:', loginResponse.status)
    console.log('Data:', JSON.stringify(loginResponse.data, null, 2))

    // Check if 2FA is required
    if (loginResponse.data.requiresTwoFactor) {
      console.log('\n✅ 2FA Flow Triggered Successfully!')
      console.log(`Challenge ID: ${loginResponse.data.challengeId}`)
      console.log(`Masked Phone: ${loginResponse.data.maskedPhone}`)
      console.log(`Expires In: ${loginResponse.data.expiresIn} seconds`)
      
      console.log('\n📱 SMS should be sent to the Moroccan phone number!')
      console.log('Next step: Use the challenge ID to verify with the 6-digit SMS code')
      
      console.log('\n🔍 To complete verification, use:')
      console.log(`POST ${API_BASE}/auth/verify2fa`)
      console.log('Body:', JSON.stringify({
        challengeId: loginResponse.data.challengeId,
        code: 'ENTER_SMS_CODE_HERE'
      }, null, 2))
      
    } else if (loginResponse.data.success && loginResponse.data.data) {
      console.log('\n❌ 2FA Not Triggered - User logged in directly!')
      console.log('This suggests 2FA is not properly configured for this user.')
      console.log('User data:', loginResponse.data.data.user)
      
    } else {
      console.log('\n❌ Unexpected login response')
      console.log('Response:', loginResponse.data)
    }

  } catch (error: any) {
    console.error('\n❌ Login Test Failed:')
    
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    } else if (error.request) {
      console.error('No response received - is the backend running?')
      console.error('Make sure backend is running on http://localhost:5000')
    } else {
      console.error('Error:', error.message)
    }
  }
}

// Test other users as well
async function testAllUsers() {
  const testUsers = [
    {
      name: 'Perfect IT Admin',
      credentials: {
        username: 'perfectitadmin',
        password: 'PerfectIT123!',
        projectId: 'perfect-it',
        cityName: 'Amsterdam'
      }
    },
    {
      name: 'Perfect IT User',
      credentials: {
        username: 'perfectituser',
        password: 'PerfectIT123!',
        projectId: 'perfect-it',
        cityName: 'Amsterdam'
      }
    },
    {
      name: '2FA Test User',
      credentials: {
        username: 'testuser2fa',
        password: 'TestPassword123!',
        projectId: 'acmecorp',
        cityName: 'Amsterdam'
      }
    }
  ]

  for (const testUser of testUsers) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`🧪 Testing: ${testUser.name}`)
    console.log(`${'='.repeat(50)}`)
    
    try {
      const response = await api.post(`${API_BASE}/auth/login`, testUser.credentials)
      
      if (response.data.requiresTwoFactor) {
        console.log(`✅ ${testUser.name}: 2FA Required ✓`)
        console.log(`   Challenge ID: ${response.data.challengeId}`)
        console.log(`   Masked Phone: ${response.data.maskedPhone}`)
      } else {
        console.log(`❌ ${testUser.name}: Direct Login (2FA Not Triggered)`)
      }
      
    } catch (error: any) {
      console.log(`❌ ${testUser.name}: Login Failed`)
      if (error.response) {
        console.log(`   Status: ${error.response.status}`)
        console.log(`   Error: ${error.response.data?.error || 'Unknown error'}`)
      }
    }
  }
}

// Main execution
async function main() {
  console.log('🔐 2FA LOGIN FLOW TEST')
  console.log('======================\n')
  
  // Check if backend is running
  try {
    const healthCheck = await api.get(`${API_BASE}/health`)
    console.log('✅ Backend is running')
    console.log(`Health status: ${healthCheck.data.status}\n`)
  } catch (error) {
    console.log('❌ Backend is not running on http://localhost:5000')
    console.log('Please start the backend with: npm run dev\n')
    return
  }

  // Test single user first
  await test2FALoginFlow()

  // Test all users
  console.log('\n\n🔍 Testing All Users for 2FA...')
  await testAllUsers()

  console.log('\n\n📊 Summary:')
  console.log('If 2FA is working correctly, all users should show "2FA Required"')
  console.log('If any show "Direct Login", check the 2FA configuration for that user')
}

main().catch(console.error)