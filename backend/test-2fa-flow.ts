// test-2fa-flow.ts
// Complete 2FA flow test script

interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  challengeId?: string;
  token?: string;
  user?: any;
  message?: string;
}

interface VerifyResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

async function test2FAFlow() {
  console.log('🧪 Testing Complete 2FA Flow\n');
  console.log('============================\n');

  const baseUrl = 'http://localhost:5000/api';
  
  try {
    // Step 1: Login (should trigger 2FA)
    console.log('1️⃣  Testing login (should trigger 2FA)...');
    
    const loginPayload = {
      username: 'testuser2fa',
      password: 'TestPassword123!',
      projectId: 'acmecorp',
      cityName: 'Amsterdam'
    };

    console.log('Sending login request with payload:');
    console.log(JSON.stringify(loginPayload, null, 2));

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginPayload),
    });

    const loginData: LoginResponse = await loginResponse.json();
    
    console.log('\n📤 Login Response:');
    console.log(`Status: ${loginResponse.status}`);
    console.log(JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    if (!loginData.requiresTwoFactor) {
      console.log('❌ 2FA was not triggered. Check user configuration.');
      return;
    }

    if (!loginData.challengeId) {
      console.log('❌ No challenge ID returned');
      return;
    }

    console.log('\n✅ Login successful, 2FA challenge created!');
    console.log(`Challenge ID: ${loginData.challengeId}`);
    console.log('📱 SMS should be sent to your phone now...');

    // Step 2: Wait for user to enter 2FA code
    console.log('\n2️⃣  Enter the 6-digit code from SMS...');
    
    // In a real test, you'd need to manually enter the code
    // For now, we'll just show what the verify request should look like
    
    console.log('\n🔍 To complete 2FA verification, send this request:');
    console.log(`POST ${baseUrl}/auth/verify2fa`);
    console.log('Headers: Content-Type: application/json');
    console.log('Body:');
    console.log(JSON.stringify({
      challengeId: loginData.challengeId,
      code: 'ENTER_SMS_CODE_HERE'
    }, null, 2));

    console.log('\n✅ 2FA Flow Test Setup Complete!');
    console.log('\n📋 Summary:');
    console.log('- Login request sent ✅');
    console.log('- 2FA challenge created ✅');
    console.log('- SMS should be sent ✅');
    console.log('- Manual verification needed 📱');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('\n💡 Backend server is not running.');
      console.log('Start it with: npm run dev');
    }
  }
}

// Function to test if backend is running
async function checkBackendHealth() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('✅ Backend is running');
    console.log(`Health check: ${data.status}`);
    return true;
  } catch (error) {
    console.log('❌ Backend is not running');
    console.log('Start it with: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔐 2FA FLOW TEST');
  console.log('================\n');
  
  // Check if backend is running first
  const isBackendRunning = await checkBackendHealth();
  
  if (!isBackendRunning) {
    console.log('\n🚨 Please start the backend server first:');
    console.log('   cd backend && npm run dev');
    return;
  }

  console.log('');
  await test2FAFlow();
}

main().catch(console.error);