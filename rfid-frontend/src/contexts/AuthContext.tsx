import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { AuthContext, type LoginCredentials } from './auth-context'
import type { AuthUser } from './auth-context'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user from token on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const { data } = await api.get('/api/auth/profile')
        setUser(data.data as AuthUser)
      } catch {
        localStorage.removeItem('token')
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data } = await api.post('/api/auth/login', credentials)
    
    // Validate response structure
    if (!data.data || !data.data.accessToken || !data.data.refreshToken || !data.data.user) {
      throw new Error('Invalid login response format')
    }
    
    const token: string = data.data.accessToken
    const rtoken: string = data.data.refreshToken
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', rtoken)
    setUser(data.data.user as AuthUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

