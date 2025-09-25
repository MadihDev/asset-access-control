import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useToast } from '../hooks/useToast'
import { useTenantScope, useTenantQueryKey } from '../hooks/useTenantScope'
import CreateUserModal from './UserManagement/CreateUserModal'
import UserDetailsModal from './UserManagement/UserDetailsModal'

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
  _count?: {
    permissions: number
  }
}

interface CurrentUser {
  id: string
  role: string
  projectCityId?: string
  cityId?: string
}

interface UserManagementProps {
  user: CurrentUser
}

export default function UserManagement({ user }: UserManagementProps) {
  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  
  // Helper function to get the first active RFID card
  const getActiveRfidCard = (user: User) => user.rfidKeys?.find(card => card.isActive)
  
  // Constants
  const ITEMS_PER_PAGE = 20
  
  // State management
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  // Suppress unused variable warning - pagination will be implemented later
  void setCurrentPage
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)

  // Query parameters with tenant scoping and filters
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    activeOnly: String(!showInactive),
    search: searchTerm.trim() || undefined,
    role: roleFilter || undefined,
    ...tenantParams
  }), [currentPage, showInactive, searchTerm, roleFilter, tenantParams])

  // Query key with tenant scoping
  const usersQueryKey = useTenantQueryKey('users', { 
    showInactive, 
    searchTerm, 
    roleFilter 
  })

  // Fetch users with tenant isolation
  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const response = await api.get('/api/user', { params: queryParams })
      return response.data
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  })

  // Permissions
  const canCreateUsers = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
  const canManageUsers = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
  const canViewUsers = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'].includes(user.role)

  // Toggle user active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.put(`/api/user/${id}`, { isActive })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toastSuccess(variables.isActive ? 'User activated' : 'User deactivated')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to update user')
    }
  })

  // Export to CSV functionality
  const exportToCSV = () => {
    if (!users.length) {
      toastError('No users to export')
      return
    }

    const csvHeaders = [
      'First Name',
      'Last Name', 
      'Email',
      'Username',
      'Role',
      'City',
      'Status',
      'RFID Card',
      'Permissions Count',
      'Created Date'
    ]

    const csvData = users.map((user: User) => [
      user.firstName,
      user.lastName,
      user.email,
      user.username,
      user.role,
      user.city?.name || 'N/A',
      user.isActive ? 'Active' : 'Inactive',
      getActiveRfidCard(user)?.cardId || 'Not Assigned',
      user._count?.permissions || 0,
      new Date(user.createdAt).toLocaleDateString()
    ])

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map((field: string | number) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toastSuccess('Users exported successfully')
    }
  }

  const users = usersData?.data || []
  const isLoaderActive = isLoading || isFetching

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

  if (!canViewUsers) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view user management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              {user.role === 'SUPER_ADMIN' 
                ? 'Manage users, roles, and permissions as super admin'
                : user.role === 'SUPERVISOR'
                ? 'Manage users, roles, and permissions as supervisor'
                : 'Manage users, assign permissions, and control access to your system'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              disabled={!users.length}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            {/* Create User Button */}
            {canCreateUsers && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Role Filter */}
          <div className="min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="USER">User</option>
            </select>
          </div>

          {/* Show Inactive Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show inactive users
            </label>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isLoaderActive}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${isLoaderActive ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || roleFilter || showInactive) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setSearchTerm('')
                setRoleFilter('')
                setShowInactive(false)
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <div className="text-red-600 text-sm font-medium">Failed to load users</div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Try again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <div className="text-gray-600 font-medium">No users found</div>
              <div className="text-gray-500 text-sm mt-1">
                {searchTerm || roleFilter || showInactive 
                  ? 'No users match the current filters' 
                  : 'Get started by creating your first user'
                }
              </div>
              {canCreateUsers && !searchTerm && !roleFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create First User
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RFID Card
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    {canManageUsers && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: User) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* User Info */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.city?.name && (
                          <div className="text-sm text-gray-500">{user.city.name}</div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {user.isActive ? (
                            <>
                              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium text-green-700">Active</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-500">Inactive</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* RFID Card */}
                      <td className="px-4 py-4">
                        {getActiveRfidCard(user) ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getActiveRfidCard(user)?.cardId}
                            </div>
                            <div className="text-xs text-gray-500">
                              Assigned {formatDate(getActiveRfidCard(user)?.issuedAt || '')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not assigned</span>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {user._count?.permissions || 0} locks
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(user.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      {canManageUsers && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View/Edit Button */}
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowUserDetails(true)
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>

                            {/* Toggle Active Button */}
                            <button
                              onClick={() => toggleActiveMutation.mutate({ 
                                id: user.id, 
                                isActive: !user.isActive 
                              })}
                              disabled={toggleActiveMutation.isPending}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border disabled:opacity-50 ${
                                user.isActive
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-50 border-transparent hover:border-red-200'
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50 border-transparent hover:border-green-200'
                              }`}
                            >
                              {user.isActive ? (
                                <>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Activate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {users.filter((u: User) => u.isActive).length}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter((u: User) => getActiveRfidCard(u)).length}
              </div>
              <div className="text-sm text-gray-500">With RFID Cards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {users.filter((u: User) => (u._count?.permissions || 0) > 0).length}
              </div>
              <div className="text-sm text-gray-500">With Permissions</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetch()
          }}
          currentUser={user}
        />
      )}

      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            refetch()
          }}
          currentUser={user}
        />
      )}
    </div>
  )
}