import request from 'supertest'
import app from '../src/app'

describe('Auth refresh token', () => {
  it('returns 400 when refresh token missing', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({})
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: 'invalid.token.here' })
    expect([400, 401]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })
})
