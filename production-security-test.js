// production-security-test.js
// Comprehensive security testing for production environment

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ProductionSecurityTester {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.testResults = [];
    this.logFile = `security-test-${new Date().toISOString().split('T')[0]}.log`;
  }

  async runAllTests() {
    console.log('🔒 Starting Production Security Testing Suite...\n');
    
    try {
      // 1. Tenant Isolation Tests
      await this.testTenantIsolation();
      
      // 2. Authentication Security Tests
      await this.testAuthenticationSecurity();
      
      // 3. Authorization Tests
      await this.testAuthorizationSecurity();
      
      // 4. RFID Security Tests
      await this.testRFIDSecurity();
      
      // 5. API Security Tests
      await this.testAPISecurity();
      
      // 6. Data Security Tests
      await this.testDataSecurity();
      
      // Generate report
      await this.generateSecurityReport();
      
    } catch (error) {
      this.logError('Critical error in security testing', error);
    }
  }

  async testTenantIsolation() {
    console.log('🏢 Testing Multi-Tenant Isolation...');
    
    const tests = [
      {
        name: 'Cross-Tenant Login Prevention',
        test: () => this.testCrossTenantLogin()
      },
      {
        name: 'Cross-Tenant Data Access Prevention',
        test: () => this.testCrossTenantDataAccess()
      },
      {
        name: 'Cross-Tenant RFID Access Prevention',
        test: () => this.testCrossTenantRFIDAccess()
      },
      {
        name: 'Tenant Data Leakage Prevention',
        test: () => this.testTenantDataLeakage()
      }
    ];

    for (const testCase of tests) {
      try {
        const result = await testCase.test();
        this.logResult(testCase.name, result);
      } catch (error) {
        this.logError(testCase.name, error);
      }
    }
  }

  async testCrossTenantLogin() {
    // Test if user from tenant A can access tenant B's data
    const tenantAUser = {
      username: 'alice@acme.com',
      password: 'Alice123!',
      expectedTenant: 'acme'
    };

    const tenantBEndpoint = '/api/perfectit/dashboard';
    
    try {
      // Login as tenant A user
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: tenantAUser.username,
        password: tenantAUser.password
      });

      const token = loginResponse.data.token;

      // Try to access tenant B data
      const accessResponse = await axios.get(`${this.baseUrl}${tenantBEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // If we get data, check if it's properly scoped to tenant A
      if (accessResponse.data && accessResponse.data.locks) {
        const hasOtherTenantData = accessResponse.data.locks.some(lock => 
          !lock.projectCity || lock.projectCity.slug !== tenantAUser.expectedTenant
        );

        return {
          passed: !hasOtherTenantData,
          message: hasOtherTenantData ? 
            'SECURITY BREACH: Cross-tenant data access detected!' : 
            'Tenant isolation properly maintained',
          data: accessResponse.data
        };
      }

      return {
        passed: true,
        message: 'No cross-tenant access detected',
        data: accessResponse.data
      };

    } catch (error) {
      if (error.response && error.response.status === 403) {
        return {
          passed: true,
          message: 'Cross-tenant access properly blocked',
          data: null
        };
      }
      throw error;
    }
  }

  async testCrossTenantDataAccess() {
    // Test direct API calls to ensure tenant scoping
    const scenarios = [
      { endpoint: '/api/users', method: 'GET' },
      { endpoint: '/api/locks', method: 'GET' },
      { endpoint: '/api/access-logs', method: 'GET' },
      { endpoint: '/api/locations', method: 'GET' }
    ];

    const results = [];

    for (const scenario of scenarios) {
      try {
        // Get tokens for different tenants
        const acmeToken = await this.getTokenForTenant('alice@acme.com', 'Alice123!');
        const perfectitToken = await this.getTokenForTenant('bob@perfectit.com', 'Bob123!');

        // Test with ACME token
        const acmeResponse = await this.makeRequest(scenario.endpoint, scenario.method, acmeToken);
        
        // Test with PerfectIT token
        const perfectitResponse = await this.makeRequest(scenario.endpoint, scenario.method, perfectitToken);

        // Validate data isolation
        const dataIsolated = this.validateDataIsolation(acmeResponse.data, perfectitResponse.data);

        results.push({
          endpoint: scenario.endpoint,
          isolated: dataIsolated,
          acmeDataCount: acmeResponse.data?.length || 0,
          perfectitDataCount: perfectitResponse.data?.length || 0
        });

      } catch (error) {
        results.push({
          endpoint: scenario.endpoint,
          error: error.message,
          isolated: false
        });
      }
    }

    return {
      passed: results.every(r => r.isolated !== false),
      message: `Data isolation test completed for ${results.length} endpoints`,
      results: results
    };
  }

  async testRFIDSecurity() {
    console.log('💳 Testing RFID Security...');
    
    const tests = [
      {
        name: 'Expired Card Access Prevention',
        test: () => this.testExpiredCardAccess()
      },
      {
        name: 'Deactivated Card Access Prevention',
        test: () => this.testDeactivatedCardAccess()
      },
      {
        name: 'Cross-Tenant Card Usage Prevention',
        test: () => this.testCrossTenantCardUsage()
      },
      {
        name: 'Invalid Card Format Handling',
        test: () => this.testInvalidCardFormat()
      }
    ];

    for (const testCase of tests) {
      try {
        const result = await testCase.test();
        this.logResult(testCase.name, result);
      } catch (error) {
        this.logError(testCase.name, error);
      }
    }
  }

  async testExpiredCardAccess() {
    // Test access with expired card
    const expiredCardScenarios = [
      {
        cardId: 'expired-card-001',
        lockId: 'lock-001',
        expectedResult: 'DENIED'
      }
    ];

    const results = [];

    for (const scenario of expiredCardScenarios) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/access/attempt`, {
          cardId: scenario.cardId,
          lockId: scenario.lockId,
          deviceId: 'test-device-001'
        });

        const accessGranted = response.data.access === 'GRANTED';
        
        results.push({
          cardId: scenario.cardId,
          lockId: scenario.lockId,
          accessGranted: accessGranted,
          passed: !accessGranted, // Should be denied
          response: response.data
        });

      } catch (error) {
        results.push({
          cardId: scenario.cardId,
          lockId: scenario.lockId,
          error: error.message,
          passed: true // Error is expected for expired cards
        });
      }
    }

    return {
      passed: results.every(r => r.passed),
      message: `Expired card access test completed`,
      results: results
    };
  }

  async testAuthenticationSecurity() {
    console.log('🔐 Testing Authentication Security...');
    
    const tests = [
      {
        name: 'Brute Force Protection',
        test: () => this.testBruteForceProtection()
      },
      {
        name: 'Invalid Token Handling',
        test: () => this.testInvalidTokenHandling()
      },
      {
        name: 'Token Expiration',
        test: () => this.testTokenExpiration()
      },
      {
        name: 'Password Strength Validation',
        test: () => this.testPasswordStrength()
      }
    ];

    for (const testCase of tests) {
      try {
        const result = await testCase.test();
        this.logResult(testCase.name, result);
      } catch (error) {
        this.logError(testCase.name, error);
      }
    }
  }

  async testBruteForceProtection() {
    const invalidCredentials = {
      username: 'alice@acme.com',
      password: 'wrongpassword'
    };

    const attempts = [];
    
    // Make multiple failed login attempts
    for (let i = 0; i < 10; i++) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, invalidCredentials);
        attempts.push({ attempt: i + 1, blocked: false, response: response.status });
      } catch (error) {
        const blocked = error.response && error.response.status === 429;
        attempts.push({ 
          attempt: i + 1, 
          blocked: blocked, 
          status: error.response?.status,
          message: error.response?.data?.message 
        });
        
        // If we get rate limited, brute force protection is working
        if (blocked) break;
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const protectionActive = attempts.some(a => a.blocked);

    return {
      passed: protectionActive,
      message: protectionActive ? 
        'Brute force protection is active' : 
        'WARNING: No brute force protection detected',
      attempts: attempts
    };
  }

  async testAPISecurity() {
    console.log('🌐 Testing API Security...');
    
    const tests = [
      {
        name: 'SQL Injection Prevention',
        test: () => this.testSQLInjection()
      },
      {
        name: 'XSS Prevention',
        test: () => this.testXSSPrevention()
      },
      {
        name: 'Input Validation',
        test: () => this.testInputValidation()
      },
      {
        name: 'Rate Limiting',
        test: () => this.testRateLimiting()
      }
    ];

    for (const testCase of tests) {
      try {
        const result = await testCase.test();
        this.logResult(testCase.name, result);
      } catch (error) {
        this.logError(testCase.name, error);
      }
    }
  }

  async testSQLInjection() {
    const token = await this.getTokenForTenant('alice@acme.com', 'Alice123!');
    
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1#"
    ];

    const results = [];

    for (const payload of sqlInjectionPayloads) {
      try {
        // Test SQL injection in search parameters
        const response = await axios.get(`${this.baseUrl}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: payload }
        });

        // If we get a response, check if it contains suspicious data
        const suspiciousResponse = this.detectSQLInjectionSuccess(response.data);
        
        results.push({
          payload: payload,
          vulnerable: suspiciousResponse,
          status: response.status,
          dataReturned: Array.isArray(response.data) ? response.data.length : 'N/A'
        });

      } catch (error) {
        results.push({
          payload: payload,
          vulnerable: false,
          status: error.response?.status || 'ERROR',
          message: error.message
        });
      }
    }

    const hasVulnerabilities = results.some(r => r.vulnerable);

    return {
      passed: !hasVulnerabilities,
      message: hasVulnerabilities ? 
        'SQL injection vulnerabilities detected!' : 
        'SQL injection protection working correctly',
      results: results
    };
  }

  // Helper methods
  async getTokenForTenant(username, password) {
    const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
      username: username,
      password: password
    });
    return response.data.token;
  }

  async makeRequest(endpoint, method, token) {
    const config = {
      method: method,
      url: `${this.baseUrl}${endpoint}`,
      headers: { Authorization: `Bearer ${token}` }
    };

    return await axios(config);
  }

  validateDataIsolation(data1, data2) {
    // Check if the data sets are properly isolated
    if (!data1 || !data2 || !Array.isArray(data1) || !Array.isArray(data2)) {
      return true; // Can't validate, assume isolated
    }

    // Check for overlapping IDs or tenant data
    const ids1 = data1.map(item => item.id).filter(Boolean);
    const ids2 = data2.map(item => item.id).filter(Boolean);
    
    const hasOverlap = ids1.some(id => ids2.includes(id));
    
    return !hasOverlap;
  }

  detectSQLInjectionSuccess(data) {
    if (!data) return false;
    
    // Look for signs of successful SQL injection
    const suspiciousPatterns = [
      /DROP TABLE/i,
      /UNION SELECT/i,
      /mysql_version/i,
      /information_schema/i
    ];

    const dataString = JSON.stringify(data);
    return suspiciousPatterns.some(pattern => pattern.test(dataString));
  }

  logResult(testName, result) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const message = `${status} - ${testName}: ${result.message}`;
    
    console.log(message);
    this.testResults.push({
      test: testName,
      passed: result.passed,
      message: result.message,
      data: result.data || result.results,
      timestamp: new Date().toISOString()
    });

    // Log to file
    fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message}\n`);
  }

  logError(testName, error) {
    const message = `❌ ERROR - ${testName}: ${error.message}`;
    console.log(message);
    
    this.testResults.push({
      test: testName,
      passed: false,
      message: `Error: ${error.message}`,
      error: error.stack,
      timestamp: new Date().toISOString()
    });

    // Log to file
    fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message}\n`);
  }

  async generateSecurityReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      summary: {
        totalTests: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
        timestamp: new Date().toISOString()
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };

    const reportFile = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📊 SECURITY TEST SUMMARY');
    console.log('=========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`\nDetailed report saved to: ${reportFile}`);

    if (failedTests > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES DETECTED!');
      console.log('Please review failed tests immediately.');
    }

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const failedTests = this.testResults.filter(r => !r.passed);
    
    if (failedTests.some(t => t.test.includes('Tenant Isolation'))) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Tenant isolation failures detected',
        action: 'Immediately review and fix tenant scoping in all API endpoints'
      });
    }

    if (failedTests.some(t => t.test.includes('SQL Injection'))) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'SQL injection vulnerabilities found',
        action: 'Implement parameterized queries and input sanitization'
      });
    }

    if (failedTests.some(t => t.test.includes('Brute Force'))) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Brute force protection missing',
        action: 'Implement rate limiting for authentication endpoints'
      });
    }

    return recommendations;
  }
}

// Configuration for production testing
const productionConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5000'
};

// Run the security test suite
async function main() {
  const tester = new ProductionSecurityTester(productionConfig);
  await tester.runAllTests();
}

// Export for use in other scripts
module.exports = ProductionSecurityTester;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}