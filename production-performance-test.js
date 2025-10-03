// production-performance-test.js
// Performance and load testing for production environment

const axios = require('axios');
const fs = require('fs');

class ProductionPerformanceTester {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.testResults = [];
    this.logFile = `performance-test-${new Date().toISOString().split('T')[0]}.log`;
    this.concurrentRequests = 0;
    this.maxConcurrentRequests = 0;
  }

  async runPerformanceTests() {
    console.log('⚡ Starting Production Performance Testing Suite...\n');
    
    try {
      // 1. Response Time Tests
      await this.testResponseTimes();
      
      // 2. Load Testing
      await this.testSystemLoad();
      
      // 3. Concurrent User Testing
      await this.testConcurrentUsers();
      
      // 4. Database Performance
      await this.testDatabasePerformance();
      
      // 5. RFID Access Performance
      await this.testRFIDPerformance();
      
      // 6. Memory and Resource Usage
      await this.testResourceUsage();
      
      // Generate performance report
      await this.generatePerformanceReport();
      
    } catch (error) {
      this.logError('Critical error in performance testing', error);
    }
  }

  async testResponseTimes() {
    console.log('⏱️  Testing API Response Times...');
    
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedMs: 100 },
      { path: '/api/auth/login', method: 'POST', expectedMs: 500, 
        data: { username: 'alice@acme.com', password: 'Alice123!' } },
      { path: '/api/users', method: 'GET', expectedMs: 300, requiresAuth: true },
      { path: '/api/locks', method: 'GET', expectedMs: 300, requiresAuth: true },
      { path: '/api/access-logs', method: 'GET', expectedMs: 500, requiresAuth: true },
      { path: '/api/locations', method: 'GET', expectedMs: 300, requiresAuth: true }
    ];

    let token = null;
    
    for (const endpoint of endpoints) {
      try {
        if (endpoint.requiresAuth && !token) {
          const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
            username: 'alice@acme.com',
            password: 'Alice123!'
          });
          token = loginResponse.data.token;
        }

        const startTime = Date.now();
        
        const config = {
          method: endpoint.method,
          url: `${this.baseUrl}${endpoint.path}`,
          data: endpoint.data,
          headers: endpoint.requiresAuth ? { Authorization: `Bearer ${token}` } : {}
        };

        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          responseTime: responseTime,
          expectedTime: endpoint.expectedMs,
          passed: responseTime <= endpoint.expectedMs,
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        };

        this.logResult(`Response Time - ${endpoint.path}`, result);

      } catch (error) {
        this.logError(`Response Time - ${endpoint.path}`, error);
      }
    }
  }

  async testSystemLoad() {
    console.log('🏋️  Testing System Load Capacity...');
    
    const loadTests = [
      { name: 'Light Load', concurrentUsers: 10, duration: 30000 },
      { name: 'Medium Load', concurrentUsers: 50, duration: 60000 },
      { name: 'Heavy Load', concurrentUsers: 100, duration: 30000 }
    ];

    for (const loadTest of loadTests) {
      console.log(`  Running ${loadTest.name} test...`);
      
      try {
        const result = await this.simulateLoad(
          loadTest.concurrentUsers, 
          loadTest.duration
        );
        
        this.logResult(`Load Test - ${loadTest.name}`, result);
        
        // Wait between tests to allow system recovery
        await this.wait(5000);
        
      } catch (error) {
        this.logError(`Load Test - ${loadTest.name}`, error);
      }
    }
  }

  async simulateLoad(concurrentUsers, duration) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes = [];
    
    // Get authentication token
    const token = await this.getAuthToken();
    
    const userPromises = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userPromise = this.simulateUser(token, endTime, (stats) => {
        totalRequests += stats.requests;
        successfulRequests += stats.successful;
        failedRequests += stats.failed;
        responseTimes.push(...stats.responseTimes);
      });
      
      userPromises.push(userPromise);
    }
    
    await Promise.all(userPromises);
    
    const actualDuration = Date.now() - startTime;
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const requestsPerSecond = totalRequests / (actualDuration / 1000);
    
    return {
      concurrentUsers: concurrentUsers,
      duration: actualDuration,
      totalRequests: totalRequests,
      successfulRequests: successfulRequests,
      failedRequests: failedRequests,
      successRate: (successfulRequests / totalRequests * 100).toFixed(2) + '%',
      averageResponseTime: Math.round(averageResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond),
      passed: failedRequests / totalRequests < 0.05, // Less than 5% failure rate
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }

  async simulateUser(token, endTime, statsCallback) {
    let requests = 0;
    let successful = 0;
    let failed = 0;
    const responseTimes = [];
    
    const endpoints = [
      '/api/users',
      '/api/locks', 
      '/api/access-logs',
      '/api/locations'
    ];
    
    while (Date.now() < endTime) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const startTime = Date.now();
        
        this.concurrentRequests++;
        this.maxConcurrentRequests = Math.max(this.maxConcurrentRequests, this.concurrentRequests);
        
        await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        this.concurrentRequests--;
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        requests++;
        successful++;
        
        // Random delay between requests (100-500ms)
        await this.wait(100 + Math.random() * 400);
        
      } catch (error) {
        this.concurrentRequests--;
        requests++;
        failed++;
        
        // Shorter delay on error
        await this.wait(100);
      }
    }
    
    statsCallback({
      requests: requests,
      successful: successful,
      failed: failed,
      responseTimes: responseTimes
    });
  }

  async testConcurrentUsers() {
    console.log('👥 Testing Concurrent User Capacity...');
    
    const concurrentTests = [
      { users: 10, description: 'Small office' },
      { users: 50, description: 'Medium building' },
      { users: 100, description: 'Large facility' },
      { users: 200, description: 'Campus environment' }
    ];

    for (const test of concurrentTests) {
      console.log(`  Testing ${test.users} concurrent users (${test.description})...`);
      
      try {
        const result = await this.testConcurrentAuthentication(test.users);
        result.description = test.description;
        
        this.logResult(`Concurrent Users - ${test.users}`, result);
        
        await this.wait(3000); // Recovery time
        
      } catch (error) {
        this.logError(`Concurrent Users - ${test.users}`, error);
      }
    }
  }

  async testConcurrentAuthentication(userCount) {
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < userCount; i++) {
      const promise = this.performLogin(`user${i}@test.com`, 'TestPassword123!');
      promises.push(promise);
    }
    
    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      totalUsers: userCount,
      successful: successful,
      failed: failed,
      totalTime: totalTime,
      averageTimePerUser: Math.round(totalTime / userCount),
      successRate: (successful / userCount * 100).toFixed(2) + '%',
      passed: successful / userCount >= 0.95 // 95% success rate
    };
  }

  async testRFIDPerformance() {
    console.log('💳 Testing RFID Access Performance...');
    
    const rfidTests = [
      { 
        name: 'Single RFID Access',
        concurrent: 1,
        iterations: 100,
        expectedAvgMs: 2000
      },
      { 
        name: 'Multiple Concurrent RFID Access',
        concurrent: 10,
        iterations: 50,
        expectedAvgMs: 3000
      },
      { 
        name: 'Peak Hour Simulation',
        concurrent: 25,
        iterations: 20,
        expectedAvgMs: 5000
      }
    ];

    for (const test of rfidTests) {
      console.log(`  Running ${test.name}...`);
      
      try {
        const result = await this.simulateRFIDAccess(
          test.concurrent,
          test.iterations,
          test.expectedAvgMs
        );
        
        this.logResult(`RFID Performance - ${test.name}`, result);
        
      } catch (error) {
        this.logError(`RFID Performance - ${test.name}`, error);
      }
    }
  }

  async simulateRFIDAccess(concurrent, iterations, expectedAvgMs) {
    const responseTimes = [];
    let successful = 0;
    let failed = 0;
    
    for (let batch = 0; batch < iterations; batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < concurrent; i++) {
        const cardId = `test-card-${batch}-${i}`;
        const lockId = `test-lock-${i % 5}`; // Simulate 5 locks
        const deviceId = `device-${i % 3}`; // Simulate 3 devices
        
        const promise = this.performRFIDAccess(cardId, lockId, deviceId);
        batchPromises.push(promise);
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          successful++;
          responseTimes.push(result.value.responseTime);
        } else {
          failed++;
        }
      });
      
      // Small delay between batches
      await this.wait(100);
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    return {
      totalAttempts: concurrent * iterations,
      successful: successful,
      failed: failed,
      averageResponseTime: Math.round(averageResponseTime),
      maxResponseTime: maxResponseTime,
      minResponseTime: minResponseTime,
      expectedAvgMs: expectedAvgMs,
      passed: averageResponseTime <= expectedAvgMs,
      successRate: (successful / (concurrent * iterations) * 100).toFixed(2) + '%'
    };
  }

  async performRFIDAccess(cardId, lockId, deviceId) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/access/attempt`, {
        cardId: cardId,
        lockId: lockId,
        deviceId: deviceId
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        responseTime: responseTime,
        status: response.status,
        access: response.data.access
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw {
        responseTime: responseTime,
        error: error.message
      };
    }
  }

  async testDatabasePerformance() {
    console.log('🗄️  Testing Database Performance...');
    
    const dbTests = [
      { name: 'User Query Performance', endpoint: '/api/users' },
      { name: 'Lock Query Performance', endpoint: '/api/locks' },
      { name: 'Access Log Query Performance', endpoint: '/api/access-logs' },
      { name: 'Location Hierarchy Performance', endpoint: '/api/locations' }
    ];

    const token = await this.getAuthToken();

    for (const test of dbTests) {
      try {
        const results = await this.performDatabaseTest(test.endpoint, token);
        this.logResult(`Database Performance - ${test.name}`, results);
      } catch (error) {
        this.logError(`Database Performance - ${test.name}`, error);
      }
    }
  }

  async performDatabaseTest(endpoint, token) {
    const iterations = 50;
    const responseTimes = [];
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: Math.floor(i / 10) + 1, limit: 10 }
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        successful++;
        
      } catch (error) {
        failed++;
      }
      
      // Small delay between requests
      await this.wait(50);
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    return {
      iterations: iterations,
      successful: successful,
      failed: failed,
      averageResponseTime: Math.round(averageResponseTime),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      passed: averageResponseTime <= 500, // 500ms threshold
      successRate: (successful / iterations * 100).toFixed(2) + '%'
    };
  }

  // Helper methods
  async getAuthToken() {
    const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
      username: 'alice@acme.com',
      password: 'Alice123!'
    });
    return response.data.token;
  }

  async performLogin(username, password) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: username,
        password: password
      });
      
      return {
        responseTime: Date.now() - startTime,
        status: response.status,
        success: true
      };
      
    } catch (error) {
      return {
        responseTime: Date.now() - startTime,
        status: error.response?.status,
        success: false,
        error: error.message
      };
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logResult(testName, result) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const message = `${status} - ${testName}`;
    
    console.log(`  ${message}`);
    if (result.averageResponseTime) {
      console.log(`    Average Response Time: ${result.averageResponseTime}ms`);
    }
    if (result.successRate) {
      console.log(`    Success Rate: ${result.successRate}`);
    }
    
    this.testResults.push({
      test: testName,
      passed: result.passed,
      result: result,
      timestamp: new Date().toISOString()
    });

    // Log to file
    fs.appendFileSync(this.logFile, 
      `${new Date().toISOString()} - ${message}\n${JSON.stringify(result, null, 2)}\n\n`
    );
  }

  logError(testName, error) {
    const message = `❌ ERROR - ${testName}: ${error.message}`;
    console.log(`  ${message}`);
    
    this.testResults.push({
      test: testName,
      passed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Log to file
    fs.appendFileSync(this.logFile, `${new Date().toISOString()} - ${message}\n`);
  }

  async generatePerformanceReport() {
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
      recommendations: this.generatePerformanceRecommendations()
    };

    const reportFile = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📊 PERFORMANCE TEST SUMMARY');
    console.log('============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`\nDetailed report saved to: ${reportFile}`);

    return report;
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    
    const failedTests = this.testResults.filter(r => !r.passed);
    
    if (failedTests.some(t => t.test.includes('Response Time'))) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Slow API response times detected',
        action: 'Optimize database queries and add caching'
      });
    }

    if (failedTests.some(t => t.test.includes('Load Test'))) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'System performance degrades under load',
        action: 'Scale infrastructure and optimize resource usage'
      });
    }

    if (failedTests.some(t => t.test.includes('RFID Performance'))) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'RFID access response times too slow',
        action: 'Optimize access control logic and database queries'
      });
    }

    return recommendations;
  }
}

// Configuration for production testing
const productionConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5000'
};

// Run the performance test suite
async function main() {
  const tester = new ProductionPerformanceTester(productionConfig);
  await tester.runPerformanceTests();
}

// Export for use in other scripts
module.exports = ProductionPerformanceTester;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}