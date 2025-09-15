import request from 'supertest'
import app from '../src/app'

// Mock auth service to always validate token as ADMIN user
jest.mock('../src/services/auth.service', () => ({
  __esModule: true,
  default: {
    validateToken: jest.fn(async (token: string) => {
      if (token === 'valid') {
        return { id: 'u-admin', email: 'admin@example.com', role: 'ADMIN' }
      }
      return null
    }),
  },
}))

describe('GET /api/user (users list)', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/user')
    expect(res.status).toBe(401)
  })

  it('allows ADMIN with valid token', async () => {
    const res = await request(app).get('/api/user').set('Authorization', 'Bearer valid')
    // We only check that the route is reachable and returns structured data or errors upstream
    // Since DB may not be available in test env, expect 200 or 500 but not 401/403
    expect([200, 500]).toContain(res.status)
  })
})
