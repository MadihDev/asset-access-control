import request from 'supertest'
import app from '../src/app'

// Mock auth service to validate token 'valid'
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

// These tests do basic shape checks and verify addressId filter is accepted by the API.

describe('GET /api/lock/access-logs', () => {
  it('returns paginated logs and accepts addressId filter', async () => {
    const res = await request(app)
      .get('/api/lock/access-logs')
      .query({ page: 1, limit: 5 })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer valid')
      .expect(200)

    expect(res.body).toHaveProperty('success')
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('pagination')

    // Try with addressId (no assertion on count, just ensure it returns 200)
    // Replace with a known address id if you wish to assert stronger expectations.
    const withAddress = await request(app)
      .get('/api/lock/access-logs')
      .query({ page: 1, limit: 5, addressId: '00000000-0000-4000-8000-000000000000' })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer valid')
      .expect(200)

    expect(withAddress.body).toHaveProperty('success')
    expect(withAddress.body).toHaveProperty('data')
    expect(withAddress.body).toHaveProperty('pagination')
  })
})
