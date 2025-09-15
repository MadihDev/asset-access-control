import request from 'supertest'
import app from '../src/app'

describe('Health endpoint', () => {
  it('GET /api/health returns 200 with message', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: 'Server is up and running!' })
  })
})
