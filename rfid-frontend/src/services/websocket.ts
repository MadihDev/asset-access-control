import { io, Socket } from 'socket.io-client'

export type WSOptions = {
  baseUrl?: string
  token?: string | null
  cityId?: string | null
}

export function createSocket({ baseUrl, token, cityId }: WSOptions): Socket {
  const url = baseUrl || (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5001'
  const socket = io(url, {
    transports: ['websocket'],
    auth: {
      token: token ? `Bearer ${token}` : undefined,
      cityId: cityId || undefined,
    },
    autoConnect: true,
  })
  return socket
}
