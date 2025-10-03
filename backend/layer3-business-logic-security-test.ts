/**
 * LAYER 3: BUSINESS LOGIC SECURITY TESTING
 * Based on SECURITY_TESTING_METHODOLOGY.md
 * 
 * Tests the previously missed business logic vulnerabilities:
 * - Tenant Isolation
 * - Data Boundary Enforcement  
 * - Permission Logic
 * - Cross-Reference Validation
 */

import axios, { AxiosError } from 'axios'
import { PrismaClient } from '@prisma/client'

const API_BASE = 'http://localhost:5000/api'
const prisma = new PrismaClient()

interface TestResult {
  testName: string
  passed: boolean
  message: string
  details?: unknown
}

const testResults: TestResult[] = []

function logResult(testName: string, passed: boolean, message: string, details?: unknown) {
  testResults.push({ testName, passed, message, details })
  const emoji = passed ? '✅' : '❌'
  console.log(`${emoji} ${testName}: ${message}`)
  if (details && !passed) {
    console.log(`   Details:`, JSON.stringify(details, null, 2))
  }
}

// Test credentials from demo data
const TEST_USERS = {
  techcorp: {
    username: 'techcorp_admin',
    password: 'demo123',
    projectId: 'TechCorp Solutions',
    cityName: 'Amsterdam',
    expectedProjectCityId: 'pc1'
  },
  safeaccess: {
    username: 'safeaccess_admin', 
    password: 'demo123',
    projectId: 'SafeAccess Ltd',
    cityName: 'Rotterdam',
    expectedProjectCityId: 'pc3'
  },
  securebuildings: {
    username: 'secure_admin',
    password: 'demo123', 
    projectId: 'SecureBuildings Inc',
    cityName: 'Amsterdam',
    expectedProjectCityId: 'pc5'
  }
}

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

/**
 * TEST 1: TENANT ISOLATION VALIDATION
 * Verify that users can ONLY access their own tenant's data
 */
