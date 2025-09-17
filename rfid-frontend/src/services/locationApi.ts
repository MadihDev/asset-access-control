import api from './api'

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean }
}

export interface LocationUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  activeAtLocation: boolean
}

export interface LocationLock {
  id: string
  name: string
  lockType: string
  isActive: boolean
  isOnline: boolean
  lastSeen?: string
}

export interface LocationKey {
  id: string
  cardId: string
  name?: string
  isActive: boolean
  issuedAt: string
  expiresAt?: string
  user: { id: string; firstName: string; lastName: string }
}

export async function getLocationUsers(addressId: string, params?: { page?: number; limit?: number; status?: 'active' | 'inactive'; cityId?: string }) {
  const { data } = await api.get(`/api/location/${addressId}/users`, { params })
  return data as { success: boolean } & Paginated<LocationUser>
}

export async function getLocationLocks(addressId: string, params?: { page?: number; limit?: number; status?: 'active' | 'inactive' | 'online' | 'offline' }) {
  const { data } = await api.get(`/api/location/${addressId}/locks`, { params })
  return data as { success: boolean } & Paginated<LocationLock>
}

export async function getLocationKeys(addressId: string, params?: { page?: number; limit?: number; status?: 'active' | 'expired' }) {
  const { data } = await api.get(`/api/location/${addressId}/keys`, { params })
  return data as { success: boolean } & Paginated<LocationKey>
}

export async function bulkPermissions(addressId: string, payload: { grants?: Array<{ userId: string; lockId: string; validFrom?: string; validTo?: string }>; revokes?: Array<{ userId: string; lockId: string }> }) {
  const { data } = await api.post(`/api/location/${addressId}/permissions`, payload)
  return data as { success: boolean; data: { granted: number; updated: number; revoked: number } }
}

export async function bulkAssignKeys(addressId: string, payload: { items: Array<{ cardId: string; userId: string; name?: string; expiresAt?: string; isActive?: boolean }> }) {
  const { data } = await api.post(`/api/location/${addressId}/keys/assign`, payload)
  return data as { success: boolean; data: { created: number; reassigned: number; updated: number } }
}
