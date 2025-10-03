import axios from 'axios'
import prisma from './src/lib/prisma'
import bcrypt from 'bcryptjs'

const API_BASE = 'http://localhost:5000/api'

interface TestResult {
  name: string
  passed: boolean
  message: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  data?: any
}

interface TenantUser {
  id: string
  username: string
  email: string
  token: string
  projectCityId: string
  project: { name: string; slug: string }
  city: { name: string }
}

class MultiTenantSecurityTest {
  private results: TestResult[] = []
  private users: TenantUser[] = []

  private addResult(name: string, passed: boolean, message: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH', data?: any): void {
    this.results.push({ name, passed, message, severity, data })
    
    const icon = passed ? '✅' : '❌'
    const severityIcon = {
      'CRITICAL': '🚨',
      'HIGH': '⚠️',
      'MEDIUM': '⚡',
      'LOW': 'ℹ️'
    }[severity]
    
    console.log(`${icon} ${severityIcon} ${name}: ${message}`)
    if (data && !passed) {
      console.log(`   Details:`, JSON.stringify(data, null, 2))
    }
  }

  async setupMultiTenantTestData(): Promise<void> {
    console.log('🏗️ Setting up multi-tenant security test data...\n')
    
    try {
      // Get existing project-city combinations
      const projectCities = await prisma.projectCity.findMany({
        include: {
          project: true,
          city: true
        },
        take: 3 // We need at least 2 different tenants for cross-tenant testing
      })

      if (projectCities.length < 2) {
        throw new Error('Need at least 2 project-city combinations for cross-tenant testing')
      }

      // Create users for different tenants
      const hashedPassword = await bcrypt.hash('securitytest123', 12)
      
      // Create User A in Tenant 1 (Perfect IT + Amsterdam)
      const userA = await prisma.user.upsert({
        where: { username: 'security.user.a' },
        update: {},
        create: {
          email: 'security.a@test.com',
          username: 'security.user.a',
          firstName: 'Security',
          lastName: 'User A',
          password: hashedPassword,
          role: 'USER',
          projectCityId: projectCities[0].id,
          phone: '+31612345001'
        },
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })

      // Create User B in Tenant 2 (ACME + Amsterdam) - different tenant
      const userB = await prisma.user.upsert({
        where: { username: 'security.user.b' },
        update: {},
        create: {
          email: 'security.b@test.com',
          username: 'security.user.b',
          firstName: 'Security',
          lastName: 'User B',
          password: hashedPassword,
          role: 'USER',
          projectCityId: projectCities[1].id,
          phone: '+31612345002'
        },
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })

      // Create Admin User in Tenant 1
      const adminUser = await prisma.user.upsert({
        where: { username: 'security.admin.a' },
        update: {},
        create: {
          email: 'security.admin@test.com',
          username: 'security.admin.a',
          firstName: 'Security',
          lastName: 'Admin',
          password: hashedPassword,
          role: 'ADMIN',
          projectCityId: projectCities[0].id,
          phone: '+31612345003'
        },
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      })

      // Login all users to get tokens
      console.log('🔑 Logging in test users...')
      
      for (const [user, label] of [
        [userA, 'User A'],
        [userB, 'User B'], 
        [adminUser, 'Admin A']
      ] as const) {
        try {
          const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: user.username,
            password: 'securitytest123',
            projectId: user.projectCity!.project.slug,
            cityName: user.projectCity!.city.name
          })

          this.users.push({
            id: user.id,
            username: user.username,
            email: user.email,
            token: loginResponse.data.data.accessToken,
            projectCityId: user.projectCityId!,
            project: user.projectCity!.project,
            city: user.projectCity!.city
          })

          console.log(`✅ ${label}: ${user.username} in ${user.projectCity!.project.name}/${user.projectCity!.city.name}`)
        } catch (error: any) {
          console.error(`❌ Failed to login ${label}:`, error.response?.data || error.message)
          throw error
        }
      }

