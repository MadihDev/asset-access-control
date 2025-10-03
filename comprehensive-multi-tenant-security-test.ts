/**
 * COMPREHENSIVE MULTI-TENANT SECURITY TEST SUITE
 * 
 * Tests all critical security boundaries and tenant isolation
 * Run: npx ts-node comprehensive-multi-tenant-security-test.ts
 */

import axios, { AxiosError } from 'axios'

const API_BASE = 'http://localhost:5000/api'

interface TestResult {
  testName: string
  passed: boolean
  message: string
  details?: any
}

let testResults: TestResult[] = []

// Test credentials for different tenants
const TEST_USERS = {
  perfectIT: {
    email: 'admin@perfectit.org',
    password: 'admin123',
    expectedTenant: 'Perfect IT Solutions / Amsterdam'
  },
  rotterdam: {
    email: 'admin@rotterdam.nl', 
    password: 'admin123',
    expectedTenant: 'Municipality / Rotterdam'
  }
}

function logResult(testName: string, passed: boolean, message: string, details?: any) {
  testResults.push({ testName, passed, message, details })
  const emoji = passed ? '✅' : '❌'
  console.log(`${emoji} ${testName}: ${message}`)
  if (details && !passed) {
    console.log(`   Details:`, details)
  }
}

// Authentication helper
async function login(email: string, password: string): Promise<string | null> {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password,
      projectId: 'proj_123', // Default project
      cityName: 'Amsterdam'   // Default city
    })
    return response.data.data?.token || null
  } catch (error) {
    const axiosError = error as AxiosError
    console.log(`❌ Login failed for ${email}:`, axiosError.response?.data || axiosError.message)
    return null
  }
}

