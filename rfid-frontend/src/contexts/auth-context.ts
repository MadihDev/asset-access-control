import { createContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
