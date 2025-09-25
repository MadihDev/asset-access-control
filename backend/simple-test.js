async function simpleTest() {
  console.log('Testing basic API connection...')
  
  try {
    const response = await fetch('http://localhost:5000/api/health')
    const text = await response.text()
    console.log('Health endpoint response:', text)
  } catch (error) {
    console.error('Health test failed:', error)
  }

  try {
    console.log('\nTesting cities endpoint...')
    const response = await fetch('http://localhost:5000/api/city')
    const data = await response.json()
    console.log('Cities response:', data)
  } catch (error) {
    console.error('Cities test failed:', error)
  }
}

simpleTest()