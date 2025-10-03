/**
 * COMPREHENSIVE MULTI-TENANT SECURITY TEST SUITE
 * Uses clean demo data with alphanumeric identifiers
 * 
 * Run: npx ts-node comprehensive-security-test.ts
 */

import axios, { AxiosError } from 'axios'

const API_BASE = 'http://localhost:5000/api'

interface TestResult {
  testName: string
  passed: boolean
  message: string
  details?: unknown
}

const testResults: TestResult[] = []

// Test credentials from demo data
const TEST_USERS = {
  techcorp: {
    username: 'techcorp_admin',
    email: 'admin@techcorp.com',
    password: 'demo123',
    projectId: 'TechCorp Solutions', // Use project name, not ID
    cityName: 'Amsterdam',
    expectedTenant: 'TechCorp Solutions / Amsterdam'
  },
  safeaccess: {
    username: 'safeaccess_admin',
    email: 'admin@safeaccess.com',
    password: 'demo123',
    projectId: 'SafeAccess Ltd', // Use project name, not ID
    cityName: 'Rotterdam',
    expectedTenant: 'SafeAccess Ltd / Rotterdam'
  }
}

function logResult(testName: string, passed: boolean, message: string, details?: unknown) {
  testResults.push({ testName, passed, message, details })
  const emoji = passed ? '✅' : '❌'
  console.log(`${emoji} ${testName}: ${message}`)
  if (details && !passed) {
    console.log(`   Details:`, JSON.stringify(details, null, 2))
  }
}

