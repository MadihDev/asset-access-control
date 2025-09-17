import { Server, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types'

let io: Server | null = null

export function initWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
  const authHeader = socket.handshake.headers['authorization']
  let token = socket.handshake.auth?.token as string | undefined
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.split(' ')[1]
      }
      if (!token && typeof authHeader === 'string') {
        token = authHeader.split(' ')[1]
      }
      if (!token) return next(new Error('Unauthorized'))
      const secret = process.env.JWT_SECRET || 'fallback-secret-key'
      const payload = jwt.verify(token, secret) as JWTPayload
      ;(socket as any).user = { id: payload.userId, role: payload.role }
      ;(socket as any).cityId = socket.handshake.auth?.cityId || undefined
      next()
    } catch (_err) {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const cityId = (socket as any).cityId as string | undefined
    if (cityId) {
      socket.join(`city:${cityId}`)
    }

    socket.on('disconnect', () => {
      if (cityId) socket.leave(`city:${cityId}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('WebSocket not initialized')
  return io
}

export function emitToCity(cityId: string, event: string, payload: any) {
  if (!io) return
  io.to(`city:${cityId}`).emit(event, payload)
}
