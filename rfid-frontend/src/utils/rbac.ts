import type { AuthUser } from '../contexts/auth-context'

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  USER: 'USER',
} as const

export type Role = typeof ROLES[keyof typeof ROLES] | string

export const hasRole = (user: AuthUser | null | undefined, role: Role): boolean => {
  if (!user) return false
  return user.role === role
}

export const hasAnyRole = (user: AuthUser | null | undefined, roles: Role[]): boolean => {
  if (!user) return false
  return roles.includes(user.role)
}