async function testTenantIsolation() {
  console.log('\n🔍 LAYER 3 TEST 1: Tenant Isolation Validation')
  
  const techCorpToken = await login(TEST_USERS.techcorp)
  const safeAccessToken = await login(TEST_USERS.safeaccess)
  
  if (!techCorpToken || !safeAccessToken) {
    logResult('Tenant Isolation Setup', false, 'Failed to get tokens for tenant isolation tests')
    return
  }

  // Test 1.1: Verify each tenant sees only their own projects
  try {
    const techCorpProjects = await axios.get(`${API_BASE}/tenant/projects`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const safeAccessProjects = await axios.get(`${API_BASE}/tenant/projects`, {
      headers: { Authorization: `Bearer ${safeAccessToken}` }
    })

    const techCorpProjectNames = techCorpProjects.data.data?.map((p: { name: string }) => p.name) || []
    const safeAccessProjectNames = safeAccessProjects.data.data?.map((p: { name: string }) => p.name) || []
    
    const techCorpIsolated = techCorpProjectNames.length === 1 && techCorpProjectNames.includes('TechCorp Solutions')
    const safeAccessIsolated = safeAccessProjectNames.length === 1 && safeAccessProjectNames.includes('SafeAccess Ltd')
    
    logResult('Project Tenant Isolation', techCorpIsolated && safeAccessIsolated,
      `TechCorp sees: [${techCorpProjectNames.join(',')}], SafeAccess sees: [${safeAccessProjectNames.join(',')}]`)

  } catch (error) {
    logResult('Project Tenant Isolation', false, `Failed to test project isolation: ${error}`)
  }

  // Test 1.2: Verify each tenant sees only their own cities  
  try {
    const techCorpCities = await axios.get(`${API_BASE}/tenant/cities`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const safeAccessCities = await axios.get(`${API_BASE}/tenant/cities`, {
      headers: { Authorization: `Bearer ${safeAccessToken}` }
    })

    const techCorpCityNames = techCorpCities.data.data?.map((c: { name: string }) => c.name) || []
    const safeAccessCityNames = safeAccessCities.data.data?.map((c: { name: string }) => c.name) || []
    
    const techCorpCityIsolated = techCorpCityNames.length === 1 && techCorpCityNames.includes('Amsterdam')
    const safeAccessCityIsolated = safeAccessCityNames.length === 1 && safeAccessCityNames.includes('Rotterdam')
    
    logResult('City Tenant Isolation', techCorpCityIsolated && safeAccessCityIsolated,
      `TechCorp sees: [${techCorpCityNames.join(',')}], SafeAccess sees: [${safeAccessCityNames.join(',')}]`)

  } catch (error) {
    logResult('City Tenant Isolation', false, `Failed to test city isolation: ${error}`)
  }
}

/**
 * TEST 2: DATA BOUNDARY ENFORCEMENT
 * Verify that data queries are properly scoped to tenant boundaries
 */
async function testDataBoundaryEnforcement() {
  console.log('\n🔍 LAYER 3 TEST 2: Data Boundary Enforcement')

  // Test 2.1: Database-level tenant scoping validation
  console.log('\n   🔍 Checking database-level tenant scoping...')
  
  // Get all users and verify they're properly scoped
  const allUsers = await prisma.user.findMany({
    include: {
      projectCity: {
        include: {
          project: true,
          city: true
        }
      }
    }
  })

  let tenantScopingValid = true
  const userTenantMap: Record<string, string> = {}
  
  allUsers.forEach(user => {
    if (user.projectCityId && user.projectCity) {
      const tenantKey = `${user.projectCity.project.name}/${user.projectCity.city.name}`
      userTenantMap[user.username] = tenantKey
    } else {
      tenantScopingValid = false
    }
  })

  logResult('Database User Tenant Scoping', tenantScopingValid,
    `All ${allUsers.length} users have valid tenant assignments`,
    userTenantMap)

  // Test 2.2: Verify no cross-tenant data relationships exist
  const projectCities = await prisma.projectCity.findMany({
    include: {
      users: true,
      project: true,
      city: true
    }
  })

  let crossTenantDataFound = false
  const tenantDataAnalysis: { tenantId: string; tenant: string; userCount: number; users: string[] }[] = []

  projectCities.forEach(pc => {
    const analysis = {
      tenantId: pc.id,
      tenant: `${pc.project.name}/${pc.city.name}`,
      userCount: pc.users.length,
      users: pc.users.map(u => u.username)
    }
    tenantDataAnalysis.push(analysis)
    
    // Check if any user belongs to multiple tenants (should not happen)
    pc.users.forEach(user => {
      const otherTenants = projectCities.filter(otherPc => 
        otherPc.id !== pc.id && 
        otherPc.users.some(otherUser => otherUser.id === user.id)
      )
      if (otherTenants.length > 0) {
        crossTenantDataFound = true
      }
    })
  })

  logResult('Cross-Tenant Data Validation', !crossTenantDataFound,
    `Verified ${projectCities.length} tenant boundaries with no cross-tenant user assignments`,
    tenantDataAnalysis)
}

/**
 * TEST 3: PERMISSION LOGIC VALIDATION
 * Verify that permission checks validate tenant scope
 */
async function testPermissionLogic() {
  console.log('\n🔍 LAYER 3 TEST 3: Permission Logic Validation')

  const techCorpToken = await login(TEST_USERS.techcorp)
  if (!techCorpToken) {
    logResult('Permission Logic Setup', false, 'Failed to get token for permission tests')
    return
  }

  // Test 3.1: User can access their own tenant context
  try {
    const context = await axios.get(`${API_BASE}/tenant/context`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    const tenantData = context.data.data
    const correctTenant = tenantData.project?.name === 'TechCorp Solutions' && 
                         tenantData.city?.name === 'Amsterdam'
    
    logResult('Own Tenant Context Access', correctTenant,
      `User can access own tenant: ${tenantData.project?.name}/${tenantData.city?.name}`)

  } catch (error) {
    logResult('Own Tenant Context Access', false, `Failed to access own tenant context: ${error}`)
  }

  // Test 3.2: User endpoints properly validate tenant boundaries
  try {
    const users = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${techCorpToken}` }
    })
    
    // Should either get filtered results or proper error
    if (users.data.data) {
      const userData = users.data.data
      const allUsersInSameTenant = userData.every((user: { projectCityId?: string }) => 
        user.projectCityId === 'pc1' || !user.projectCityId
      )
      
      logResult('User List Tenant Filtering', allUsersInSameTenant,
        `User list properly filtered: ${userData.length} users, all in same tenant: ${allUsersInSameTenant}`)
    }

  } catch (error) {
    const axiosError = error as AxiosError
    logResult('User List Tenant Filtering', axiosError.response?.status === 403,
      `User list access properly restricted: ${axiosError.response?.status}`)
  }
}

/**
 * TEST 4: CROSS-REFERENCE VALIDATION
 * Verify user-resource relationship checks enforce tenant boundaries
 */
async function testCrossReferenceValidation() {
  console.log('\n🔍 LAYER 3 TEST 4: Cross-Reference Validation')

  const techCorpToken = await login(TEST_USERS.techcorp)
  const safeAccessToken = await login(TEST_USERS.safeaccess)

  if (!techCorpToken || !safeAccessToken) {
    logResult('Cross-Reference Setup', false, 'Failed to get tokens for cross-reference tests')
    return
  }

  // Test 4.1: User cannot access another tenant's users by ID
  const allUsers = await prisma.user.findMany({
    where: { NOT: { projectCityId: 'pc1' } }, // Get users NOT in TechCorp tenant
    take: 1
  })

  if (allUsers.length > 0) {
    const otherTenantUserId = allUsers[0].id
    
    try {
      await axios.get(`${API_BASE}/users/${otherTenantUserId}`, {
        headers: { Authorization: `Bearer ${techCorpToken}` }
      })
      
      logResult('Cross-Tenant User Access', false, 
        'CRITICAL: TechCorp user could access another tenant\'s user!')
    } catch (error) {
      const axiosError = error as AxiosError
      const properlyBlocked = axiosError.response?.status === 403 || axiosError.response?.status === 404
      
      logResult('Cross-Tenant User Access', properlyBlocked,
        `Cross-tenant user access properly blocked: ${axiosError.response?.status}`)
    }
  }

  // Test 4.2: Verify tenant boundary middleware is working
  const testResourceIds = ['user3', 'user4'] // These should be in other tenants
  
  for (const resourceId of testResourceIds) {
    try {
      await axios.get(`${API_BASE}/users/${resourceId}`, {
        headers: { Authorization: `Bearer ${techCorpToken}` }
      })
      
      logResult(`Cross-Tenant Access ${resourceId}`, false,
        `CRITICAL: Could access ${resourceId} from different tenant!`)
    } catch (error) {
      const axiosError = error as AxiosError
      const properlyBlocked = axiosError.response?.status === 403 || axiosError.response?.status === 404
      
      logResult(`Cross-Tenant Access ${resourceId}`, properlyBlocked,
        `Resource ${resourceId} access properly blocked: ${axiosError.response?.status}`)
    }
  }
}

/**
 * MAIN TEST RUNNER FOR LAYER 3: BUSINESS LOGIC SECURITY
 */
async function runLayer3BusinessLogicTests() {
  console.log('🔒 LAYER 3: BUSINESS LOGIC SECURITY TESTING')
  console.log('================================================================')
  console.log('Testing previously missed business logic vulnerabilities')
  console.log('================================================================\n')

  await testTenantIsolation()
  await testDataBoundaryEnforcement()
  await testPermissionLogic()
  await testCrossReferenceValidation()

  // Summary
  console.log('\n📊 LAYER 3 BUSINESS LOGIC SECURITY SUMMARY')
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
  
  console.log('\n🎯 BUSINESS LOGIC SECURITY ASSESSMENT:')
  if (failedTests === 0) {
    console.log('🟢 EXCELLENT: All business logic security tests passed')
  } else if (failedTests <= 2) {
    console.log('🟡 GOOD: Minor business logic issues found')
  } else if (failedTests <= 5) {
    console.log('🟠 MODERATE: Several business logic issues need attention')
  } else {
    console.log('🔴 CRITICAL: Major business logic vulnerabilities detected')
  }
  
  await prisma.$disconnect()
  return failedTests === 0
}

// Run the tests
if (require.main === module) {
  runLayer3BusinessLogicTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Layer 3 test suite failed:', error)
      process.exit(1)
    })
}

export { runLayer3BusinessLogicTests }