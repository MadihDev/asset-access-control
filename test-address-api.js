const testAddressAPI = async () => {
  try {
    // Test without authentication first to see the endpoint structure
    const response = await fetch('http://localhost:5000/api/address', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', await response.text());
  } catch (error) {
    console.error('Error:', error);
  }
};

testAddressAPI();