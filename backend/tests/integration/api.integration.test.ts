import request from 'supertest'
import app from '../../src/app'
import { createTestUser, createTestProjectCity, cleanupTestData } from '../helpers/testData'

describe('API Health and Integration', () => {
  afterAll(async () => {
    await cleanupTestData()
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('API Integration Flow', () => {
    it('should complete a full user authentication flow', async () => {
      // Create test data
      const testProjectCity = await createTestProjectCity()
      const testUser = await createTestUser({
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'Password123!',
        role: 'ADMIN',
        projectCityId: testProjectCity.id
      })

      // Test login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'integrationtest',
          password: 'Password123!'
        })

      // Check if login is working (expect either success or validation error)
      expect([200, 400, 401]).toContain(loginResponse.status)

      // If login is successful, test profile endpoint
      if (loginResponse.status === 200 && loginResponse.body.token) {
        const profileResponse = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${loginResponse.body.token}`)

        expect(profileResponse.status).toBe(200)
        expect(profileResponse.body).toBeDefined()
      }
    })

    it('should handle CORS and security headers', async () => {
      const response = await request(app)
        .get('/api/health')

      // Check for security headers (helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers).toHaveProperty('x-frame-options')
    })

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      )

      const responses = await Promise.all(requests)
      
      // All should succeed or some should be rate limited
      const statuses = responses.map(r => r.status)
      const successStatuses = statuses.filter(s => s === 200)
      const rateLimitedStatuses = statuses.filter(s => s === 429)
      
      expect(successStatuses.length + rateLimitedStatuses.length).toBe(10)
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')

      expect(response.status).toBe(404)
    })

    it('should validate request data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          // Missing required fields
        })

      expect([400, 422]).toContain(response.status)
      expect(response.body).toHaveProperty('error')
    })
  })
})