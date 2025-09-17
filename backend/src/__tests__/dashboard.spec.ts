import request from 'supertest'
import app from '../../src/app'

// Mock auth service to validate token 'valid'
jest.mock('../../src/services/auth.service', () => ({
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

// Note: these tests assume the dev seed has at least one city, address, lock, and user.
// They are minimal shape tests and won't assert exact counts in your data.

describe('GET /api/dashboard', () => {
  it('returns overall stats and locations array with expected fields', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer valid')
      // In tests we skip auth middleware by not mounting it, or you can mock if needed
      .expect(200)

    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')

    const data = res.body.data
    expect(data).toHaveProperty('totalUsers')
    expect(data).toHaveProperty('totalLocks')
    expect(data).toHaveProperty('totalAccessAttempts')
    expect(data).toHaveProperty('successfulAccess')
    expect(data).toHaveProperty('onlineLocks')
    expect(data).toHaveProperty('recentAccessLogs')

    if (Array.isArray(data.locations) && data.locations.length > 0) {
      const loc = data.locations[0]
      expect(loc).toHaveProperty('addressId')
      expect(loc).toHaveProperty('name')
      expect(loc).toHaveProperty('cityId')
      expect(loc).toHaveProperty('totalLocks')
      expect(loc).toHaveProperty('activeLocks')
      expect(loc).toHaveProperty('activeUsers')
      expect(loc).toHaveProperty('activeKeys')
      // New fields
      expect(loc).toHaveProperty('totalAttempts')
      expect(loc).toHaveProperty('successfulAttempts')
      expect(loc).toHaveProperty('successRate')
    }
  })
})
