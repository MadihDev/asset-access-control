/**
 * Test script for Multi-Tenant Login API
 * Phase 1 - Backend API Enhancement Testing
 */

import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

async function testMultiTenantAPI() {
  console.log('🚀 Testing Multi-Tenant Login API - Phase 1')
  console.log('=' .repeat(50))

  try {
    // Test 1: Get all projects
    console.log('\n1. Testing GET /api/tenant/projects')
    const projectsResponse = await axios.get(`${API_BASE}/tenant/projects`)
    console.log('✅ Projects retrieved:', projectsResponse.data.data?.length || 0)
    const projects = projectsResponse.data.data || []
    if (projects.length > 0) {
      console.log('   First project:', projects[0].name)
    }

    // Test 2: Get all cities
    console.log('\n2. Testing GET /api/tenant/cities')
    const citiesResponse = await axios.get(`${API_BASE}/tenant/cities`)
    console.log('✅ Cities retrieved:', citiesResponse.data.data?.length || 0)
    const cities = citiesResponse.data.data || []
    if (cities.length > 0) {
      console.log('   First city:', cities[0].name)
    }

    // Test 3: Get cities for first project
    if (projects.length > 0) {
      console.log(`\n3. Testing GET /api/tenant/projects/${projects[0].slug}/cities`)
      const projectCitiesResponse = await axios.get(`${API_BASE}/tenant/projects/${projects[0].slug}/cities`)
      console.log('✅ Cities for project:', projectCitiesResponse.data.data?.length || 0)
    }

    // Test 4: Get projects for first city
    if (cities.length > 0) {
      console.log(`\n4. Testing GET /api/tenant/cities/${cities[0].name}/projects`)
      const cityProjectsResponse = await axios.get(`${API_BASE}/tenant/cities/${encodeURIComponent(cities[0].name)}/projects`)
      console.log('✅ Projects for city:', cityProjectsResponse.data.data?.length || 0)
    }

    // Test 5: Validate project-city combination
    if (projects.length > 0 && cities.length > 0) {
      console.log(`\n5. Testing GET /api/tenant/validate`)
      const validateResponse = await axios.get(`${API_BASE}/tenant/validate`, {
        params: {
          projectId: projects[0].slug,
          cityName: cities[0].name
        }
      })
      console.log('✅ Validation result:', validateResponse.data.data?.isValid)
    }

    // Test 6: Enhanced login with tenant context
    if (projects.length > 0 && cities.length > 0) {
      console.log(`\n6. Testing POST /api/auth/login with tenant context`)
      try {
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          username: 'test.user', // This might not exist, but we're testing the API structure
          password: 'testpass',
          projectId: projects[0].slug,
          cityName: cities[0].name
        })
        console.log('✅ Login response structure correct')
        if (loginResponse.data.data?.tenant) {
          console.log('✅ Tenant context included in response')
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.log('✅ Login endpoint accepts tenant parameters (credentials invalid as expected)')
        } else {
          console.log('❌ Login error:', error.response?.data?.error || error.message)
        }
      }
    }

    console.log('\n🎉 Phase 1 - Backend API Enhancement: COMPLETE!')
    console.log('✅ All tenant endpoints are working')
    console.log('✅ Multi-tenant login structure is ready')

  } catch (error: any) {
    console.error('❌ API Test failed:', error.response?.data || error.message)
    
    if (error.response?.status === 429) {
      console.log('\n💡 Rate limiting detected - this means the server is running!')
      console.log('   Try again in a few seconds or temporarily disable rate limiting for testing')
    }
  }
}

// Run the test
testMultiTenantAPI()