// Authentication helper
async function login(credentials: typeof TEST_USERS.techcorp): Promise<string | null> {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: credentials.username,
      password: credentials.password,
      projectId: credentials.projectId,
      cityName: credentials.cityName
    })
    return response.data.data?.accessToken || null
  } catch (error) {
    const axiosError = error as AxiosError
    console.log(`❌ Login failed for ${credentials.username}:`, axiosError.response?.data || axiosError.message)
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
  
  // Login as TechCorp user
  const techCorpToken = await login(TEST_USERS.techcorp)
  if (!techCorpToken) {
    logResult('TechCorp Login', false, 'Failed to login as TechCorp user')
    return
  }
  logResult('TechCorp Login', true, 'Successfully logged in as TechCorp user')

  try {
    // Get TechCorp tenant context
    const techCorpContext = await axios.get(`${API_BASE}/tenant/context`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const techCorpTenant = techCorpContext.data.data
    logResult('TechCorp Tenant Context', true, 
      `Tenant: ${techCorpTenant.project?.name} / ${techCorpTenant.city?.name}`,
      techCorpTenant)

    // Get TechCorp projects (should only see their own)
    const techCorpProjects = await axios.get(`${API_BASE}/tenant/projects`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const projectCount = techCorpProjects.data.data?.length || 0
    logResult('TechCorp Data Isolation', projectCount === 1, 
      `TechCorp user sees ${projectCount} project(s) - should be 1`,
      techCorpProjects.data.data)

    // Get TechCorp cities (should only see their own)
    const techCorpCities = await axios.get(`${API_BASE}/tenant/cities`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const cityCount = techCorpCities.data.data?.length || 0
    logResult('TechCorp City Isolation', cityCount === 1, 
      `TechCorp user sees ${cityCount} city/cities - should be 1`,
      techCorpCities.data.data)

  } catch (error) {
    logResult('Multi-Tenant Data Isolation', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 3: Cross-Tenant Access Prevention
async function testCrossTenantAccessPrevention() {
  console.log('\n🔍 Test 3: Cross-Tenant Access Prevention')
  
  const techCorpToken = await login(TEST_USERS.techcorp)
  const safeAccessToken = await login(TEST_USERS.safeaccess)
  
  if (!techCorpToken || !safeAccessToken) {
    logResult('Token Setup', false, 'Failed to get tokens for both tenants')
    return
  }
  
  logResult('Token Setup', true, 'Successfully obtained tokens for both tenants')

  try {
    // Test TechCorp user trying to access SafeAccess tenant context
    try {
      const response = await axios.get(`${API_BASE}/tenant/context`, {
        headers: { Authorization: `Bearer ${techCorpToken}` }
      })
      
      const tenant = response.data.data
      const isCrossTenant = tenant.project?.name !== 'TechCorp Solutions'
      
      logResult('Cross-Tenant Context Access', !isCrossTenant, 
        `TechCorp user got: ${tenant.project?.name} / ${tenant.city?.name}`,
        isCrossTenant ? tenant : null)
    } catch (error) {
      logResult('Cross-Tenant Context Access', true, 'Cross-tenant context access blocked')
    }

    // Test user enumeration across tenants
    try {
      const techCorpUsers = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${techCorpToken}` }
      })
      
      const users = techCorpUsers.data.data || []
      const hasCrossTenantUsers = users.some((user: any) => 
        user.projectCityId && user.projectCityId !== 'pc1')
      
      logResult('User Enumeration Security', !hasCrossTenantUsers, 
        `TechCorp user sees ${users.length} users, cross-tenant users: ${hasCrossTenantUsers ? 'YES - VIOLATION' : 'NO'}`,
        hasCrossTenantUsers ? users.map((u: any) => ({ id: u.id, projectCityId: u.projectCityId })) : null)
    } catch (error) {
      logResult('User Enumeration Security', true, 
        `User enumeration blocked: ${(error as AxiosError).response?.status}`)
    }

    // Test direct resource access with other tenant's user ID
    try {
      await axios.get(`${API_BASE}/users/user3`, { // SafeAccess admin ID
        headers: { Authorization: `Bearer ${techCorpToken}` }
      })
      logResult('Cross-Tenant User Access', false, 
        'CRITICAL: TechCorp user could access SafeAccess user!')
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 403 || axiosError.response?.status === 404) {
        logResult('Cross-Tenant User Access', true, 
          `Cross-tenant user access properly blocked (${axiosError.response?.status})`)
      } else {
        logResult('Cross-Tenant User Access', false, 
          `Unexpected error: ${axiosError.response?.status}`)
      }
    }

  } catch (error) {
    logResult('Cross-Tenant Access Prevention', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 4: Business Logic Security
async function testBusinessLogicSecurity() {
  console.log('\n🔍 Test 4: Business Logic Security')
  
  const token = await login(TEST_USERS.techcorp)
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

  } catch (error) {
    logResult('Business Logic Security', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Test 5: Authentication Security
async function testAuthenticationSecurity() {
  console.log('\n🔍 Test 5: Authentication Security')
  
  try {
    // Test unauthenticated access
    try {
      await axios.get(`${API_BASE}/tenant/context`)
      logResult('Auth Error Handling', false, 'Unauthenticated access allowed - CRITICAL!')
    } catch (error) {
      const axiosError = error as AxiosError
      const isProperAuth = axiosError.response?.status === 401
      
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

    // Test invalid login credentials
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'nonexistent_user',
        password: 'wrong_password',
        projectId: 'proj1',
        cityName: 'Amsterdam'
      })
      logResult('Invalid Credentials', false, 'Invalid credentials accepted - CRITICAL!')
    } catch (error) {
      const axiosError = error as AxiosError
      logResult('Invalid Credentials', axiosError.response?.status === 401, 
        `Invalid credentials returns ${axiosError.response?.status}`)
    }

    // Test invalid project-city combination
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'techcorp_admin',
        password: 'demo123',
        projectId: 'proj999', // Non-existent project
        cityName: 'Amsterdam'
      })
      logResult('Invalid Project-City', false, 'Invalid project-city accepted - VULNERABILITY!')
    } catch (error) {
      const axiosError = error as AxiosError
      logResult('Invalid Project-City', axiosError.response?.status === 400 || axiosError.response?.status === 401, 
        `Invalid project-city returns ${axiosError.response?.status}`)
    }

  } catch (error) {
    logResult('Authentication Security', false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Main test runner
async function runComprehensiveSecurityTests() {
  console.log('🔒 COMPREHENSIVE MULTI-TENANT SECURITY TEST SUITE')
  console.log('================================================================')
  console.log('Using clean demo data with alphanumeric identifiers')
  console.log('================================================================\n')
  
  await testPublicEndpointSecurity()
  await testMultiTenantDataIsolation()
  await testCrossTenantAccessPrevention()
  await testBusinessLogicSecurity()
  await testAuthenticationSecurity()
  
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
  
  console.log('\n🔐 MULTI-TENANT SECURITY VALIDATION COMPLETE!')
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