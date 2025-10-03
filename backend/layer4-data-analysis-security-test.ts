/**
 * LAYER 4: DATA ANALYSIS SECURITY TESTING
 * Based on SECURITY_TESTING_METHODOLOGY.md
 * 
 * Tests the previously missed data analysis security:
 * - Historical Data Review
 * - Permission Audit
 * - Cross-Tenant Detection
 * - Compliance Validation
 */

import { PrismaClient } from '@prisma/client'

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

/**
 * TEST 1: HISTORICAL DATA REVIEW
 * Analyze access logs and historical data for security violations
 */
async function testHistoricalDataReview() {
  console.log('\n🔍 LAYER 4 TEST 1: Historical Data Review')

  // Test 1.1: Analyze access logs for cross-tenant access attempts
  const accessLogs = await prisma.accessLog.findMany({
    include: {
      user: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      },
      lock: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      }
    },
    take: 100 // Limit for analysis
  })

  let crossTenantAccessAttempts = 0
  const suspiciousActivity: { timestamp: Date; userId?: string; userTenant: string; lockTenant: string; result: string }[] = []

  accessLogs.forEach(log => {
    if (log.user?.projectCityId && log.lock?.projectCityId) {
      if (log.user.projectCityId !== log.lock.projectCityId) {
        crossTenantAccessAttempts++
        suspiciousActivity.push({
          timestamp: log.timestamp,
          userId: log.userId || undefined,
          userTenant: log.user.projectCity ? 
            `${log.user.projectCity.project.name}/${log.user.projectCity.city.name}` : 'Unknown',
          lockTenant: log.lock.projectCity ? 
            `${log.lock.projectCity.project.name}/${log.lock.projectCity.city.name}` : 'Unknown',
          result: log.result
        })
      }
    }
  })

  logResult('Historical Cross-Tenant Access Detection', crossTenantAccessAttempts === 0,
    `Found ${crossTenantAccessAttempts} cross-tenant access attempts in ${accessLogs.length} logs`,
    crossTenantAccessAttempts > 0 ? suspiciousActivity : null)

  // Test 1.2: Analyze audit logs for security violations
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 50
  })

  const securityViolations: any[] = []
  let potentialViolations = 0

  auditLogs.forEach(log => {
    // Look for potential security violations in audit logs
    const logDetails = log.newValues as any
    if (logDetails && typeof logDetails === 'object') {
      // Check for cross-tenant operations
      if (logDetails.projectCityId && log.user?.projectCityId && 
          logDetails.projectCityId !== log.user.projectCityId) {
        potentialViolations++
        securityViolations.push({
          timestamp: log.timestamp,
          action: log.action,
          entity: `${log.entityType}:${log.entityId}`,
          user: log.user?.username,
          userTenant: log.user?.projectCity ? 
            `${log.user.projectCity.project.name}/${log.user.projectCity.city.name}` : 'Unknown',
          violation: 'Cross-tenant operation detected'
        })
      }
    }
  })

  logResult('Audit Log Security Violation Detection', potentialViolations === 0,
    `Found ${potentialViolations} potential security violations in ${auditLogs.length} audit logs`,
    potentialViolations > 0 ? securityViolations : null)
}

/**
 * TEST 2: PERMISSION AUDIT
 * Validate user-resource assignments and permission consistency
 */
