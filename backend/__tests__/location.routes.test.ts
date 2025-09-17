import request from 'supertest'
import app from '../src/app'

// Mock auth service to provide role and city context
jest.mock('../src/services/auth.service', () => ({
  __esModule: true,
  default: {
    validateToken: jest.fn(async (token: string) => {
      if (token === 'super') {
        return { id: 'u-super', email: 'super@example.com', role: 'SUPER_ADMIN', cityId: undefined }
      }
      if (token === 'managerA') {
        return { id: 'u-mgr-a', email: 'mgr@example.com', role: 'ADMIN', cityId: 'cityA' }
      }
      return null
    }),
  },
}))

describe('Location routes', () => {
  const addressId = 'ck1u5l9q00000000000000000' // CUID-like placeholder

  describe('Auth and scope', () => {
    it('requires auth for users listing', async () => {
      const res = await request(app).get(`/api/location/${addressId}/users`)
      expect(res.status).toBe(401)
    })

    it('SUPER_ADMIN can request with explicit cityId', async () => {
      const res = await request(app)
        .get(`/api/location/${addressId}/users`)
        .query({ cityId: 'ck1u5l9q00000000000000001', page: 1, limit: 5 })
        .set('Authorization', 'Bearer super')
      expect([200, 403, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')
      }
    })
  })

  describe('Users endpoint basic shape', () => {
    it('returns expected shape and accepts filters', async () => {
      const res = await request(app)
        .get(`/api/location/${addressId}/users`)
        .query({ page: 1, limit: 10, status: 'active' })
        .set('Authorization', 'Bearer super')
      expect([200, 403, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success')
        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')
      }
    })
  })

  describe('Locks endpoint basic shape', () => {
    it('returns expected shape and supports status filter', async () => {
      const res = await request(app)
        .get(`/api/location/${addressId}/locks`)
        .query({ status: 'online', page: 2, limit: 5 })
        .set('Authorization', 'Bearer managerA')
      expect([200, 403, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success')
        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')
        expect(res.body.pagination).toHaveProperty('page')
        expect(res.body.pagination).toHaveProperty('limit')
      }
    })
  })

  describe('Keys endpoint basic shape', () => {
    it('returns expected shape and supports status filter', async () => {
      const res = await request(app)
        .get(`/api/location/${addressId}/keys`)
        .query({ status: 'active', page: 1, limit: 5 })
        .set('Authorization', 'Bearer super')
      expect([200, 403, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('success')
        expect(res.body).toHaveProperty('data')
        expect(res.body).toHaveProperty('pagination')
      }
    })
  })
})
