import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../../src/middleware/auth.middleware'
import { createTestUser, createTestProjectCity, cleanupTestData } from '../helpers/testData'

// Mock Express request and response objects
const mockRequest = (authorization?: string): Partial<Request> => ({
  headers: {
    authorization
  }
})

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext: NextFunction = jest.fn()

describe('Auth Middleware', () => {
  let testUser: any
  let validToken: string

  beforeAll(async () => {
    const testProjectCity = await createTestProjectCity()
    testUser = await createTestUser({
      username: 'authtest',
      projectCityId: testProjectCity.id
    })

    validToken = jwt.sign(
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const req = mockRequest(`Bearer ${validToken}`) as Request
      const res = mockResponse() as Response
      const next = mockNext

      await authenticateToken(req, res, next)

      expect(next).toHaveBeenCalledWith()
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe(testUser.id)
    })

    it('should reject request without authorization header', async () => {
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext

      await authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject invalid token format', async () => {
      const req = mockRequest('Invalid token format') as Request
      const res = mockResponse() as Response
      const next = mockNext

      await authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject invalid token', async () => {
      const req = mockRequest('Bearer invalid-token') as Request
      const res = mockResponse() as Response
      const next = mockNext

      await authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { 
          userId: testUser.id, 
          username: testUser.username,
          projectCityId: testUser.projectCityId 
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      )

      const req = mockRequest(`Bearer ${expiredToken}`) as Request
      const res = mockResponse() as Response
      const next = mockNext

      await authenticateToken(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
      expect(next).not.toHaveBeenCalled()
    })
  })
})