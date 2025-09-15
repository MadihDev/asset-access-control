import request from 'supertest'
import express from 'express'
import { authenticateToken, requireAdmin } from '../src/middleware/auth.middleware'

jest.mock('../src/services/auth.service', () => ({
  __esModule: true,
  default: {
    validateToken: jest.fn(async (token: string) => {
      if (token === 'valid') {
        return { id: 'u1', email: 'a@b.com', role: 'ADMIN' }
      }
      return null
    })
  }
}))

const appFactory = () => {
  const app = express()
  app.get('/secure', authenticateToken, requireAdmin, (_req, res) => res.json({ ok: true }))
  return app
}

describe('auth.middleware', () => {
  it('returns 401 when no token provided', async () => {
    const app = appFactory()
    const res = await request(app).get('/secure')
    expect(res.status).toBe(401)
  })

  it('allows access with valid token and admin role', async () => {
    const app = appFactory()
    const res = await request(app).get('/secure').set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('denies with invalid token', async () => {
    const app = appFactory()
    const res = await request(app).get('/secure').set('Authorization', 'Bearer invalid')
    expect(res.status).toBe(401)
  })
})
