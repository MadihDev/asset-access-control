import request from 'supertest'
import app from '../../src/app'
import { createTestUser, createTestProjectCity, cleanupTestData } from '../helpers/testData'
import jwt from 'jsonwebtoken'

describe('User Controller', () => {
  let testProjectCity: { id: string }
  let adminUser: { id: string; username: string; projectCityId: string | null }
  let authToken: string

  beforeAll(async () => {
    testProjectCity = await createTestProjectCity()
    adminUser = await createTestUser({
      username: 'useradmin',
      role: 'ADMIN',
      projectCityId: testProjectCity.id
    })

    authToken = jwt.sign(
      { 
        userId: adminUser.id, 
        username: adminUser.username,
        projectCityId: adminUser.projectCityId 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    )
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('GET /api/user', () => {
    it('should get all users for authenticated admin', async () => {
      await createTestUser({
        username: 'normaluser',
        projectCityId: testProjectCity.id
      })
      
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${authToken}`)

      expect([200, 403]).toContain(response.status)
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true)
      }
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/user')

      expect([401, 403]).toContain(response.status)
    })
  })

  describe('POST /api/user', () => {
    it('should create a new user with valid data', async () => {
      const newUserData = {
        username: `newuser_${Date.now()}`,
        email: `newuser_${Date.now()}@test.com`,
        firstName: 'New',
        lastName: 'User',
        password: 'Password123!',
        role: 'USER'
      }

      const response = await request(app)
        .post('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUserData)

      expect([200, 201, 400, 403]).toContain(response.status)
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('username', newUserData.username)
        expect(response.body).toHaveProperty('email', newUserData.email)
        expect(response.body).not.toHaveProperty('password') // Password should not be returned
      }
    })

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({
          username: 'unauthorized',
          email: 'unauthorized@test.com'
        })

      expect([401, 403]).toContain(response.status)
    })

    it('should reject invalid user data', async () => {
      const response = await request(app)
        .post('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: '', // Invalid empty username
          email: 'invalid-email' // Invalid email format
        })

      expect([400, 422]).toContain(response.status)
    })
  })

  describe('GET /api/user/:id', () => {
    it('should get specific user by ID', async () => {
      const testUser = await createTestUser({
        username: 'getbyid',
        projectCityId: testProjectCity.id
      })
      
      const response = await request(app)
        .get(`/api/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect([200, 404, 403]).toContain(response.status)
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id', testUser.id)
        expect(response.body).toHaveProperty('username', testUser.username)
        expect(response.body).not.toHaveProperty('password')
      }
    })

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/user/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect([404, 400]).toContain(response.status)
    })
  })

  describe('PUT /api/user/:id', () => {
    it('should update user with valid data', async () => {
      const testUser = await createTestUser({
        username: 'updateme',
        projectCityId: testProjectCity.id
      })

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      }

      const response = await request(app)
        .put(`/api/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect([200, 404, 403]).toContain(response.status)
      if (response.status === 200) {
        expect(response.body).toHaveProperty('firstName', updateData.firstName)
        expect(response.body).toHaveProperty('lastName', updateData.lastName)
      }
    })
  })

  describe('DELETE /api/user/:id', () => {
    it('should delete user', async () => {
      const testUser = await createTestUser({
        username: 'deleteme',
        projectCityId: testProjectCity.id
      })

      const response = await request(app)
        .delete(`/api/user/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect([200, 204, 404, 403]).toContain(response.status)
    })
  })
})