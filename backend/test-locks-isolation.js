const axios = require('axios');

async function testLocksIsolation() {
  console.log('🔒 Testing Locks Tenant Isolation...\n');

  try {
    // Test PerfectIT Administrator Locks
    console.log('📊 Testing PerfectIT Administrator Locks...');
    const perfectitLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'perfectitadmin',
      password: 'password123',
      projectId: 'PerfectIT Solutions',
      cityName: 'Amsterdam',
      cityId: 'cmfuhkvzb0000ez4f28vfb0a8'  // Amsterdam city ID
    });

    if (!perfectitLogin.data.success) {
      console.error('❌ PerfectIT login failed:', perfectitLogin.data);
      return;
    }

    const perfectitToken = perfectitLogin.data.data.accessToken;
    console.log('✅ PerfectIT login successful');

    const perfectitResponse = await axios.get('http://localhost:5000/api/lock', {
      headers: { Authorization: `Bearer ${perfectitToken}` },
      params: { activeOnly: 'false' } // Show all locks including inactive
    });

    console.log('PerfectIT Locks Data:');
    console.log('- Total Locks Count:', perfectitResponse.data.data.length);
    console.log('- Locks Details:');
    perfectitResponse.data.data.forEach((lock, index) => {
      console.log(`  ${index + 1}. ${lock.name} (ProjectCityId: ${lock.projectCityId}, City: ${lock.address?.city?.name}, Active: ${lock.isActive})`);
    });

    // Test Acme Administrator Locks
    console.log('\n📊 Testing Acme Administrator Locks...');
    const acmeLogin = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'acmeadmin',
      password: 'password123',
      projectId: 'Acme Corporation',
      cityName: 'Amsterdam',
      cityId: 'cmfuhkvzb0000ez4f28vfb0a8'  // Amsterdam city ID
    });

    if (!acmeLogin.data.success) {
      console.error('❌ Acme login failed:', acmeLogin.data);
      return;
    }

    const acmeToken = acmeLogin.data.data.accessToken;
    console.log('✅ Acme login successful');

    const acmeResponse = await axios.get('http://localhost:5000/api/lock', {
      headers: { Authorization: `Bearer ${acmeToken}` },
      params: { activeOnly: 'false' } // Show all locks including inactive
    });

    console.log('Acme Locks Data:');
    console.log('- Total Locks Count:', acmeResponse.data.data.length);
    console.log('- Locks Details:');
    acmeResponse.data.data.forEach((lock, index) => {
      console.log(`  ${index + 1}. ${lock.name} (ProjectCityId: ${lock.projectCityId}, City: ${lock.address?.city?.name}, Active: ${lock.isActive})`);
    });

    // Verify tenant isolation
    console.log('\n🔍 Locks Tenant Isolation Analysis:');
    
    const perfectitProjectCityId = perfectitLogin.data.data.user.projectCityId;
    const acmeProjectCityId = acmeLogin.data.data.user.projectCityId;
    
    console.log(`PerfectIT User ProjectCityId: ${perfectitProjectCityId}`);
    console.log(`Acme User ProjectCityId: ${acmeProjectCityId}`);
    
    // Check if PerfectIT sees only its own locks
    const perfectitLockProjectCities = perfectitResponse.data.data.map(lock => lock.projectCityId);
    const perfectitSeesOnlyOwnData = perfectitLockProjectCities.every(id => id === perfectitProjectCityId);
    console.log(`✅ PerfectIT sees only own locks: ${perfectitSeesOnlyOwnData}`);
    if (!perfectitSeesOnlyOwnData) {
      console.log(`   ❌ PerfectIT sees foreign project locks:`, perfectitLockProjectCities.filter(id => id !== perfectitProjectCityId));
    }
    
    // Check if Acme sees only its own locks
    const acmeLockProjectCities = acmeResponse.data.data.map(lock => lock.projectCityId);
    const acmeSeesOnlyOwnData = acmeLockProjectCities.every(id => id === acmeProjectCityId);
    console.log(`✅ Acme sees only own locks: ${acmeSeesOnlyOwnData}`);
    if (!acmeSeesOnlyOwnData) {
      console.log(`   ❌ Acme sees foreign project locks:`, acmeLockProjectCities.filter(id => id !== acmeProjectCityId));
    }
    
    // Test lock action isolation - try to access other project's lock
    console.log('\n🛡️ Testing Cross-Project Lock Access Protection:');
    
    if (perfectitResponse.data.data.length > 0 && acmeResponse.data.data.length > 0) {
      const perfectitLockId = perfectitResponse.data.data[0].id;
      const acmeLockId = acmeResponse.data.data[0].id;
      
      // Try PerfectIT admin accessing Acme lock (should fail)
      try {
        await axios.get(`http://localhost:5000/api/lock/${acmeLockId}`, {
          headers: { Authorization: `Bearer ${perfectitToken}` }
        });
        console.log('❌ SECURITY ISSUE: PerfectIT admin can access Acme lock!');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log('✅ PerfectIT admin cannot access Acme lock (404 - properly isolated)');
        } else {
          console.log('⚠️ Unexpected error accessing Acme lock:', error.response?.status);
        }
      }
      
      // Try Acme admin accessing PerfectIT lock (should fail)
      try {
        await axios.get(`http://localhost:5000/api/lock/${perfectitLockId}`, {
          headers: { Authorization: `Bearer ${acmeToken}` }
        });
        console.log('❌ SECURITY ISSUE: Acme admin can access PerfectIT lock!');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log('✅ Acme admin cannot access PerfectIT lock (404 - properly isolated)');
        } else {
          console.log('⚠️ Unexpected error accessing PerfectIT lock:', error.response?.status);
        }
      }
    }
    
    if (perfectitSeesOnlyOwnData && acmeSeesOnlyOwnData) {
      console.log('\n🎉 Locks tenant isolation is WORKING correctly!');
    } else {
      console.log('\n❌ Locks tenant isolation FAILED - cross-project data visible!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLocksIsolation();