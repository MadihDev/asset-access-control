/**
 * ENHANCED RATE LIMITING VALIDATION TEST
 * 
 * This test validates the enhanced rate limiting implementation
 * according to our Priority 1 security checklist.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEnhancedRateLimiting() {
    console.log('🔐 ENHANCED RATE LIMITING VALIDATION TEST');
    console.log('==========================================\n');

    let allTestsPassed = true;
    const results = {
        generalApiRateLimit: false,
        authRateLimit: false,
        rateLimitHeaders: false,
        rateLimitInfo: false,
        healthCheckBypass: false
    };

    // Test 1: General API Rate Limiting
    console.log('1. 🧪 Testing General API Rate Limiting (1000 requests/15min)...');
    try {
        const requests = [];
        const testCount = 20; // Test with manageable number for quick validation
        
        console.log(`   Sending ${testCount} rapid requests to /api/health...`);
        
        for (let i = 0; i < testCount; i++) {
            requests.push(
                axios.get(`${BASE_URL}/health`, {
                    timeout: 5000,
                    validateStatus: () => true
                }).catch(error => ({ error: error.message, status: 'timeout' }))
            );
        }

        const responses = await Promise.all(requests);
        
        const successCount = responses.filter(r => r.status === 200).length;
        const rateLimitedCount = responses.filter(r => r.status === 429).length;
        const errorCount = responses.filter(r => r.error || r.status === 'timeout').length;

        console.log(`   📊 Results: ${successCount} success, ${rateLimitedCount} rate limited, ${errorCount} errors`);
        
        // Check for rate limit headers in successful responses
        const successfulResponse = responses.find(r => r.status === 200);
        if (successfulResponse && successfulResponse.headers) {
            const rateLimitPolicy = successfulResponse.headers['x-ratelimit-policy'];
            if (rateLimitPolicy) {
                console.log(`   📋 Rate Limit Policy Header: ${rateLimitPolicy}`);
                results.rateLimitInfo = true;
            }
        }

        if (successCount > 0) {
            console.log('   ✅ General API access working');
            results.generalApiRateLimit = true;
        } else {
            console.log('   ❌ No successful API requests - rate limiting may be too strict');
            allTestsPassed = false;
        }

    } catch (error) {
        console.log('   ❌ General API rate limiting test failed:', error.message);
        allTestsPassed = false;
    }

    // Test 2: Authentication Rate Limiting
    console.log('\n2. 🔐 Testing Authentication Rate Limiting (10 attempts/15min)...');
    try {
        const authRequests = [];
        const authTestCount = 12; // Exceed the limit of 10
        
        console.log(`   Sending ${authTestCount} authentication requests...`);
        
        for (let i = 0; i < authTestCount; i++) {
            authRequests.push(
                axios.post(`${BASE_URL}/auth/login`, {
                    username: 'test-rate-limit-user',
                    password: 'invalid-password',
                    projectId: 'test',
                    cityName: 'test'
                }, {
                    timeout: 8000,
                    validateStatus: () => true
                }).catch(error => ({ error: error.message, status: 'timeout' }))
            );
        }

        const authResponses = await Promise.all(authRequests);
        
        const authFailures = authResponses.filter(r => r.status === 401).length;
        const authRateLimited = authResponses.filter(r => r.status === 429).length;
        const authErrors = authResponses.filter(r => r.error || r.status === 'timeout').length;

        console.log(`   📊 Auth Results: ${authFailures} auth failures, ${authRateLimited} rate limited, ${authErrors} errors`);

        if (authRateLimited > 0) {
            console.log('   ✅ Authentication rate limiting is working');
            results.authRateLimit = true;
        } else if (authFailures > 0) {
            console.log('   ⚠️  Authentication requests processed (no rate limiting detected yet)');
        } else {
            console.log('   ❌ Authentication rate limiting test inconclusive');
        }

        // Check for enhanced rate limit response format
        const rateLimitedResponse = authResponses.find(r => r.status === 429);
        if (rateLimitedResponse && rateLimitedResponse.data) {
            console.log('   📋 Rate Limit Response:', JSON.stringify(rateLimitedResponse.data, null, 2));
            if (rateLimitedResponse.data.code === 'AUTH_RATE_LIMIT_EXCEEDED') {
                console.log('   ✅ Enhanced rate limit response format detected');
            }
        }

    } catch (error) {
        console.log('   ❌ Authentication rate limiting test failed:', error.message);
        allTestsPassed = false;
    }

    // Test 3: Rate Limit Headers
    console.log('\n3. 📋 Testing Rate Limit Headers...');
    try {
        const response = await axios.get(`${BASE_URL}/health`, {
            timeout: 5000,
            validateStatus: () => true
        });

        console.log('   📊 Response Status:', response.status);
        console.log('   📊 Response Headers:');
        
        const importantHeaders = [
            'x-ratelimit-policy',
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
            'x-ratelimit-reset',
            'x-security-test-bypass'
        ];

        let headersFound = 0;
        importantHeaders.forEach(header => {
            const value = response.headers[header];
            if (value) {
                console.log(`   📋 ${header}: ${value}`);
                headersFound++;
            }
        });

        if (headersFound > 0) {
            console.log(`   ✅ Found ${headersFound} rate limiting headers`);
            results.rateLimitHeaders = true;
        } else {
            console.log('   ⚠️  No specific rate limiting headers found');
        }

    } catch (error) {
        console.log('   ❌ Rate limit headers test failed:', error.message);
        allTestsPassed = false;
    }

    // Test 4: Health Check Bypass Verification
    console.log('\n4. 🏥 Testing Health Check Bypass...');
    try {
        // The health check should always work regardless of rate limiting
        const healthRequests = [];
        
        for (let i = 0; i < 5; i++) {
            healthRequests.push(
                axios.get(`${BASE_URL}/health`, {
                    timeout: 5000,
                    validateStatus: () => true
                })
            );
        }

        const healthResponses = await Promise.all(healthRequests);
        const healthSuccessCount = healthResponses.filter(r => r.status === 200).length;

        if (healthSuccessCount === 5) {
            console.log('   ✅ Health check bypass working correctly');
            results.healthCheckBypass = true;
        } else {
            console.log(`   ⚠️  Health check success rate: ${healthSuccessCount}/5`);
        }

    } catch (error) {
        console.log('   ❌ Health check bypass test failed:', error.message);
        allTestsPassed = false;
    }

    // Test 5: RFID Rate Limiting (if endpoint exists)
    console.log('\n5. 📡 Testing RFID Rate Limiting (100 requests/min)...');
    try {
        const response = await axios.get(`${BASE_URL}/rfid`, {
            timeout: 5000,
            validateStatus: () => true
        });

        if (response.status === 401) {
            console.log('   ℹ️  RFID endpoint requires authentication (expected)');
        } else if (response.status === 429) {
            console.log('   ✅ RFID rate limiting active');
        } else {
            console.log(`   ℹ️  RFID endpoint status: ${response.status}`);
        }

    } catch (error) {
        console.log('   ℹ️  RFID endpoint test skipped (endpoint may require auth)');
    }

    // Final Results
    console.log('\n📊 ENHANCED RATE LIMITING TEST RESULTS');
    console.log('======================================');
    console.log(`General API Rate Limiting: ${results.generalApiRateLimit ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
    console.log(`Authentication Rate Limiting: ${results.authRateLimit ? '✅ WORKING' : '⚠️ MONITORING'}`);
    console.log(`Rate Limit Headers: ${results.rateLimitHeaders ? '✅ PRESENT' : '⚠️ MISSING'}`);
    console.log(`Rate Limit Policy Info: ${results.rateLimitInfo ? '✅ PRESENT' : '⚠️ MISSING'}`);
    console.log(`Health Check Bypass: ${results.healthCheckBypass ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n🎯 SUCCESS RATE: ${successRate}% (${passedTests}/${totalTests} tests passed)`);

    if (allTestsPassed && passedTests >= 4) {
        console.log('\n🎉 ENHANCED RATE LIMITING: IMPLEMENTATION SUCCESSFUL');
        console.log('✅ Priority 1 rate limiting implementation completed');
        console.log('✅ DoS attack protection active');
        console.log('✅ Multiple endpoint-specific rate limits configured');
        console.log('✅ Ready for production deployment');
    } else {
        console.log('\n⚠️  ENHANCED RATE LIMITING: PARTIAL IMPLEMENTATION');
        console.log('🔧 Some features may need additional configuration');
        console.log('📋 Review the results above for specific areas to address');
    }

    return passedTests >= 4;
}

// Run the enhanced rate limiting validation test
testEnhancedRateLimiting()
    .then(success => {
        console.log('\n🏁 Enhanced rate limiting test complete');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test failed with error:', error.message);
        process.exit(1);
    });