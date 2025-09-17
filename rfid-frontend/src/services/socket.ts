import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(apiBase: string, token?: string, cityId?: string): Socket {
  if (socket && socket.connected) return socket
  socket = io(apiBase.replace(/\/?api$/, ''), {
    transports: ['websocket'],
    auth: {
      token: token ? `Bearer ${token}` : undefined,
      cityId,
    },
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
