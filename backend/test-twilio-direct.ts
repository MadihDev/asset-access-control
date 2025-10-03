import { TwilioSmsProvider } from './src/services/notification.service'

async function testTwilioDirectly() {
  console.log('🔍 Testing Twilio SMS Provider directly...\n')

  const phoneNumber = '+15005550006' // Twilio magic test number
  const testMessage = 'Your verification code is: 123456. This code expires in 5 minutes.'

  console.log('Testing direct Twilio SMS send:')
  console.log(`- To: ${phoneNumber}`)
  console.log(`- Message: ${testMessage}`)
  console.log(`- From: ${process.env.TWILIO_FROM_NUMBER}`)
  console.log()

  try {
    const twilioProvider = new TwilioSmsProvider()
    await twilioProvider.send(phoneNumber, testMessage)
    console.log('✅ Twilio SMS sent successfully!')
    console.log('📱 Check your phone for the message')
  } catch (error) {
    console.error('❌ Twilio SMS failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
  }
}

testTwilioDirectly()