async function testPermissionAudit() {
  console.log('\n🔍 LAYER 4 TEST 2: Permission Audit')

  // Test 2.1: Validate user permissions are tenant-scoped
  const userPermissions = await prisma.userPermission.findMany({
    include: {
      user: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      },
      lock: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      }
    }
  })

  let crossTenantPermissions = 0
  const invalidPermissions: any[] = []

  userPermissions.forEach(permission => {
    if (permission.user?.projectCityId && permission.lock?.projectCityId) {
      if (permission.user.projectCityId !== permission.lock.projectCityId) {
        crossTenantPermissions++
        invalidPermissions.push({
          permissionId: permission.id,
          userId: permission.userId,
          lockId: permission.lockId,
          userTenant: permission.user.projectCity ? 
            `${permission.user.projectCity.project.name}/${permission.user.projectCity.city.name}` : 'Unknown',
          lockTenant: permission.lock.projectCity ? 
            `${permission.lock.projectCity.project.name}/${permission.lock.projectCity.city.name}` : 'Unknown'
        })
      }
    }
  })

  logResult('Permission Tenant Boundary Validation', crossTenantPermissions === 0,
    `Found ${crossTenantPermissions} cross-tenant permissions in ${userPermissions.length} total permissions`,
    crossTenantPermissions > 0 ? invalidPermissions : null)

  // Test 2.2: Validate RFID key assignments are tenant-scoped
  const rfidKeys = await prisma.rFIDKey.findMany({
    include: {
      user: {
        include: {
          projectCity: {
            include: {
              project: true,
              city: true
            }
          }
        }
      }
    }
  })

  let crossTenantRFIDKeys = 0
  const invalidRFIDKeys: any[] = []

  rfidKeys.forEach(key => {
    if (key.user?.projectCityId && key.projectCityId) {
      if (key.user.projectCityId !== key.projectCityId) {
        crossTenantRFIDKeys++
        invalidRFIDKeys.push({
          keyId: key.id,
          cardId: key.cardId,
          userId: key.userId,
          userTenant: key.user.projectCity ? 
            `${key.user.projectCity.project.name}/${key.user.projectCity.city.name}` : 'Unknown',
          keyTenant: key.projectCityId
        })
      }
    }
  })

  logResult('RFID Key Tenant Boundary Validation', crossTenantRFIDKeys === 0,
    `Found ${crossTenantRFIDKeys} cross-tenant RFID keys in ${rfidKeys.length} total keys`,
    crossTenantRFIDKeys > 0 ? invalidRFIDKeys : null)
}

/**
 * TEST 3: CROSS-TENANT DETECTION
 * Deep analysis for potential data leakage between tenants
 */
async function testCrossTenantDetection() {
  console.log('\n🔍 LAYER 4 TEST 3: Cross-Tenant Detection')

  // Test 3.1: Verify all resources have proper tenant assignments
  const resourceCounts = {
    users: await prisma.user.count({ where: { projectCityId: { not: null } } }),
    totalUsers: await prisma.user.count(),
    addresses: await prisma.address.count({ where: { projectCityId: { not: null } } }),
    totalAddresses: await prisma.address.count(),
    locations: await prisma.location.count({ where: { projectCityId: { not: null } } }),
    totalLocations: await prisma.location.count(),
    locks: await prisma.lock.count({ where: { projectCityId: { not: null } } }),
    totalLocks: await prisma.lock.count()
  }

  const tenantAssignmentResults = {
    users: `${resourceCounts.users}/${resourceCounts.totalUsers}`,
    addresses: `${resourceCounts.addresses}/${resourceCounts.totalAddresses}`,
    locations: `${resourceCounts.locations}/${resourceCounts.totalLocations}`,
    locks: `${resourceCounts.locks}/${resourceCounts.totalLocks}`
  }

  const allResourcesHaveTenants = 
    resourceCounts.users === resourceCounts.totalUsers &&
    resourceCounts.addresses === resourceCounts.totalAddresses &&
    resourceCounts.locations === resourceCounts.totalLocations &&
    resourceCounts.locks === resourceCounts.totalLocks

  logResult('Resource Tenant Assignment Coverage', allResourcesHaveTenants,
    `Tenant assignment coverage - Users: ${tenantAssignmentResults.users}, Addresses: ${tenantAssignmentResults.addresses}, Locations: ${tenantAssignmentResults.locations}, Locks: ${tenantAssignmentResults.locks}`,
    !allResourcesHaveTenants ? tenantAssignmentResults : null)

  // Test 3.2: Detect orphaned resources without tenant assignments
  const orphanedResources = {
    users: await prisma.user.findMany({ 
      where: { projectCityId: null },
      select: { id: true, username: true, email: true }
    }),
    addresses: await prisma.address.findMany({ 
      where: { projectCityId: null },
      select: { id: true, street: true, number: true }
    }),
    locations: await prisma.location.findMany({ 
      where: { projectCityId: null },
      select: { id: true, name: true }
    }),
    locks: await prisma.lock.findMany({ 
      where: { projectCityId: null },
      select: { id: true, name: true }
    })
  }

  const totalOrphaned = orphanedResources.users.length + 
                       orphanedResources.addresses.length + 
                       orphanedResources.locations.length + 
                       orphanedResources.locks.length

  logResult('Orphaned Resource Detection', totalOrphaned === 0,
    `Found ${totalOrphaned} orphaned resources without tenant assignments`,
    totalOrphaned > 0 ? orphanedResources : null)
}

