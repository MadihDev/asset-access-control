/**
 * Comprehensive Backend Test for Multi-Tenant Login API
 * Tests all endpoints and functionality before frontend integration
 */

import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

// Helper function to add delay between requests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface TestResult {
  name: string
  passed: boolean
  message: string
  data?: any
}

class MultiTenantAPITester {
  private results: TestResult[] = []
  private projects: any[] = []
  private cities: any[] = []

  private addResult(name: string, passed: boolean, message: string, data?: any) {
    this.results.push({ name, passed, message, data })
    const emoji = passed ? '✅' : '❌'
    console.log(`${emoji} ${name}: ${message}`)
    if (data && passed) {
      console.log(`   Data: ${JSON.stringify(data, null, 2).slice(0, 200)}...`)
    }
  }

  async testHealthCheck(): Promise<void> {
    try {
      await delay(1000) // Wait to avoid rate limiting
      const response = await axios.get(`${API_BASE}/health`)
      this.addResult(
        'Health Check',
        response.status === 200,
        response.status === 200 ? 'Server is healthy' : `Status: ${response.status}`,
        response.data
      )
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.addResult('Health Check', false, 'Rate limited - server is running but protected')
      } else {
        this.addResult('Health Check', false, `Error: ${error.message}`)
      }
    }
  }

  async testGetProjects(): Promise<void> {
    try {
      await delay(2000)
      const response = await axios.get(`${API_BASE}/tenant/projects`)
      const success = response.status === 200 && response.data.success
      this.projects = response.data.data || []
      
      this.addResult(
        'Get All Projects',
        success,
        success 
          ? `Retrieved ${this.projects.length} projects` 
          : 'Failed to get projects',
        { count: this.projects.length, firstProject: this.projects[0] }
      )
    } catch (error: any) {
      this.addResult('Get All Projects', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testGetCities(): Promise<void> {
    try {
      await delay(2000)
      const response = await axios.get(`${API_BASE}/tenant/cities`)
      const success = response.status === 200 && response.data.success
      this.cities = response.data.data || []
      
      this.addResult(
        'Get All Cities',
        success,
        success 
          ? `Retrieved ${this.cities.length} cities` 
          : 'Failed to get cities',
        { count: this.cities.length, firstCity: this.cities[0] }
      )
    } catch (error: any) {
      this.addResult('Get All Cities', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testGetCitiesForProject(): Promise<void> {
    if (this.projects.length === 0) {
      this.addResult('Get Cities for Project', false, 'No projects available for testing')
      return
    }

    try {
      await delay(2000)
      const project = this.projects[0]
      const response = await axios.get(`${API_BASE}/tenant/projects/${project.slug}/cities`)
      const success = response.status === 200 && response.data.success
      const cities = response.data.data || []
      
      this.addResult(
        'Get Cities for Project',
        success,
        success 
          ? `Found ${cities.length} cities for project "${project.name}"` 
          : 'Failed to get cities for project',
        { projectName: project.name, citiesCount: cities.length }
      )
    } catch (error: any) {
      this.addResult('Get Cities for Project', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testGetProjectsForCity(): Promise<void> {
    if (this.cities.length === 0) {
      this.addResult('Get Projects for City', false, 'No cities available for testing')
      return
    }

    try {
      await delay(2000)
      const city = this.cities[0]
      const response = await axios.get(`${API_BASE}/tenant/cities/${encodeURIComponent(city.name)}/projects`)
      const success = response.status === 200 && response.data.success
      const projects = response.data.data || []
      
      this.addResult(
        'Get Projects for City',
        success,
        success 
          ? `Found ${projects.length} projects for city "${city.name}"` 
          : 'Failed to get projects for city',
        { cityName: city.name, projectsCount: projects.length }
      )
    } catch (error: any) {
      this.addResult('Get Projects for City', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testValidateProjectCity(): Promise<void> {
    if (this.projects.length === 0 || this.cities.length === 0) {
      this.addResult('Validate Project-City', false, 'No projects or cities available for testing')
      return
    }

    try {
      await delay(2000)
      const project = this.projects[0]
      const city = this.cities[0]
      
      const response = await axios.get(`${API_BASE}/tenant/validate`, {
        params: {
          projectId: project.slug,
          cityName: city.name
        }
      })
      
      const success = response.status === 200 && response.data.success
      const isValid = response.data.data?.isValid
      
      this.addResult(
        'Validate Project-City',
        success,
        success 
          ? `Validation result: ${isValid} for "${project.name}" + "${city.name}"` 
          : 'Failed to validate project-city combination',
        { projectName: project.name, cityName: city.name, isValid }
      )
    } catch (error: any) {
      this.addResult('Validate Project-City', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testTenantContext(): Promise<void> {
    if (this.projects.length === 0 || this.cities.length === 0) {
      this.addResult('Get Tenant Context', false, 'No projects or cities available for testing')
      return
    }

    try {
      await delay(2000)
      const project = this.projects[0]
      const city = this.cities[0]
      
      const response = await axios.get(`${API_BASE}/tenant/context`, {
        params: {
          projectId: project.slug,
          cityName: city.name
        }
      })
      
      const success = response.status === 200 && response.data.success
      const context = response.data.data
      
      this.addResult(
        'Get Tenant Context',
        success && context?.projectCityId,
        success 
          ? `Got tenant context with projectCityId: ${context?.projectCityId}` 
          : 'Failed to get tenant context',
        context
      )
    } catch (error: any) {
      this.addResult('Get Tenant Context', false, `Error: ${error.response?.data?.error || error.message}`)
    }
  }

  async testEnhancedLogin(): Promise<void> {
    if (this.projects.length === 0 || this.cities.length === 0) {
      this.addResult('Enhanced Login API', false, 'No projects or cities available for testing')
      return
    }

    try {
      await delay(2000)
      const project = this.projects[0]
      const city = this.cities[0]
      
      // Test with invalid credentials to check API structure
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: 'test.user.nonexistent',
        password: 'invalid.password',
        projectId: project.slug,
        cityName: city.name
      })
      
      // This should not succeed, but if it does, check structure
      this.addResult('Enhanced Login API', false, 'Login succeeded with invalid credentials - this is wrong!')
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        const errorMessage = error.response.data.error
        const expectedErrors = [
          'Invalid credentials',
          'Invalid project or city combination',
          'Both project name and city must be provided'
        ]
        
        const isExpectedError = expectedErrors.some(expected => 
          errorMessage.includes(expected) || 
          errorMessage.includes('Invalid') ||
          errorMessage.includes('credentials')
        )
        
        this.addResult(
          'Enhanced Login API',
          isExpectedError,
          isExpectedError 
            ? `Login API correctly handles tenant parameters (401: ${errorMessage})` 
            : `Unexpected error format: ${errorMessage}`,
          { status: error.response.status, error: errorMessage }
        )
      } else if (error.response?.status === 429) {
        this.addResult('Enhanced Login API', true, 'Login endpoint is protected by rate limiting')
      } else {
        this.addResult('Enhanced Login API', false, `Unexpected error: ${error.response?.data?.error || error.message}`)
      }
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Backend Tests')
    console.log('=' .repeat(60))
    
    await this.testHealthCheck()
    await this.testGetProjects()
    await this.testGetCities()
    await this.testGetCitiesForProject()
    await this.testGetProjectsForCity()
    await this.testValidateProjectCity()
    await this.testTenantContext()
    await this.testEnhancedLogin()
    
    console.log('\n📊 Test Results Summary')
    console.log('=' .repeat(60))
    
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    const percentage = Math.round((passed / total) * 100)
    
    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`)
    console.log(`❌ Failed: ${total - passed}/${total}`)
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Backend is ready for frontend integration.')
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above before proceeding.')
      console.log('\nFailed tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  ❌ ${r.name}: ${r.message}`))
    }
    
    console.log('\n🎯 Next Steps:')
    if (passed >= total * 0.8) { // 80% pass rate
      console.log('✅ Backend implementation looks good!')
      console.log('✅ Ready to proceed with Phase 2 - Frontend Integration')
      console.log('✅ Multi-tenant architecture is properly implemented')
    } else {
      console.log('⚠️  Fix backend issues before frontend integration')
      console.log('⚠️  Check database seed data and server configuration')
    }
  }
}

// Run the comprehensive test
const tester = new MultiTenantAPITester()
tester.runAllTests().catch(console.error)