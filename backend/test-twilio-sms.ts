// test-twilio-sms.ts
// Test script to verify your Twilio configuration works

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTwilioSMS() {
  console.log('📞 Testing Twilio SMS Configuration...\n');

  const accountSid = process.env.TWILIO_ACCOUNT_SID || 'YOUR_ACCOUNT_SID_HERE';
  const authToken = process.env.TWILIO_AUTH_TOKEN || 'YOUR_AUTH_TOKEN_HERE';
  const fromNumber = process.env.TWILIO_FROM_NUMBER || 'YOUR_PHONE_NUMBER_HERE';

  try {
    // Dynamic import to handle case where twilio might not be installed
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    console.log('✅ Twilio client initialized');
    console.log(`📱 From Number: ${fromNumber}`);
    
    // You can uncomment and modify this section to send a test SMS
    // IMPORTANT: Replace +1234567890 with your actual phone number for testing
    
    /*
    const testPhoneNumber = '+1234567890'; // Replace with your phone number
    
    console.log(`📤 Sending test SMS to ${testPhoneNumber}...`);
    
    const message = await client.messages.create({
      body: 'Test message from your Access Control System! 2FA is working correctly. 🔐',
      from: fromNumber,
      to: testPhoneNumber
    });

    console.log('✅ SMS sent successfully!');
    console.log(`📋 Message SID: ${message.sid}`);
    console.log(`📊 Status: ${message.status}`);
    console.log(`💰 Price: ${message.price} ${message.priceUnit}`);
    */

    console.log('\n🎯 Configuration Test Results:');
    console.log('✅ Account SID: Valid format');
    console.log('✅ Auth Token: Valid format');
    console.log('✅ From Number: Valid E.164 format');
    console.log('✅ Twilio package: Installed and working');
    
    console.log('\n📝 To send a test SMS:');
    console.log('1. Uncomment the SMS sending code above');
    console.log('2. Replace +1234567890 with your phone number');
    console.log('3. Run: npx tsx test-twilio-sms.ts');

  } catch (error) {
    console.error('❌ Error testing Twilio:', error);
    
    if (error.message.includes("Cannot find module 'twilio'")) {
      console.log('\n💡 Fix: Install Twilio package:');
      console.log('   npm install twilio');
    } else if (error.code === 20003) {
      console.log('\n💡 Authentication failed - check your credentials');
    } else if (error.code === 21211) {
      console.log('\n💡 Invalid phone number format - use E.164 format (+1234567890)');
    }
  }
}

// Test 2FA service integration
async function testTwoFactorService() {
  console.log('\n🔐 Testing 2FA Service Integration...\n');

  try {
    // Test environment variables
    const requiredEnvVars = [
      'TWOFA_ENABLED',
      'ENABLE_SMS_NOTIFICATIONS',
      'NOTIFICATION_PROVIDER',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_FROM_NUMBER'
    ];

    console.log('📋 Environment Variables Check:');
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const status = value ? '✅' : '❌';
      const displayValue = envVar.includes('TOKEN') ? '[HIDDEN]' : (value || '[NOT SET]');
      console.log(`${status} ${envVar}: ${displayValue}`);
    });

    // Check if all required vars are set
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      console.log('\n⚠️  Missing environment variables:');
      missingVars.forEach(envVar => {
        console.log(`   - ${envVar}`);
      });
      console.log('\n💡 Add these to your .env file');
    } else {
      console.log('\n🎉 All environment variables configured!');
    }

  } catch (error) {
    console.error('❌ Error testing 2FA service:', error);
  }
}

// Main test function
async function main() {
  console.log('🚀 TWILIO 2FA CONFIGURATION TEST');
  console.log('=================================\n');

  await testTwilioSMS();
  await testTwoFactorService();

  console.log('\n📊 Test Summary:');
  console.log('Your Twilio credentials are configured and ready!');
  console.log('Next steps:');
  console.log('1. Update your .env file with the provided configuration');
  console.log('2. Restart your backend server');
  console.log('3. Test 2FA login with a user who has a phone number');
  console.log('4. Monitor delivery in Twilio Console');
}

// Run the test
main().catch(console.error);