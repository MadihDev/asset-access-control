import { Server, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import authService from '../services/auth.service'

let io: Server | null = null

export function initWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.WS_CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use(async (socket: Socket, next: (err?: Error) => void) => {
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
      
      // 🔒 SECURITY FIX: Use AuthService for proper JWT validation
      // This prevents JWT payload manipulation attacks
      const user = await authService.validateToken(token)
      if (!user) {
        return next(new Error('Unauthorized'))
      }
      
      // Use validated data from database, not JWT payload claims
      ;(socket as any).user = { id: user.id, role: user.role }
      ;(socket as any).projectCityId = user.projectCityId || undefined
      next()
    } catch (_err) {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const projectCityId = (socket as any).projectCityId as string | undefined
    if (projectCityId) {
      socket.join(`projectCity:${projectCityId}`)
    }

    socket.on('disconnect', () => {
      if (projectCityId) socket.leave(`projectCity:${projectCityId}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('WebSocket not initialized')
  return io
}

export function emitToProjectCity(projectCityId: string, event: string, payload: any) {
  if (!io) return
  io.to(`projectCity:${projectCityId}`).emit(event, payload)
}
