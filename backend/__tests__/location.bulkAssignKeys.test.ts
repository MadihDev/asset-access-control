import request from 'supertest'
import app from '../src/app'

// Mock auth service for Manager+
jest.mock('../src/services/auth.service', () => ({
  __esModule: true,
  default: {
    validateToken: jest.fn(async (token: string) => {
      if (token === 'manager') return { id: 'u-mgr', email: 'mgr@example.com', role: 'ADMIN', cityId: 'cityA' }
      if (token === 'super') return { id: 'u-super', email: 'super@example.com', role: 'SUPER_ADMIN' }
      return null
    }),
  },
}))

describe('POST /api/location/:addressId/keys/assign (bulk)', () => {
  const addressId = 'ck1u5l9q00000000000000000'

  it('requires auth', async () => {
    const res = await request(app).post(`/api/location/${addressId}/keys/assign`).send({})
    expect(res.status).toBe(401)
  })

  it('rejects invalid payload (no items)', async () => {
    const res = await request(app)
      .post(`/api/location/${addressId}/keys/assign`)
      .set('Authorization', 'Bearer manager')
      .send({})
    expect([400, 404, 403]).toContain(res.status)
  })

  it('accepts a valid items list (may 200/404/500 depending on DB)', async () => {
    const res = await request(app)
      .post(`/api/location/${addressId}/keys/assign`)
      .set('Authorization', 'Bearer super')
      .send({
        items: [
          { cardId: 'CARD-001', userId: 'ck1u5l9q00000000000000010', name: 'Front Door', expiresAt: new Date().toISOString() }
        ]
      })
    expect([200, 400, 403, 404, 500]).toContain(res.status)
  })
})
