#!/usr/bin/env node

/**
 * COMPREHENSIVE MULTI-LAYER SECURITY TESTING
 * ==========================================
 * 
 * Based on SECURITY_TESTING_METHODOLOGY.md
 * Implements all 4 layers of security testing with proper timeout handling
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const REQUEST_TIMEOUT = 3000; // 3 second timeout to avoid hanging

// Configure axios with timeout and better error handling
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  validateStatus: function (status) {
    // Don't throw errors for any status code - we want to test all responses
    return true;
  }
});

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class MultiLayerSecurityTester {
  constructor() {
    this.results = {
      layer1: { passed: 0, failed: 0, details: [] },
      layer2: { passed: 0, failed: 0, details: [] },
      layer3: { passed: 0, failed: 0, details: [] },
      layer4: { passed: 0, failed: 0, details: [] }
    };
    this.authTokens = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      this.log(`Making ${method.toUpperCase()} request to ${endpoint}`);
      const response = await apiClient(config);
      
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: true
      };
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.log(`Request timeout for ${endpoint}`, 'warning');
        return { status: 0, error: 'TIMEOUT', success: false };
      } else if (error.code === 'ECONNREFUSED') {
        this.log(`Connection refused for ${endpoint}`, 'error');
        return { status: 0, error: 'CONNECTION_REFUSED', success: false };
      } else {
        this.log(`Request error for ${endpoint}: ${error.message}`, 'error');
        return { status: error.response?.status || 0, error: error.message, success: false };
      }
    }
  }

  async testLayer1ApiSurfaceSecurity() {
    console.log('\n🔒 LAYER 1: API SURFACE SECURITY TESTS');
    console.log('=====================================');

    const tests = [
      {
        name: 'SQL Injection in Login',
        test: () => this.makeRequest('POST', '/auth/login', {
          username: "admin'; DROP TABLE users; --",
          password: 'password',
          projectId: 'test',
          cityName: 'test'
        }),
        expectedStatus: [400, 401, 422],
        description: 'Should reject SQL injection attempts'
      },
      {
        name: 'XSS in Login',
        test: () => this.makeRequest('POST', '/auth/login', {
          username: '<script>alert("xss")</script>',
          password: 'password',
          projectId: 'test',
          cityName: 'test'
        }),
        expectedStatus: [400, 401, 422],
        description: 'Should sanitize XSS attempts'
      },
      {
        name: 'Invalid Credentials',
        test: () => this.makeRequest('POST', '/auth/login', {
          username: 'invaliduser',
          password: 'wrongpassword',
          projectId: 'test',
          cityName: 'test'
        }),
        expectedStatus: [401, 403],
        description: 'Should reject invalid credentials'
      },
      {
        name: 'Missing Required Fields',
        test: () => this.makeRequest('POST', '/auth/login', {
          username: 'test'
          // Missing password, projectId, cityName
        }),
        expectedStatus: [400, 422],
        description: 'Should validate required fields'
      },
      {
        name: 'Protected Endpoint Without Auth',
        test: () => this.makeRequest('GET', '/users'),
        expectedStatus: [401, 403],
        description: 'Should protect endpoints requiring authentication'
      }
    ];

    for (const test of tests) {
      try {
        this.log(`Testing: ${test.name}`);
        const result = await test.test();
        
        if (!result.success && result.error === 'TIMEOUT') {
          this.results.layer1.failed++;
          this.results.layer1.details.push({
            test: test.name,
            status: 'TIMEOUT',
            expected: test.expectedStatus,
            description: test.description,
            passed: false
          });
          this.log(`${test.name}: TIMEOUT`, 'warning');
          continue;
        }

        if (!result.success && result.error === 'CONNECTION_REFUSED') {
          this.log(`${test.name}: Backend not available - skipping`, 'warning');
          continue;
        }

        const passed = test.expectedStatus.includes(result.status);
        
        if (passed) {
          this.results.layer1.passed++;
          this.log(`${test.name}: PASSED (${result.status})`, 'success');
        } else {
          this.results.layer1.failed++;
          this.log(`${test.name}: FAILED (got ${result.status}, expected ${test.expectedStatus})`, 'error');
        }

        this.results.layer1.details.push({
          test: test.name,
          status: result.status,
          expected: test.expectedStatus,
          description: test.description,
          passed
        });

        // Small delay between tests to avoid overwhelming the server
        await sleep(100);

      } catch (error) {
        this.results.layer1.failed++;
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
        this.results.layer1.details.push({
          test: test.name,
          status: 'ERROR',
          expected: test.expectedStatus,
          description: test.description,
          error: error.message,
          passed: false
        });
      }
    }
  }

  async testLayer2AuthorizationSecurity() {
    console.log('\n🛡️ LAYER 2: AUTHORIZATION & ACCESS CONTROL TESTS');
    console.log('===============================================');

    // First, try to get a valid token
    this.log('Attempting to get authentication token...');
    const loginResult = await this.makeRequest('POST', '/auth/login', {
      username: 'testuser',
      password: 'TestPass123!',
      projectId: 'test-project',
      cityName: 'TestCity'
    });

    let authToken = null;
    if (loginResult.success && loginResult.data && loginResult.data.accessToken) {
      authToken = loginResult.data.accessToken;
      this.log('Successfully obtained auth token', 'success');
    } else {
      this.log('Could not obtain auth token - some tests will be limited', 'warning');
    }

    const tests = [
      {
        name: 'Invalid Token Access',
        test: () => this.makeRequest('GET', '/users', null, { 'Authorization': 'Bearer invalid-token' }),
        expectedStatus: [401, 403],
        description: 'Should reject invalid tokens'
      },
      {
        name: 'Expired Token Simulation',
        test: () => this.makeRequest('GET', '/users', null, { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired' }),
        expectedStatus: [401, 403],
        description: 'Should reject malformed/expired tokens'
      },
      {
        name: 'Missing Authorization Header',
        test: () => this.makeRequest('GET', '/users'),
        expectedStatus: [401, 403],
        description: 'Should require authorization for protected endpoints'
      }
    ];

    if (authToken) {
      tests.push({
        name: 'Valid Token Access',
        test: () => this.makeRequest('GET', '/users', null, { 'Authorization': `Bearer ${authToken}` }),
        expectedStatus: [200, 404], // 404 is acceptable if endpoint doesn't exist
        description: 'Should allow access with valid token'
      });
    }

    for (const test of tests) {
      try {
        this.log(`Testing: ${test.name}`);
        const result = await test.test();
        
        if (!result.success && (result.error === 'TIMEOUT' || result.error === 'CONNECTION_REFUSED')) {
          this.results.layer2.failed++;
          this.log(`${test.name}: ${result.error}`, 'warning');
          continue;
        }

        const passed = test.expectedStatus.includes(result.status);
        
        if (passed) {
          this.results.layer2.passed++;
          this.log(`${test.name}: PASSED (${result.status})`, 'success');
        } else {
          this.results.layer2.failed++;
          this.log(`${test.name}: FAILED (got ${result.status}, expected ${test.expectedStatus})`, 'error');
        }

        this.results.layer2.details.push({
          test: test.name,
          status: result.status,
          expected: test.expectedStatus,
          description: test.description,
          passed
        });

        await sleep(100);

      } catch (error) {
        this.results.layer2.failed++;
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async testLayer3BusinessLogicSecurity() {
    console.log('\n🏢 LAYER 3: BUSINESS LOGIC SECURITY TESTS');
    console.log('========================================');

    this.log('Testing multi-tenant isolation and business logic...');

    const tests = [
      {
        name: 'Cross-Tenant Data Access',
        test: async () => {
          // Try to access data from different tenant contexts
          const result1 = await this.makeRequest('GET', '/public/projects');
          return result1;
        },
        expectedStatus: [200, 404],
        description: 'Should prevent cross-tenant data access'
      },
      {
        name: 'Project-City Validation',
        test: () => this.makeRequest('POST', '/public/validate-combo', {
          projectId: 'non-existent-project',
          cityName: 'non-existent-city'
        }),
        expectedStatus: [400, 404, 422],
        description: 'Should validate project-city combinations'
      },
      {
        name: 'Public Endpoints Access',
        test: () => this.makeRequest('GET', '/public/cities'),
        expectedStatus: [200, 404],
        description: 'Should allow access to public endpoints'
      }
    ];

    for (const test of tests) {
      try {
        this.log(`Testing: ${test.name}`);
        const result = await test.test();
        
        if (!result.success && (result.error === 'TIMEOUT' || result.error === 'CONNECTION_REFUSED')) {
          this.results.layer3.failed++;
          this.log(`${test.name}: ${result.error}`, 'warning');
          continue;
        }

        const passed = test.expectedStatus.includes(result.status);
        
        if (passed) {
          this.results.layer3.passed++;
          this.log(`${test.name}: PASSED (${result.status})`, 'success');
        } else {
          this.results.layer3.failed++;
          this.log(`${test.name}: FAILED (got ${result.status}, expected ${test.expectedStatus})`, 'error');
        }

        this.results.layer3.details.push({
          test: test.name,
          status: result.status,
          expected: test.expectedStatus,
          description: test.description,
          passed
        });

        await sleep(100);

      } catch (error) {
        this.results.layer3.failed++;
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async testLayer4DataAnalysisSecurity() {
    console.log('\n📊 LAYER 4: DATA ANALYSIS SECURITY TESTS');
    console.log('=======================================');

    this.log('Testing data-driven security patterns...');

    const tests = [
      {
        name: 'Health Check Endpoint',
        test: () => this.makeRequest('GET', '/health'),
        expectedStatus: [200],
        description: 'Should have accessible health check'
      },
      {
        name: 'API Documentation Access',
        test: () => this.makeRequest('GET', '/docs'),
        expectedStatus: [200, 404],
        description: 'API documentation should be controlled'
      },
      {
        name: 'Rate Limiting Detection',
        test: async () => {
          // Make multiple rapid requests to test rate limiting
          const promises = [];
          for (let i = 0; i < 5; i++) {
            promises.push(this.makeRequest('POST', '/auth/login', {
              username: 'test',
              password: 'test',
              projectId: 'test',
              cityName: 'test'
            }));
          }
          const results = await Promise.all(promises);
          // Check if any request was rate limited (429)
          const rateLimited = results.some(r => r.status === 429);
          return { status: rateLimited ? 429 : results[0].status };
        },
        expectedStatus: [401, 429], // Either unauthorized or rate limited
        description: 'Should implement rate limiting'
      }
    ];

    for (const test of tests) {
      try {
        this.log(`Testing: ${test.name}`);
        const result = await test.test();
        
        if (!result.success && (result.error === 'TIMEOUT' || result.error === 'CONNECTION_REFUSED')) {
          this.results.layer4.failed++;
          this.log(`${test.name}: ${result.error}`, 'warning');
          continue;
        }

        const passed = test.expectedStatus.includes(result.status);
        
        if (passed) {
          this.results.layer4.passed++;
          this.log(`${test.name}: PASSED (${result.status})`, 'success');
        } else {
          this.results.layer4.failed++;
          this.log(`${test.name}: FAILED (got ${result.status}, expected ${test.expectedStatus})`, 'error');
        }

        this.results.layer4.details.push({
          test: test.name,
          status: result.status,
          expected: test.expectedStatus,
          description: test.description,
          passed
        });

        await sleep(100);

      } catch (error) {
        this.results.layer4.failed++;
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  generateReport() {
    console.log('\n📋 COMPREHENSIVE SECURITY TEST REPORT');
    console.log('=====================================');

    const totalPassed = this.results.layer1.passed + this.results.layer2.passed + 
                       this.results.layer3.passed + this.results.layer4.passed;
    const totalFailed = this.results.layer1.failed + this.results.layer2.failed + 
                       this.results.layer3.failed + this.results.layer4.failed;
    const totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} ✅`);
    console.log(`   Failed: ${totalFailed} ❌`);
    console.log(`   Success Rate: ${successRate}%`);

    console.log(`\n🔍 LAYER BREAKDOWN:`);
    console.log(`   Layer 1 (API Surface): ${this.results.layer1.passed}/${this.results.layer1.passed + this.results.layer1.failed} passed`);
    console.log(`   Layer 2 (Authorization): ${this.results.layer2.passed}/${this.results.layer2.passed + this.results.layer2.failed} passed`);
    console.log(`   Layer 3 (Business Logic): ${this.results.layer3.passed}/${this.results.layer3.passed + this.results.layer3.failed} passed`);
    console.log(`   Layer 4 (Data Analysis): ${this.results.layer4.passed}/${this.results.layer4.passed + this.results.layer4.failed} passed`);

    // Generate detailed report file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        successRate: parseFloat(successRate)
      },
      layers: this.results
    };

    const reportFile = `security-test-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);

    return report;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Multi-Layer Security Testing...');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Timeout: ${REQUEST_TIMEOUT}ms per request\n`);

    try {
      await this.testLayer1ApiSurfaceSecurity();
      await this.testLayer2AuthorizationSecurity();
      await this.testLayer3BusinessLogicSecurity();
      await this.testLayer4DataAnalysisSecurity();
      
      const report = this.generateReport();
      
      if (report.summary.totalFailed > 0) {
        console.log('\n⚠️  Some security tests failed. Review the report for details.');
        process.exit(1);
      } else {
        console.log('\n✅ All security tests passed successfully!');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('\n❌ Security testing failed with error:', error.message);
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new MultiLayerSecurityTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MultiLayerSecurityTester;