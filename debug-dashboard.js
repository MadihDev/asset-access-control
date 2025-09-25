// Quick debug script to test dashboard data
// This should be run after logging in to get an auth token

console.log('🔍 Dashboard Locations Debug Script');
console.log('');

// Get the token from localStorage (run this in browser console after login)
const token = localStorage.getItem('token');
if (!token) {
  console.error('❌ No auth token found. Please log in first.');
  console.log('💡 Instructions:');
  console.log('1. Open the frontend at http://localhost:5174');
  console.log('2. Log in with your credentials');
  console.log('3. Open browser console and run this script');
  throw new Error('Auth token required');
}

console.log('✅ Auth token found');

// Test the dashboard API
fetch('/api/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('📡 API Response Status:', response.status);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
})
.then(data => {
  console.log('📊 Dashboard Data:', data);
  
  if (data.success && data.data) {
    const stats = data.data;
    console.log('');
    console.log('🏢 LOCATIONS ANALYSIS:');
    console.log('=====================');
    
    if (!stats.locations) {
      console.log('❌ No locations property in response');
    } else if (!Array.isArray(stats.locations)) {
      console.log('❌ Locations is not an array:', typeof stats.locations);
    } else if (stats.locations.length === 0) {
      console.log('⚠️  Locations array is empty');
      console.log('   This might mean:');
      console.log('   - No addresses in database');
      console.log('   - User scope filters out all locations');
      console.log('   - City/tenant filtering issue');
    } else {
      console.log(`✅ Found ${stats.locations.length} locations:`);
      stats.locations.forEach((loc, index) => {
        console.log(`   ${index + 1}. ${loc.name}`);
        console.log(`      - Address ID: ${loc.addressId}`);
        console.log(`      - City ID: ${loc.cityId}`);
        console.log(`      - Total Locks: ${loc.totalLocks}`);
        console.log(`      - Active Locks: ${loc.activeLocks}`);
        console.log(`      - Active Users: ${loc.activeUsers}`);
        console.log(`      - Active Keys: ${loc.activeKeys}`);
        console.log(`      - Success Rate: ${loc.successRate}%`);
        console.log('');
      });
    }
    
    console.log('🔍 OTHER STATS:');
    console.log('================');
    console.log('- Total Users:', stats.totalUsers);
    console.log('- Total Locks:', stats.totalLocks);
    console.log('- Online Locks:', stats.onlineLocks);
    console.log('- Access Attempts:', stats.totalAccessAttempts);
    console.log('- Recent Access Logs:', stats.recentAccessLogs?.length || 0);
    
    if (stats.scope) {
      console.log('- Scope:', stats.scope);
    }
  }
})
.catch(error => {
  console.error('❌ Error fetching dashboard data:', error);
  console.log('');
  console.log('🛠️  Troubleshooting:');
  console.log('   1. Check if backend is running on port 5000');
  console.log('   2. Verify your auth token is valid');
  console.log('   3. Check browser network tab for detailed error');
  console.log('   4. Ensure database has seed data');
});