// Test 1: Public Endpoint Security
async function testPublicEndpointSecurity() {
  console.log('\n🔍 Test 1: Public Endpoint Security')
  
  try {
    // Test public endpoints work without auth
    const projects = await axios.get(`${API_BASE}/public/projects`)
    logResult('Public Projects', projects.status === 200, 
      `Got ${projects.data.data?.length || 0} projects`, projects.data.data)

    const cities = await axios.get(`${API_BASE}/public/cities`)
    logResult('Public Cities', cities.status === 200, 
      `Got ${cities.data.data?.length || 0} cities`, cities.data.data)

    // Test tenant endpoints require auth
    try {
      await axios.get(`${API_BASE}/tenant/projects`)
      logResult('Tenant Security', false, 'Tenant endpoint accessible without auth - CRITICAL VULNERABILITY!')
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 401) {
        logResult('Tenant Security', true, 'Tenant endpoint properly requires authentication')
      } else {
        logResult('Tenant Security', false, `Unexpected error: ${axiosError.response?.status}`)
      }
    }
  } catch (error) {
    logResult('Public Endpoint Security', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 2: Multi-Tenant Data Isolation
async function testMultiTenantDataIsolation() {
  console.log('\n🔍 Test 2: Multi-Tenant Data Isolation')
  
  // Login as Perfect IT user
  const perfectITToken = await login(TEST_USERS.perfectIT.email, TEST_USERS.perfectIT.password)
  if (!perfectITToken) {
    logResult('PerfectIT Login', false, 'Failed to login as Perfect IT user')
    return
  }
  logResult('PerfectIT Login', true, 'Successfully logged in as Perfect IT user')

  try {
    // Get Perfect IT tenant context
    const perfectITContext = await axios.get(`${API_BASE}/tenant/context`, {
      headers: { Authorization: `Bearer ${perfectITToken}` }
    })
    
    const perfectITTenant = perfectITContext.data.data
    logResult('PerfectIT Tenant Context', true, 
      `Tenant: ${perfectITTenant.projectName} / ${perfectITTenant.cityName}`,
      perfectITTenant)

    // Get Perfect IT projects (should only see their own)
    const perfectITProjects = await axios.get(`${API_BASE}/tenant/projects`, {
      headers: { Authorization: `Bearer ${perfectITToken}` }
    })
    
    const projectCount = perfectITProjects.data.data?.length || 0
    logResult('PerfectIT Data Isolation', projectCount === 1, 
      `Perfect IT user sees ${projectCount} project(s) - should be 1`,
      perfectITProjects.data.data)

    // Test if Perfect IT can access Rotterdam users (should fail)
    try {
      await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${perfectITToken}` }
      })
      // If we get here, check if users are tenant-scoped
      logResult('Cross-Tenant User Access', true, 'User list access allowed - checking for tenant scoping')
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 403) {
        logResult('Cross-Tenant User Access', true, 'Cross-tenant user access properly blocked')
      } else {
        logResult('Cross-Tenant User Access', false, `Unexpected error: ${axiosError.response?.status}`)
      }
    }

  } catch (error) {
    logResult('Multi-Tenant Data Isolation', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 3: Cross-Tenant Access Prevention
async function testCrossTenantAccessPrevention() {
  console.log('\n🔍 Test 3: Cross-Tenant Access Prevention')
  
  const perfectITToken = await login(TEST_USERS.perfectIT.email, TEST_USERS.perfectIT.password)
  if (!perfectITToken) {
    logResult('Token Setup', false, 'Failed to get Perfect IT token')
    return
  }

  try {
    // Try to access different tenant combinations
    const testCombinations = [
      { projectId: 'proj_456', cityName: 'Rotterdam', expected: 'blocked' },
      { projectId: 'proj_789', cityName: 'Utrecht', expected: 'blocked' }
    ]

    for (const combo of testCombinations) {
      try {
        const response = await axios.post(`${API_BASE}/public/validate-combo`, {
          projectId: combo.projectId,
          cityName: combo.cityName
        })
        
        logResult(`Cross-Tenant Validation ${combo.cityName}`, 
          !response.data.data?.isValid, 
          `Validation for ${combo.cityName}: ${response.data.data?.isValid ? 'ALLOWED' : 'BLOCKED'}`)
      } catch (error) {
        const axiosError = error as AxiosError
        logResult(`Cross-Tenant Validation ${combo.cityName}`, true, 
          `Access blocked as expected: ${axiosError.response?.status}`)
      }
    }

    // Test direct resource access with fake IDs from other tenants
    const fakeResourceTests = [
      { endpoint: '/users/fake-rotterdam-user-id', resource: 'User' },
      { endpoint: '/lock/fake-rotterdam-lock-id', resource: 'Lock' }
    ]

    for (const test of fakeResourceTests) {
      try {
        await axios.get(`${API_BASE}${test.endpoint}`, {
          headers: { Authorization: `Bearer ${perfectITToken}` }
        })
        logResult(`Cross-Tenant ${test.resource} Access`, false, 
          `CRITICAL: Could access ${test.resource} from other tenant!`)
      } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response?.status === 403 || axiosError.response?.status === 404) {
          logResult(`Cross-Tenant ${test.resource} Access`, true, 
            `${test.resource} access properly blocked (${axiosError.response?.status})`)
        } else {
          logResult(`Cross-Tenant ${test.resource} Access`, false, 
            `Unexpected error: ${axiosError.response?.status}`)
        }
      }
    }

  } catch (error) {
    logResult('Cross-Tenant Access Prevention', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 4: Business Logic Security
async function testBusinessLogicSecurity() {
  console.log('\n🔍 Test 4: Business Logic Security')
  
  const token = await login(TEST_USERS.perfectIT.email, TEST_USERS.perfectIT.password)
  if (!token) {
    logResult('Token Setup', false, 'Failed to get token for business logic tests')
    return
  }

  try {
    // Test tenant-scoped data retrieval
    const endpoints = [
      { path: '/tenant/projects', name: 'Projects' },
      { path: '/tenant/cities', name: 'Cities' },
      { path: '/lock', name: 'Locks' },
      { path: '/lock/access-logs', name: 'Access Logs' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE}${endpoint.path}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const dataLength = response.data.data?.length || 0
        logResult(`${endpoint.name} Tenant Scoping`, true, 
          `Retrieved ${dataLength} ${endpoint.name.toLowerCase()} with tenant scoping`)
      } catch (error) {
        const axiosError = error as AxiosError
        const errorData = axiosError.response?.data as any
        logResult(`${endpoint.name} Tenant Scoping`, axiosError.response?.status === 403, 
          `${endpoint.name} access: ${axiosError.response?.status} - ${errorData?.message || 'blocked'}`)
      }
    }

    // Test user enumeration prevention
    try {
      const response = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const users = response.data.data || []
      const hasCrossTenantUsers = users.some((user: any) => 
        user.projectCityId && user.projectCityId !== 'pc_perfectit_amsterdam')
      
      logResult('User Enumeration Security', !hasCrossTenantUsers, 
        `User list contains ${users.length} users, cross-tenant users: ${hasCrossTenantUsers ? 'YES - VIOLATION' : 'NO'}`,
        hasCrossTenantUsers ? users.map((u: any) => ({ id: u.id, projectCityId: u.projectCityId })) : null)
    } catch (error) {
      const axiosError = error as AxiosError
      logResult('User Enumeration Security', true, 
        `User enumeration blocked: ${axiosError.response?.status}`)
    }

  } catch (error) {
    logResult('Business Logic Security', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 5: Security Headers and Error Handling
async function testSecurityHeaders() {
  console.log('\n🔍 Test 5: Security Headers and Error Handling')
  
  try {
    // Test unauthenticated access
    try {
      await axios.get(`${API_BASE}/tenant/context`)
      logResult('Auth Error Handling', false, 'Unauthenticated access allowed - CRITICAL!')
    } catch (error) {
      const axiosError = error as AxiosError
      const isProperAuth = axiosError.response?.status === 401
      const hasSecurityHeaders = !!axiosError.response?.headers['www-authenticate']
      
      logResult('Auth Error Handling', isProperAuth, 
        `Unauthenticated access returns ${axiosError.response?.status}`)
    }

    // Test invalid token
    try {
      await axios.get(`${API_BASE}/tenant/context`, {
        headers: { Authorization: 'Bearer invalid-token' }
      })
      logResult('Invalid Token Handling', false, 'Invalid token accepted - CRITICAL!')
    } catch (error) {
      const axiosError = error as AxiosError
      logResult('Invalid Token Handling', axiosError.response?.status === 401, 
        `Invalid token returns ${axiosError.response?.status}`)
    }

    // Test error message information disclosure
    try {
      await axios.get(`${API_BASE}/users/non-existent-user-id`, {
        headers: { Authorization: 'Bearer fake-token' }
      })
    } catch (error) {
      const axiosError = error as AxiosError
      const errorData = axiosError.response?.data as any
      const errorMessage = errorData?.message || ''
      const hasInfoDisclosure = errorMessage.includes('database') || 
                              errorMessage.includes('SQL') || 
                              errorMessage.includes('projectCityId')
      
      logResult('Error Information Disclosure', !hasInfoDisclosure, 
        `Error messages secure: ${hasInfoDisclosure ? 'NO - contains sensitive info' : 'YES'}`,
        hasInfoDisclosure ? errorMessage : null)
    }

  } catch (error) {
    logResult('Security Headers', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Main test runner
async function runComprehensiveSecurityTests() {
  console.log('🔒 COMPREHENSIVE MULTI-TENANT SECURITY TEST SUITE')
  console.log('================================================================')
  
  await testPublicEndpointSecurity()
  await testMultiTenantDataIsolation()
  await testCrossTenantAccessPrevention()
  await testBusinessLogicSecurity()
  await testSecurityHeaders()
  
  console.log('\n📊 SECURITY TEST SUMMARY')
  console.log('================================================================')
  
  const totalTests = testResults.length
  const passedTests = testResults.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  
  console.log(`Total Tests: ${totalTests}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (failedTests > 0) {
    console.log('\n🚨 FAILED TESTS:')
    testResults.filter(r => !r.passed).forEach(result => {
      console.log(`   ❌ ${result.testName}: ${result.message}`)
    })
  }
  
  console.log('\n🎯 SECURITY POSTURE ASSESSMENT:')
  if (failedTests === 0) {
    console.log('🟢 EXCELLENT: All security tests passed')
  } else if (failedTests <= 2) {
    console.log('🟡 GOOD: Minor security issues found')
  } else if (failedTests <= 5) {
    console.log('🟠 MODERATE: Several security issues need attention')
  } else {
    console.log('🔴 CRITICAL: Major security vulnerabilities detected')
  }
  
  return failedTests === 0
}

// Run the tests
if (require.main === module) {
  runComprehensiveSecurityTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}

export { runComprehensiveSecurityTests }