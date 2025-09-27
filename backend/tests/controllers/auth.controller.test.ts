import request from 'supertest'
import { Express } from 'express'
import app from '../../src/app'
import { createTestUser, createTestProjectCity, cleanupTestData } from '../helpers/testData'
import jwt from 'jsonwebtoken'

describe('Auth Controller', () => {
  let testProjectCity: any

  beforeAll(async () => {
    testProjectCity = await createTestProjectCity()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      // Create test user
      const testUser = await createTestUser({
        username: 'logintest',
        email: 'logintest@example.com',
        password: 'Password123!',
        projectCityId: testProjectCity.id
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'logintest',
          password: 'Password123!'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.username).toBe('logintest')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should reject login for inactive user', async () => {
      const testUser = await createTestUser({
        username: 'inactiveuser',
        password: 'Password123!',
        isActive: false,
        projectCityId: testProjectCity.id
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'inactiveuser',
          password: 'Password123!'
        })

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const testUser = await createTestUser({
        username: 'profiletest',
        projectCityId: testProjectCity.id
      })

      const token = jwt.sign(
        { 
          userId: testUser.id, 
          username: testUser.username,
          projectCityId: testUser.projectCityId 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.id).toBe(testUser.id)
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/refresh-token', () => {
    it('should handle refresh token request', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token'
        })

      // Should return an error for invalid refresh token
      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout user with valid token', async () => {
      const testUser = await createTestUser({
        username: 'logouttest',
        projectCityId: testProjectCity.id
      })

      const token = jwt.sign(
        { 
          userId: testUser.id, 
          username: testUser.username,
          projectCityId: testUser.projectCityId 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      )

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
    })
  })
})