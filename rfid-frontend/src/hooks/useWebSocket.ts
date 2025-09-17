import { useEffect, useMemo, useRef } from 'react'
import { createSocket } from '../services/websocket'
import { useToast } from './useToast'

export function useWebSocket(enabled: boolean, accessToken: string | null, cityId: string | null, baseUrl?: string) {
  const { success } = useToast()
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)

  useEffect(() => {
    if (!enabled || !accessToken) return

    const socket = createSocket({ baseUrl, token: accessToken, cityId })
    socketRef.current = socket

    socket.on('connect', () => {
      window.dispatchEvent(new CustomEvent('ws:connected'))
    })
    socket.on('disconnect', () => {
      window.dispatchEvent(new CustomEvent('ws:disconnected'))
    })

    // Handle key expiry notifications
    socket.on('key.expired', (evt: { keyId: string; cardId: string; userId: string; expiredAt?: string }) => {
      success?.(`RFID key ${evt.cardId} expired`, 'Key expired')
      // Inform listeners to refresh dashboard
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    })

    // Handle key assignment notifications
    socket.on('key.assigned', (evt: { keyId: string; cardId: string; userId: string; expiresAt?: string }) => {
      success?.(`RFID key ${evt.cardId} assigned`, 'Key assigned')
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    })

    // Handle key revocation notifications
    socket.on('key.revoked', (evt: { keyId: string; cardId: string; userId: string }) => {
      success?.(`RFID key ${evt.cardId} revoked`, 'Key revoked')
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    })

    // Handle KPI updates broadcast by server
    socket.on('kpi:update', () => {
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    })

    // Optional: new access created event
    socket.on('access.created', () => {
      // We could show a subtle toast, but only refreshing dashboard for now
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    })

    return () => {
  socket.off('key.expired')
  socket.off('key.assigned')
  socket.off('key.revoked')
  socket.off('kpi:update')
  socket.off('access.created')
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, accessToken, cityId, baseUrl, success])

  return useMemo(() => ({ socket: socketRef.current }), [])
}
