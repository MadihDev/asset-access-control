import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope, useTenantQueryKey } from '../../hooks/useTenantScope'
import { Modal } from '../ui/Modal'
import type { AxiosError } from 'axios'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
}

interface Location {
  id: string
  name: string
  description?: string
  addressId: string
  address: {
    id: string
    street: string
    number: string
    zipCode: string
    city: {
      id: string
      name: string
    }
  }
  _count?: {
    locks: number
  }
}

interface Lock {
  id: string
  name: string
  lockType?: string
  isActive: boolean
  description?: string
  locationId?: string
}

interface UserPermission {
  id: string
  userId: string
  lockId: string
  grantedAt: string
  lock: Lock
}

interface LocationUserPermissionModalProps {
  user: User
  location: Location
  onClose: () => void
  onSuccess: () => void
}

export default function LocationUserPermissionModal({ 
  user, 
  location, 
  onClose, 
  onSuccess 
}: LocationUserPermissionModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const queryClient = useQueryClient()
  
  // Create query keys for invalidation
  const userPermissionsQueryKey = useTenantQueryKey('user-permissions', { userId: user.id })
  const locationLocksQueryKey = useTenantQueryKey('location-locks', { locationId: location.id })
  const locationUsersQueryKey = useTenantQueryKey('location-users', { locationId: location.id })
  const usersQueryKey = useTenantQueryKey('users')

  // Fetch user's current permissions
  const userPermissionsQuery = useQuery({
    queryKey: userPermissionsQueryKey,
    queryFn: async () => {
      const response = await api.get('/api/permission', { 
        params: { 
          ...tenantParams,
          userId: user.id 
        } 
      })
      return response.data?.data || []
    }
  })

  // Fetch locks at this specific location
  const locationLocksQuery = useQuery({
    queryKey: locationLocksQueryKey,
    queryFn: async () => {
      const response = await api.get(`/api/location/${location.id}/locks`, { 
        params: tenantParams 
      })
      return response.data?.data || []
    }
  })

  const userPermissions: UserPermission[] = userPermissionsQuery.data || []
  const locationLocks: Lock[] = locationLocksQuery.data || []

  // Filter to show only locks at this location that user doesn't already have access to
  const userPermissionLockIds = userPermissions.map(p => p.lockId)
  const availableLocationLocks = locationLocks.filter(lock => 
    !userPermissionLockIds.includes(lock.id)
  )

  // Filter to show only user's permissions for locks at this location
  const locationSpecificPermissions = userPermissions.filter(permission =>
    locationLocks.some(lock => lock.id === permission.lockId)
  )

  // Assign permission mutation
  const assignPermissionMutation = useMutation({
    mutationFn: async (lockId: string) => {
      const response = await api.post('/api/permission', {
        userId: user.id,
        lockId: lockId
      }, { params: tenantParams })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('Permission assigned successfully')
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: userPermissionsQueryKey })
      queryClient.invalidateQueries({ queryKey: locationUsersQueryKey })
      queryClient.invalidateQueries({ queryKey: usersQueryKey })
      
      onSuccess()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>
      const message = axiosError.response?.data?.error || 'Failed to assign permission'
      toastError(message)
    }
  })

  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const response = await api.delete(`/api/permission/${permissionId}`, { 
        params: tenantParams 
      })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('Permission removed successfully')
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: userPermissionsQueryKey })
      queryClient.invalidateQueries({ queryKey: locationUsersQueryKey })
      queryClient.invalidateQueries({ queryKey: usersQueryKey })
      
      onSuccess()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>
      const message = axiosError.response?.data?.error || 'Failed to remove permission'
      toastError(message)
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isLoading = userPermissionsQuery.isLoading || locationLocksQuery.isLoading
  const hasError = userPermissionsQuery.isError || locationLocksQuery.isError

  return (
    <Modal 
      title="Manage Permissions"
      onClose={onClose} 
      maxWidth="2xl"
    >
      <div className="max-h-[70vh] overflow-hidden">
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {user.firstName} {user.lastName} • {location.name}
          </p>
          <p className="text-xs text-gray-400">
            {location.address.street} {location.address.number}, {location.address.city.name}
          </p>
        </div>
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hasError ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Failed to load data
              </div>
              <button
                onClick={() => {
                  userPermissionsQuery.refetch()
                  locationLocksQuery.refetch()
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Permissions at this Location */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Current Permissions at This Location
                </h4>
                {locationSpecificPermissions.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                    </svg>
                    <div className="text-gray-600 font-medium text-sm">No permissions at this location</div>
                    <div className="text-gray-500 text-xs">User cannot access locks here yet</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locationSpecificPermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{permission.lock.name}</div>
                          {permission.lock.description && (
                            <div className="text-sm text-gray-600">{permission.lock.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Granted {formatDate(permission.grantedAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => removePermissionMutation.mutate(permission.id)}
                          disabled={removePermissionMutation.isPending}
                          className="ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-transparent hover:border-red-200 disabled:opacity-50 transition-colors"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Locks at this Location */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Available Locks at This Location
                </h4>
                {availableLocationLocks.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 font-medium text-sm">No additional locks available</div>
                    <div className="text-gray-500 text-xs">
                      {locationLocks.length === 0 
                        ? 'No locks are installed at this location'
                        : 'User already has access to all locks here'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableLocationLocks.map((lock) => (
                      <div key={lock.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{lock.name}</div>
                          {lock.description && (
                            <div className="text-sm text-gray-600">{lock.description}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {lock.lockType && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {lock.lockType.replace('_', ' ')}
                              </div>
                            )}
                            <div className={`text-xs px-2 py-0.5 rounded ${
                              lock.isActive 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-red-700 bg-red-100'
                            }`}>
                              {lock.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => assignPermissionMutation.mutate(lock.id)}
                          disabled={assignPermissionMutation.isPending || !lock.isActive}
                          className="ml-3 inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {assignPermissionMutation.isPending ? (
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          )}
                          {assignPermissionMutation.isPending ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {locationSpecificPermissions.length} permissions • {availableLocationLocks.length} available locks
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}