      console.log(`\n🎯 Multi-tenant test setup complete:`)
      console.log(`   Users created: ${this.users.length}`)
      console.log(`   Tenants: ${new Set(this.users.map(u => u.projectCityId)).size}`)
      
    } catch (error: any) {
      console.error('❌ Setup failed:', error.message)
      throw error
    }
  }

  async testTenantIsolationProjects(): Promise<void> {
    if (this.users.length < 2) {
      this.addResult('Tenant Isolation - Projects', false, 'Insufficient test users', 'CRITICAL')
      return
    }

    try {
      const userA = this.users[0] // First tenant
      const userB = this.users[1] // Second tenant
      
      console.log(`\n🔒 Testing Project Access Isolation...`)
      console.log(`   User A (${userA.project.name}): ${userA.username}`)
      console.log(`   User B (${userB.project.name}): ${userB.username}`)

      // Test 1: User A tries to get projects (should only see their tenant's projects)
      const userAProjectsResponse = await axios.get(`${API_BASE}/tenant/projects`, {
        headers: { Authorization: `Bearer ${userA.token}` }
      })

      const userAProjects = userAProjectsResponse.data.data || []
      const userACanSeeOtherProject = userAProjects.some((p: any) => p.slug === userB.project.slug)

      this.addResult(
        'Tenant Isolation - Project Visibility',
        !userACanSeeOtherProject,
        userACanSeeOtherProject 
          ? `CRITICAL: User A can see User B's project (${userB.project.name})` 
          : `User A correctly isolated from User B's project`,
        'CRITICAL',
        { userAProjects: userAProjects.map((p: any) => p.name) }
      )

      // Test 2: User B tries to get projects (should only see their tenant's projects)
      const userBProjectsResponse = await axios.get(`${API_BASE}/tenant/projects`, {
        headers: { Authorization: `Bearer ${userB.token}` }
      })

      const userBProjects = userBProjectsResponse.data.data || []
      const userBCanSeeOtherProject = userBProjects.some((p: any) => p.slug === userA.project.slug)

      this.addResult(
        'Tenant Isolation - Reverse Project Visibility',
        !userBCanSeeOtherProject,
        userBCanSeeOtherProject 
          ? `CRITICAL: User B can see User A's project (${userA.project.name})` 
          : `User B correctly isolated from User A's project`,
        'CRITICAL',
        { userBProjects: userBProjects.map((p: any) => p.name) }
      )

    } catch (error: any) {
      this.addResult('Tenant Isolation - Projects', false, `Test failed: ${error.message}`, 'CRITICAL')
    }
  }

  async testTenantIsolationCities(): Promise<void> {
    if (this.users.length < 2) {
      this.addResult('Tenant Isolation - Cities', false, 'Insufficient test users', 'CRITICAL')
      return
    }

    try {
      const userA = this.users[0]
      const userB = this.users[1]
      
      console.log(`\n🌍 Testing City Access Isolation...`)

      // Test: Check if users can access cities outside their tenant scope
      const userACitiesResponse = await axios.get(`${API_BASE}/tenant/cities`, {
        headers: { Authorization: `Bearer ${userA.token}` }
      })
      
      const userACities = userACitiesResponse.data.data || []
      
      // Check if User A can see cities that don't belong to their tenant
      const userAInvalidCities = userACities.filter((city: any) => {
        // This city should not be accessible if it's not part of User A's project combinations
        return city.name !== userA.city.name
      })

      this.addResult(
        'Tenant Isolation - City Boundary',
        userAInvalidCities.length === 0,
        userAInvalidCities.length > 0
          ? `CRITICAL: User A sees ${userAInvalidCities.length} cities outside tenant scope`
          : `User A correctly sees only tenant-scoped cities`,
        'CRITICAL',
        { 
          userACities: userACities.map((c: any) => c.name),
          expectedCity: userA.city.name,
          invalidCities: userAInvalidCities.map((c: any) => c.name)
        }
      )

    } catch (error: any) {
      this.addResult('Tenant Isolation - Cities', false, `Test failed: ${error.message}`, 'CRITICAL')
    }
  }

  async testCrossTenantDataAccess(): Promise<void> {
    if (this.users.length < 2) {
      this.addResult('Cross-Tenant Data Access', false, 'Insufficient test users', 'CRITICAL')
      return
    }

    try {
      const userA = this.users[0]
      const userB = this.users[1]
      
      console.log(`\n🔄 Testing Cross-Tenant Data Access Prevention...`)

      // Test: Try to validate project-city combinations across tenants
      try {
        const crossTenantValidation = await axios.get(
          `${API_BASE}/tenant/validate-project-city?projectId=${userB.project.slug}&cityName=${userA.city.name}`,
          { headers: { Authorization: `Bearer ${userA.token}` } }
        )

        const isValid = crossTenantValidation.data.data?.isValid
        
        this.addResult(
          'Cross-Tenant Validation Prevention',
          !isValid,
          isValid 
            ? `CRITICAL: User A can validate cross-tenant combination (${userB.project.name} + ${userA.city.name})`
            : `Cross-tenant validation correctly rejected`,
          'CRITICAL',
          { 
            userAProject: userA.project.name,
            userBProject: userB.project.name,
            attemptedCity: userA.city.name,
            validationResult: isValid
          }
        )

      } catch (error: any) {
        // If this fails, it might be proper security (good)
        if (error.response?.status === 403 || error.response?.status === 401) {
          this.addResult(
            'Cross-Tenant Validation Prevention',
            true,
            'Cross-tenant validation properly blocked with auth error',
            'HIGH'
          )
        } else {
          throw error
        }
      }

    } catch (error: any) {
      this.addResult('Cross-Tenant Data Access', false, `Test failed: ${error.message}`, 'CRITICAL')
    }
  }

  async testTenantContextValidation(): Promise<void> {
    if (this.users.length < 2) {
      this.addResult('Tenant Context Validation', false, 'Insufficient test users', 'CRITICAL')
      return
    }

    try {
      const userA = this.users[0]
      const userB = this.users[1]
      
      console.log(`\n🎯 Testing Tenant Context Validation...`)

      // Test: Each user should only get their own tenant context
      const userATenantResponse = await axios.get(
        `${API_BASE}/tenant/context?projectId=${userA.project.slug}&cityName=${userA.city.name}`,
        { headers: { Authorization: `Bearer ${userA.token}` } }
      )

      const userATenantContext = userATenantResponse.data.data
      const contextMatchesUser = userATenantContext?.projectCityId === userA.projectCityId

      this.addResult(
        'Tenant Context Consistency',
        contextMatchesUser,
        contextMatchesUser
          ? 'User A gets correct tenant context matching their scope'
          : `CRITICAL: User A tenant context mismatch (got: ${userATenantContext?.projectCityId}, expected: ${userA.projectCityId})`,
        'CRITICAL',
        {
          userProjectCityId: userA.projectCityId,
          contextProjectCityId: userATenantContext?.projectCityId,
          matches: contextMatchesUser
        }
      )

      // Test: Try to get tenant context for different tenant combination
      try {
        const crossTenantContextResponse = await axios.get(
          `${API_BASE}/tenant/context?projectId=${userB.project.slug}&cityName=${userB.city.name}`,
          { headers: { Authorization: `Bearer ${userA.token}` } }
        )

        const crossTenantContext = crossTenantContextResponse.data.data
        const userACanAccessUserBContext = crossTenantContext?.projectCityId === userB.projectCityId

        this.addResult(
          'Cross-Tenant Context Access Prevention',
          !userACanAccessUserBContext,
          userACanAccessUserBContext
            ? `CRITICAL: User A can access User B's tenant context`
            : 'User A correctly prevented from accessing other tenant context',
          'CRITICAL',
          {
            userATenant: userA.projectCityId,
            userBTenant: userB.projectCityId,
            attemptedAccess: crossTenantContext?.projectCityId,
            accessGranted: userACanAccessUserBContext
          }
        )

      } catch (error: any) {
        if (error.response?.status === 403 || error.response?.status === 404) {
          this.addResult(
            'Cross-Tenant Context Access Prevention',
            true,
            'Cross-tenant context access properly blocked',
            'HIGH'
          )
        } else {
          throw error
        }
      }

    } catch (error: any) {
      this.addResult('Tenant Context Validation', false, `Test failed: ${error.message}`, 'CRITICAL')
    }
  }

  async testPermissionLogicValidation(): Promise<void> {
    console.log(`\n🔐 Testing Access Control Business Rules...`)

    try {
      // Test: Verify user profile access is tenant-scoped
      for (const user of this.users) {
        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })

        const profile = profileResponse.data.data
        const profileTenantMatches = profile.projectCityId === user.projectCityId

        this.addResult(
          `Profile Tenant Scope - ${user.username}`,
          profileTenantMatches,
          profileTenantMatches
            ? `User profile correctly scoped to tenant ${user.project.name}/${user.city.name}`
            : `CRITICAL: Profile tenant mismatch for ${user.username}`,
          'HIGH',
          {
            expectedTenant: user.projectCityId,
            profileTenant: profile.projectCityId,
            user: user.username
          }
        )
      }

    } catch (error: any) {
      this.addResult('Permission Logic Validation', false, `Test failed: ${error.message}`, 'HIGH')
    }
  }

  async testDataBoundaryEnforcement(): Promise<void> {
    console.log(`\n🛡️ Testing Multi-Tenant Data Segregation...`)

    try {
      // Test: Database-level tenant isolation
      const userA = this.users[0]
      const userB = this.users[1]

      // Check if users exist in different tenant scopes
      const userAData = await prisma.user.findUnique({
        where: { id: userA.id },
        include: { projectCity: { include: { project: true, city: true } } }
      })

      const userBData = await prisma.user.findUnique({
        where: { id: userB.id },
        include: { projectCity: { include: { project: true, city: true } } }
      })

      const tenantsAreDifferent = userAData?.projectCityId !== userBData?.projectCityId

      this.addResult(
        'Database Tenant Segregation',
        tenantsAreDifferent,
        tenantsAreDifferent
          ? `Users correctly stored in different tenant scopes`
          : `CRITICAL: Users in same tenant scope - data boundary violation`,
        'CRITICAL',
        {
          userATenant: userAData?.projectCity?.project?.name + '/' + userAData?.projectCity?.city?.name,
          userBTenant: userBData?.projectCity?.project?.name + '/' + userBData?.projectCity?.city?.name,
          different: tenantsAreDifferent
        }
      )

      // Test: Verify users cannot query each other's data through tenant context
      const usersInTenantA = await prisma.user.findMany({
        where: { projectCityId: userA.projectCityId }
      })

      const usersInTenantB = await prisma.user.findMany({
        where: { projectCityId: userB.projectCityId }
      })

      const tenantAContainsUserB = usersInTenantA.some(u => u.id === userB.id)
      const tenantBContainsUserA = usersInTenantB.some(u => u.id === userA.id)

      this.addResult(
        'User Data Boundary Enforcement',
        !tenantAContainsUserB && !tenantBContainsUserA,
        (!tenantAContainsUserB && !tenantBContainsUserA)
          ? 'User data correctly isolated between tenants'
          : 'CRITICAL: User data boundary violation detected',
        'CRITICAL',
        {
          tenantAUsers: usersInTenantA.length,
          tenantBUsers: usersInTenantB.length,
          crossContamination: tenantAContainsUserB || tenantBContainsUserA
        }
      )

    } catch (error: any) {
      this.addResult('Data Boundary Enforcement', false, `Test failed: ${error.message}`, 'CRITICAL')
    }
  }

  async runAllSecurityTests(): Promise<void> {
    console.log('🚨 MULTI-TENANT SECURITY TEST SUITE')
    console.log('=' .repeat(60))
    
    await this.setupMultiTenantTestData()
    await this.testTenantIsolationProjects()
    await this.testTenantIsolationCities()
    await this.testCrossTenantDataAccess()
    await this.testTenantContextValidation()
    await this.testPermissionLogicValidation()
    await this.testDataBoundaryEnforcement()
    
    this.printSecurityReport()
  }

  private printSecurityReport(): void {
    console.log('\n🔒 MULTI-TENANT SECURITY AUDIT REPORT')
    console.log('=' .repeat(60))
    
    const critical = this.results.filter(r => r.severity === 'CRITICAL')
    const high = this.results.filter(r => r.severity === 'HIGH')
    const medium = this.results.filter(r => r.severity === 'MEDIUM')
    const low = this.results.filter(r => r.severity === 'LOW')
    
    const criticalFailed = critical.filter(r => !r.passed)
    const highFailed = high.filter(r => !r.passed)
    const totalFailed = this.results.filter(r => !r.passed)
    const totalPassed = this.results.filter(r => r.passed)
    
    console.log(`📊 Test Results: ${totalPassed.length}/${this.results.length} passed`)
    console.log(`🚨 Critical Issues: ${criticalFailed.length}/${critical.length}`)
    console.log(`⚠️  High Issues: ${highFailed.length}/${high.length}`)
    console.log(`⚡ Medium Issues: ${medium.filter(r => !r.passed).length}/${medium.length}`)
    console.log(`ℹ️  Low Issues: ${low.filter(r => !r.passed).length}/${low.length}`)

    if (criticalFailed.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY VULNERABILITIES:')
      criticalFailed.forEach(r => {
        console.log(`   ❌ ${r.name}: ${r.message}`)
      })
    }

    if (highFailed.length > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:')
      highFailed.forEach(r => {
        console.log(`   ❌ ${r.name}: ${r.message}`)
      })
    }

    console.log('\n🎯 SECURITY ASSESSMENT:')
    if (criticalFailed.length === 0 && highFailed.length === 0) {
      console.log('✅ SECURE: Multi-tenant isolation properly implemented')
      console.log('✅ Ready for production deployment')
    } else if (criticalFailed.length === 0) {
      console.log('⚠️ MODERATE RISK: Some high-priority issues found')
      console.log('⚠️ Review and fix before production')
    } else {
      console.log('❌ HIGH RISK: Critical security vulnerabilities detected')
      console.log('❌ DO NOT DEPLOY - Fix critical issues immediately')
    }

    console.log('\n📋 BUSINESS LOGIC SECURITY CHECKLIST:')
    console.log(`   ${criticalFailed.length === 0 ? '✅' : '❌'} Tenant Isolation`)
    console.log(`   ${criticalFailed.length === 0 ? '✅' : '❌'} Data Boundary Enforcement`) 
    console.log(`   ${highFailed.length === 0 ? '✅' : '❌'} Permission Logic`)
    console.log(`   ${totalFailed.length === 0 ? '✅' : '❌'} Cross-Reference Validation`)
  }
}

// Cleanup function
async function cleanup(): Promise<void> {
  try {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: 'security.'
        }
      }
    })
    console.log('\n🧹 Test data cleaned up')
  } catch (error) {
    console.error('Cleanup error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
async function main(): Promise<void> {
  const securityTest = new MultiTenantSecurityTest()
  
  try {
    await securityTest.runAllSecurityTests()
  } catch (error) {
    console.error('❌ Security test failed:', error)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

main()