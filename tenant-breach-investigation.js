#!/usr/bin/env node

/**
 * TENANT ISOLATION BREACH INVESTIGATION
 * ====================================
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
}

async function investigateTenantBreach() {
  console.log('🚨 INVESTIGATING TENANT ISOLATION BREACH');
  console.log('========================================\n');

  // Wait for rate limiting to reset
  console.log('⏱️  Waiting for rate limiting to reset...');
  await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
  
  console.log('✅ Attempting login...');
  
  // Try to login with correct credentials
  const loginAttempts = [
    { 
      username: 'perfectitadmin', 
      password: 'Password123!', 
      projectId: 'perfectit', 
      cityName: 'Amsterdam',
      label: 'PerfectIT Admin'
    },
    { 
      username: 'acmeadmin', 
      password: 'Password123!', 
      projectId: 'acmecorp', 
      cityName: 'Amsterdam', 
      label: 'Acme Admin'
    }
  ];

  for (const attempt of loginAttempts) {
    console.log(`\n🔐 Testing login for ${attempt.label}...`);
    
    const loginResult = await makeRequest('POST', '/auth/login', {
      username: attempt.username,
      password: attempt.password,
      projectId: attempt.projectId,
      cityName: attempt.cityName
    });

    if (loginResult.success) {
      console.log(`✅ ${attempt.label} login successful`);
      const token = loginResult.data.token;
      const user = loginResult.data.user;
      
      console.log(`   User ID: ${user.id}`);
      console.log(`   Project-City ID: ${user.projectCityId}`);
      console.log(`   Role: ${user.role}`);
      
      // Check access logs for this user
      console.log(`\n📋 Checking access logs for ${attempt.label}...`);
      const logsResult = await makeRequest('GET', '/lock/access-logs?limit=10', null, token);
      
      if (logsResult.success) {
        const logs = logsResult.data.data || [];
        console.log(`   Found ${logs.length} access logs`);
        
        // Analyze the logs for tenant isolation issues
        const uniqueProjects = new Set();
        const userTenantIssues = [];
        
        logs.forEach((log, index) => {
          const lockLocation = log.lock?.location?.address;
          const logUser = log.user;
          const lockProjectCityId = lockLocation?.projectCityId;
          const userProjectCityId = logUser?.projectCityId;
          
          if (lockLocation) {
            uniqueProjects.add(lockLocation.projectCityId);
          }
          
          // Check for cross-tenant access
          if (lockProjectCityId && userProjectCityId && lockProjectCityId !== userProjectCityId) {
            userTenantIssues.push({
              logIndex: index,
              logUser: `${logUser?.firstName} ${logUser?.lastName}`,
              userTenant: userProjectCityId,
              lockTenant: lockProjectCityId,
              lockName: log.lock?.name,
              result: log.result
            });
          }
          
          if (index < 3) { // Show first 3 logs for analysis
            console.log(`   Log ${index + 1}:`);
            console.log(`     User: ${logUser?.firstName} ${logUser?.lastName} (${logUser?.projectCityId})`);
            console.log(`     Lock: ${log.lock?.name} (${lockProjectCityId})`);
            console.log(`     Result: ${log.result}`);
            console.log(`     Timestamp: ${log.timestamp}`);
          }
        });
        
        console.log(`\n🔍 Tenant Analysis for ${attempt.label}:`);
        console.log(`   Unique project-cities in logs: ${uniqueProjects.size}`);
        console.log(`   Cross-tenant issues found: ${userTenantIssues.length}`);
        
        if (userTenantIssues.length > 0) {
          console.log(`\n🚨 TENANT ISOLATION BREACHES DETECTED:`);
          userTenantIssues.slice(0, 5).forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue.logUser} (${issue.userTenant}) accessed ${issue.lockName} (${issue.lockTenant}) - ${issue.result}`);
          });
        }
        
        if (uniqueProjects.size > 1) {
          console.log(`\n⚠️  WARNING: Multiple project-cities visible in logs!`);
          console.log(`   Projects seen: ${Array.from(uniqueProjects).join(', ')}`);
        }
        
      } else {
        console.log(`❌ Failed to get access logs: ${logsResult.error?.error || logsResult.error}`);
      }
      
    } else {
      console.log(`❌ ${attempt.label} login failed: ${loginResult.error?.error || loginResult.error}`);
    }
  }
}

// Run the investigation
investigateTenantBreach().catch(error => {
  console.error(`\n❌ Investigation failed: ${error.message}`);
  process.exit(1);
});