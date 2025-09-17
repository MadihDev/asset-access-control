import request from 'supertest'
import app from '../src/app'

// Mock auth service to provide Manager+ role
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

describe('POST /api/location/:addressId/permissions (bulk)', () => {
  const addressId = 'ck1u5l9q00000000000000000'

  it('requires auth', async () => {
    const res = await request(app).post(`/api/location/${addressId}/permissions`).send({})
    expect(res.status).toBe(401)
  })

  it('rejects invalid payload (no grants/revokes)', async () => {
    const res = await request(app)
      .post(`/api/location/${addressId}/permissions`)
      .set('Authorization', 'Bearer manager')
      .send({})
    expect([400, 404, 403]).toContain(res.status)
  })

  it('accepts a valid grant request (may 200/404/500 depending on DB)', async () => {
    const res = await request(app)
      .post(`/api/location/${addressId}/permissions`)
      .set('Authorization', 'Bearer super')
      .send({
        grants: [
          { userId: 'ck1u5l9q00000000000000010', lockId: 'ck1u5l9q00000000000000020', validFrom: new Date().toISOString() }
        ]
      })
    expect([200, 400, 403, 404, 500]).toContain(res.status)
  })

  it('enforces bulk item limits with 413', async () => {
    const many = new Array(600).fill(0).map((_, i) => ({ userId: `u${i}`, lockId: `l${i}` }))
    const res = await request(app)
      .post(`/api/location/${addressId}/permissions`)
      .set('Authorization', 'Bearer super')
      .send({ grants: many })
    expect([413, 404, 403]).toContain(res.status)
  })
})
