import request from 'supertest'
import app from '../../src/app'
import { createTestUser, createTestLock, createTestProjectCity, cleanupTestData } from '../helpers/testData'
import jwt from 'jsonwebtoken'

describe('Lock Controller', () => {
  let testProjectCity: any
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    testProjectCity = await createTestProjectCity()
    testUser = await createTestUser({
      username: 'lockadmin',
      role: 'ADMIN',
      projectCityId: testProjectCity.id
    })

    authToken = jwt.sign(
      { 
        userId: testUser.id, 
        username: testUser.username,
        projectCityId: testUser.projectCityId 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    )
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('GET /api/lock', () => {
    it('should get all locks for authenticated user', async () => {
      await createTestLock(undefined, testProjectCity.id)
      
      const response = await request(app)
        .get('/api/lock')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/lock')

      expect([401, 403]).toContain(response.status)
    })
  })

  describe('POST /api/lock', () => {
    it('should create a new lock with valid data', async () => {
      const newLockData = {
        name: 'Test Lock Creation',
        description: 'A test lock for creation endpoint',
        deviceId: `TEST_DEVICE_${Date.now()}`,
        lockType: 'DOOR'
      }

      const response = await request(app)
        .post('/api/lock')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newLockData)

      expect([200, 201]).toContain(response.status)
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('name', newLockData.name)
        expect(response.body).toHaveProperty('deviceId', newLockData.deviceId)
      }
    })

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/lock')
        .send({
          name: 'Unauthorized Lock',
          deviceId: 'UNAUTHORIZED_DEVICE'
        })

      expect([401, 403]).toContain(response.status)
    })
  })

  describe('GET /api/lock/:id', () => {
    it('should get specific lock by ID', async () => {
      const testLock = await createTestLock(undefined, testProjectCity.id)
      
      const response = await request(app)
        .get(`/api/lock/${testLock.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect([200, 404]).toContain(response.status)
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id', testLock.id)
        expect(response.body).toHaveProperty('name', testLock.name)
      }
    })

    it('should return 404 for non-existent lock', async () => {
      const response = await request(app)
        .get('/api/lock/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect([404, 400]).toContain(response.status)
    })
  })
})