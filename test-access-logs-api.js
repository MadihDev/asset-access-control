const axios = require('axios');

async function testAccessLogsAPI() {
  try {
    console.log('� Getting projects...');
    const projectsResponse = await axios.get('http://localhost:5000/api/project');
    const projects = projectsResponse.data.data;
    
    // Find PerfectIT Solutions project
    const perfectItProject = projects.find(p => p.slug === 'perfectit-solutions');
    if (!perfectItProject) {
      throw new Error('PerfectIT Solutions project not found');
    }
    
    console.log('🏢 Found PerfectIT project:', perfectItProject.id);
    
    // Get cities for this project
    console.log('🌍 Getting cities for PerfectIT project...');
    const citiesResponse = await axios.get(`http://localhost:5000/api/project/${perfectItProject.id}/cities`);
    const cities = citiesResponse.data.data;
    
    // Find Amsterdam
    const amsterdam = cities.find(city => city.name === 'Amsterdam');
    if (!amsterdam) {
      console.log('Available cities:', cities.map(c => c.name));
      throw new Error('Amsterdam city not found');
    }
    
    console.log('🏙️ Found Amsterdam with ID:', amsterdam.id);
    
    console.log('🔐 Testing login...');
    
    // Login with projectId and cityName (as the error message suggests)
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: perfectItProject.name, // Use project name, not ID
      cityName: amsterdam.name,
      cityId: amsterdam.id  // Also include cityId for validation
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.accessToken;
    console.log('🎫 Token received');
    
    // Test access logs API
    console.log('🔍 Testing access logs API...');
    const logsResponse = await axios.get('http://localhost:5000/api/lock/access-logs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Access logs API successful');
    console.log('📊 Response data:', JSON.stringify(logsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAccessLogsAPI();