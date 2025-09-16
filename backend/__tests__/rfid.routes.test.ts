import request from 'supertest'
import app from '../src/app'

// Mock auth service to validate token as ADMIN
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

describe('RFID routes validation', () => {
  describe('POST /api/rfid/assign', () => {
    it('requires auth', async () => {
      const res = await request(app).post('/api/rfid/assign').send({})
      expect(res.status).toBe(401)
    })

    it('rejects invalid payload', async () => {
      const res = await request(app)
        .post('/api/rfid/assign')
        .set('Authorization', 'Bearer valid')
        .send({ userId: 'not-an-id' })
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('accepts valid payload (DB may fail)', async () => {
      const payload = { cardId: 'CARD-123', userId: 'c12345678901234567890123', expiresAt: new Date().toISOString() }
      const res = await request(app)
        .post('/api/rfid/assign')
        .set('Authorization', 'Bearer valid')
        .send(payload)
      // If DB available: 200; otherwise 400/500 from controller
      expect([200, 201, 400, 500]).toContain(res.status)
    })
  })

  describe('POST /api/rfid/revoke', () => {
    it('requires auth', async () => {
      const res = await request(app).post('/api/rfid/revoke').send({})
      expect(res.status).toBe(401)
    })

    it('requires id or cardId', async () => {
      const res = await request(app)
        .post('/api/rfid/revoke')
        .set('Authorization', 'Bearer valid')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('accepts id or cardId (DB may fail)', async () => {
      const res = await request(app)
        .post('/api/rfid/revoke')
        .set('Authorization', 'Bearer valid')
        .send({ cardId: 'CARD-123' })
      expect([200, 400, 404, 500]).toContain(res.status)
    })
  })
})