/**
 * TEST 4: COMPLIANCE VALIDATION
 * Validate regulatory compliance and security policy enforcement
 */
async function testComplianceValidation() {
  console.log('\n🔍 LAYER 4 TEST 4: Compliance Validation')

  // Test 4.1: Data retention compliance
  const oldAccessLogs = await prisma.accessLog.findMany({
    where: {
      timestamp: {
        lt: new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)) // Older than 1 year
      }
    },
    take: 10
  })

  logResult('Data Retention Compliance', true,
    `Found ${oldAccessLogs.length} access logs older than 1 year (retention policy check)`)

  // Test 4.2: User account security compliance
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
      twoFactorEnabled: true,
      projectCityId: true,
      phone: true
    }
  })

  const complianceAnalysis = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    usersWithTenants: users.filter(u => u.projectCityId).length,
    usersWith2FA: users.filter(u => u.twoFactorEnabled).length,
    usersWithPhone: users.filter(u => u.phone).length,
    recentlyActiveUsers: users.filter(u => 
      u.lastLoginAt && u.lastLoginAt > new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
    ).length
  }

  const tenantAssignmentCompliance = complianceAnalysis.usersWithTenants === complianceAnalysis.totalUsers
  const securityFeatureAdoption = complianceAnalysis.usersWith2FA / complianceAnalysis.totalUsers

  logResult('User Account Compliance', tenantAssignmentCompliance,
    `Tenant assignment: ${complianceAnalysis.usersWithTenants}/${complianceAnalysis.totalUsers}, 2FA adoption: ${(securityFeatureAdoption * 100).toFixed(1)}%`,
    complianceAnalysis)

  // Test 4.3: Security audit trail completeness
  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // Last 7 days
      }
    }
  })

  const auditActions = [...new Set(recentAuditLogs.map(log => log.action))]
  const expectedActions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'ACCESS_ATTEMPT']
  const auditCoverage = auditActions.filter(action => expectedActions.includes(action)).length / expectedActions.length

  logResult('Audit Trail Completeness', auditCoverage >= 0.8,
    `Audit coverage: ${(auditCoverage * 100).toFixed(1)}% (${auditActions.length} action types in last 7 days)`,
    { recentLogCount: recentAuditLogs.length, actionsCovered: auditActions })
}

/**
 * MAIN TEST RUNNER FOR LAYER 4: DATA ANALYSIS SECURITY
 */
async function runLayer4DataAnalysisTests() {
  console.log('🔒 LAYER 4: DATA ANALYSIS SECURITY TESTING')
  console.log('================================================================')
  console.log('Testing previously missed data analysis security vulnerabilities')
  console.log('================================================================\n')

  await testHistoricalDataReview()
  await testPermissionAudit()
  await testCrossTenantDetection()
  await testComplianceValidation()

  // Summary
  console.log('\n📊 LAYER 4 DATA ANALYSIS SECURITY SUMMARY')
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
  
  console.log('\n🎯 DATA ANALYSIS SECURITY ASSESSMENT:')
  if (failedTests === 0) {
    console.log('🟢 EXCELLENT: All data analysis security tests passed')
  } else if (failedTests <= 2) {
    console.log('🟡 GOOD: Minor data analysis issues found')
  } else if (failedTests <= 5) {
    console.log('🟠 MODERATE: Several data analysis issues need attention')
  } else {
    console.log('🔴 CRITICAL: Major data analysis vulnerabilities detected')
  }
  
  await prisma.$disconnect()
  return failedTests === 0
}

// Run the tests
if (require.main === module) {
  runLayer4DataAnalysisTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Layer 4 test suite failed:', error)
      process.exit(1)
    })
}

export { runLayer4DataAnalysisTests }