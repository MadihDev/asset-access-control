import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope, useTenantQueryKey } from '../../hooks/useTenantScope'
import { Modal } from '../ui/Modal'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string
  role: string
  isActive: boolean
  cityId?: string
  projectCityId?: string
  rfidKeys?: Array<{
    id: string
    cardId: string
    name?: string
    isActive: boolean
    issuedAt: string
    expiresAt?: string
  }>
  city?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface CurrentUser {
  id: string
  role: string
  projectCityId?: string
  cityId?: string
}

interface Lock {
  id: string
  name: string
  lockType?: string
  isActive: boolean
  address?: {
    street?: string
    number?: string
    city?: {
      name: string
    }
  }
}

interface UserPermission {
  id: string
  userId: string
  lockId: string
  grantedAt: string
  lock: Lock
}

interface RfidCard {
  id: string
  cardNumber: string
  isAssigned: boolean
  assignedUserId?: string
}

interface UserDetailsModalProps {
  user: User
  onClose: () => void
  onSuccess: () => void
  currentUser: CurrentUser
}

type ActiveTab = 'details' | 'permissions' | 'rfid'

export default function UserDetailsModal({ user, onClose, onSuccess, currentUser: loggedInUser }: UserDetailsModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const queryClient = useQueryClient()
  
  // Create query keys outside of mutations for invalidation
  const userPermissionsQueryKey = useTenantQueryKey('user-permissions', { userId: user.id })
  const availableRfidCardsQueryKey = useTenantQueryKey('available-rfid-cards')
  const availableLocksQueryKey = useTenantQueryKey('available-locks', { userId: user.id })
  const userDetailQueryKey = useTenantQueryKey('user-detail', { userId: user.id })

  // Fetch current user data to keep modal fresh
  const userDetailQuery = useQuery({
    queryKey: userDetailQueryKey,
    queryFn: async () => {
      const response = await api.get(`/api/user/${user.id}`)
      return response.data?.data || user // fallback to prop user if API fails
    },
    initialData: user,
    staleTime: 5000, // Consider fresh for 5 seconds
  })

  // Use fresh user data from query, fallback to prop
  const currentUser = userDetailQuery.data || user
  const activeRfidCard = currentUser.rfidKeys?.find((card: { isActive: boolean }) => card.isActive)
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('details')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  })

  // Permissions checking
  const canEditUser = ['SUPER_ADMIN', 'ADMIN'].includes(loggedInUser.role)
  const canManagePermissions = ['SUPER_ADMIN', 'ADMIN'].includes(loggedInUser.role)
  const canManageRfid = ['SUPER_ADMIN', 'ADMIN'].includes(loggedInUser.role)

  // Fetch user permissions
  const userPermissionsQuery = useQuery({
    queryKey: userPermissionsQueryKey,
    queryFn: async () => {
      const response = await api.get(`/api/permission`, {
        params: {
          ...tenantParams,
          userId: user.id
        }
      })
      return response.data
    },
    // Always fetch permissions to get accurate count for tabs
    enabled: true
  })

  // Fetch available locks for permission assignment
  const availableLocksQuery = useQuery({
    queryKey: availableLocksQueryKey,
    queryFn: async () => {
      const response = await api.get('/api/lock/available', {
        params: { ...tenantParams, userId: user.id }
      })
      return response.data
    },
    enabled: activeTab === 'permissions'
  })

  // Fetch available RFID cards
  const availableRfidCardsQuery = useQuery({
    queryKey: availableRfidCardsQueryKey,
    queryFn: async () => {
      const response = await api.get('/api/rfid/available', {
        params: tenantParams
      })
      return response.data
    },
    enabled: activeTab === 'rfid'
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updateData: Partial<typeof formData>) => {
      const response = await api.put(`/api/user/${user.id}`, updateData)
      return response.data
    },
    onSuccess: () => {
      toastSuccess('User updated successfully')
      setIsEditing(false)
      onSuccess()
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to update user')
    }
  })

  // Assign permission mutation
  const assignPermissionMutation = useMutation({
    mutationFn: async (lockId: string) => {
      const response = await api.post(`/api/permission`, {
        userId: user.id,
        lockId,
        ...tenantParams
      })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('Permission assigned successfully')
      userPermissionsQuery.refetch()
      availableLocksQuery.refetch()
      queryClient.invalidateQueries({ queryKey: userDetailQueryKey })
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to assign permission')
    }
  })

  // Remove permission mutation
  const removePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const response = await api.delete(`/api/permission/${permissionId}`)
      return response.data
    },
    onSuccess: () => {
      toastSuccess('Permission removed successfully')
      userPermissionsQuery.refetch()
      availableLocksQuery.refetch()
      queryClient.invalidateQueries({ queryKey: userDetailQueryKey })
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to remove permission')
    }
  })

  // Assign RFID card mutation
  const assignRfidMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await api.post(`/api/rfid/assign`, {
        cardId,
        userId: user.id,
        name: `Card for ${user.firstName} ${user.lastName}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        ...tenantParams
      })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('RFID card assigned successfully')
      // Refetch available RFID cards
      availableRfidCardsQuery.refetch()
      // Invalidate all user-related queries to update the modal data
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: userPermissionsQueryKey })
      queryClient.invalidateQueries({ queryKey: userDetailQueryKey })
      // Trigger parent component refetch
      onSuccess()
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to assign RFID card')
    }
  })

  // Remove RFID card mutation
  const removeRfidMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await api.post(`/api/rfid/revoke`, {
        id: keyId,
        reason: 'Removed by admin'
      })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('RFID card removed successfully')
      // Refetch available RFID cards
      availableRfidCardsQuery.refetch()
      // Invalidate all user-related queries to update the modal data
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: userPermissionsQueryKey })
      queryClient.invalidateQueries({ queryKey: userDetailQueryKey })
      // Trigger parent component refetch
      onSuccess()
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to remove RFID card')
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const changes: Partial<typeof formData> = {}
    
    if (formData.firstName !== currentUser.firstName) changes.firstName = formData.firstName
    if (formData.lastName !== currentUser.lastName) changes.lastName = formData.lastName
    if (formData.email !== currentUser.email) changes.email = formData.email
    if (formData.role !== currentUser.role) changes.role = formData.role
    if (formData.isActive !== currentUser.isActive) changes.isActive = formData.isActive

    if (Object.keys(changes).length === 0) {
      setIsEditing(false)
      return
    }

    await updateUserMutation.mutateAsync(changes)
  }

  const resetForm = () => {
    setFormData({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      role: currentUser.role,
      isActive: currentUser.isActive
    })
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'SUPERVISOR':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'USER':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const userPermissions: UserPermission[] = userPermissionsQuery.data?.data || []
  const availableLocks: Lock[] = availableLocksQuery.data?.data || []
  const availableRfidCards: RfidCard[] = availableRfidCardsQuery.data?.data || []

  return (
    <Modal 
      title={`${currentUser.firstName} ${currentUser.lastName}`} 
      onClose={onClose} 
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Details
            </button>
            {canManagePermissions && (
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Permissions ({userPermissions.length})
              </button>
            )}
            {canManageRfid && (
              <button
                onClick={() => setActiveTab('rfid')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rfid'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                RFID Card
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* User Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Information</h3>
                {canEditUser && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="USER">User</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      {['SUPER_ADMIN', 'ADMIN'].includes(loggedInUser.role) && (
                        <option value="ADMIN">Admin</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active User</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Name</div>
                      <div className="text-sm text-gray-900">{currentUser.firstName} {currentUser.lastName}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Username</div>
                      <div className="text-sm text-gray-900">@{currentUser.username}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Email</div>
                      <div className="text-sm text-gray-900">{currentUser.email}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Role</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(currentUser.role)}`}>
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Status</div>
                      <div className="flex items-center gap-1">
                        {currentUser.isActive ? (
                          <>
                            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-green-700">Active</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-500">Inactive</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">City</div>
                      <div className="text-sm text-gray-900">{currentUser.city?.name || 'Not assigned'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Created</div>
                      <div className="text-sm text-gray-900">{formatDate(currentUser.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Last Updated</div>
                      <div className="text-sm text-gray-900">{formatDate(currentUser.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && canManagePermissions && (
          <div className="space-y-6">
            {/* Current Permissions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Permissions</h3>
              {userPermissionsQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading permissions...
                  </div>
                </div>
              ) : userPermissionsQuery.isError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">
                    <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Failed to load permissions
                  </div>
                  <button
                    onClick={() => userPermissionsQuery.refetch()}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : userPermissions.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                  </svg>
                  <div className="text-gray-600 font-medium">No permissions assigned</div>
                  <div className="text-gray-500 text-sm">User cannot access any locks yet</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {userPermissions.map((permission: UserPermission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{permission.lock.name}</div>
                        <div className="text-sm text-gray-500">
                          {permission.lock.address?.street} {permission.lock.address?.number}
                          {permission.lock.address?.city?.name && ` • ${permission.lock.address.city.name}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          Granted {formatDate(permission.grantedAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => removePermissionMutation.mutate(permission.id)}
                        disabled={removePermissionMutation.isPending}
                        className="ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-transparent hover:border-red-200 disabled:opacity-50"
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

            {/* Available Locks */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign New Permissions</h3>
              {availableLocksQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading available locks...
                  </div>
                </div>
              ) : availableLocksQuery.isError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">
                    <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Failed to load available locks
                  </div>
                  <button
                    onClick={() => availableLocksQuery.refetch()}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : availableLocks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-600 font-medium">No additional locks available</div>
                  <div className="text-gray-500 text-sm">User already has access to all available locks</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableLocks.map((lock: Lock) => (
                    <div key={lock.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{lock.name}</div>
                        <div className="text-sm text-gray-500">
                          {lock.address?.street} {lock.address?.number}
                          {lock.address?.city?.name && ` • ${lock.address.city.name}`}
                        </div>
                        {lock.lockType && (
                          <div className="text-xs text-gray-400">{lock.lockType}</div>
                        )}
                      </div>
                      <button
                        onClick={() => assignPermissionMutation.mutate(lock.id)}
                        disabled={assignPermissionMutation.isPending}
                        className="ml-3 inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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

        {activeTab === 'rfid' && canManageRfid && (
          <div className="space-y-6">
            {/* Current RFID Card */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current RFID Card</h3>
              {activeRfidCard ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-900">Card Number: {activeRfidCard.cardId}</div>
                      <div className="text-sm text-green-700">
                        Assigned {formatDate(activeRfidCard.issuedAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => activeRfidCard && removeRfidMutation.mutate(activeRfidCard.id)}
                      disabled={removeRfidMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-transparent hover:border-red-200 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove Card
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 2H14C15.1046 2 16 2.89543 16 4V20C16 21.1046 15.1046 22 14 22H10C8.89543 22 8 21.1046 8 20V4C8 2.89543 8.89543 2 10 2Z" />
                  </svg>
                  <div className="text-gray-600 font-medium">No RFID card assigned</div>
                  <div className="text-gray-500 text-sm">User cannot access physical locks</div>
                </div>
              )}
            </div>

            {/* Available RFID Cards */}
            {!activeRfidCard && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Assign RFID Card</h3>
                {availableRfidCardsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading available cards...
                    </div>
                  </div>
                ) : availableRfidCardsQuery.isError ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Failed to load available cards
                    </div>
                    <button
                      onClick={() => availableRfidCardsQuery.refetch()}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : availableRfidCards.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600 font-medium">No RFID cards available</div>
                    <div className="text-gray-500 text-sm">All cards are currently assigned to other users</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableRfidCards.map((card: RfidCard) => (
                      <div key={card.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Card: {card.cardNumber}</div>
                          <div className="text-sm text-gray-500">Available for assignment</div>
                        </div>
                        <button
                          onClick={() => assignRfidMutation.mutate(card.cardNumber)}
                          disabled={assignRfidMutation.isPending}
                          className="ml-3 inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {assignRfidMutation.isPending ? (
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          )}
                          {assignRfidMutation.isPending ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RFID Card Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    RFID Card Information
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Each user can have only one RFID card assigned. The card will provide access to all locks that the user has permissions for. Removing a card will immediately revoke physical access.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}