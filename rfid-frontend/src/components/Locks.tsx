import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TableCellsIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import api from '../services/api'
import { useToast } from '../hooks/useToast'
import { useTenantScope, useTenantQueryKey } from '../hooks/useTenantScope'
import LockTreeView from './Locks/LockTreeView'

interface Lock {
  id: string
  name: string
  lockType?: string
  isActive: boolean
  isOnline?: boolean
  lastSeen?: string
  projectCityId: string
  address?: {
    street?: string
    number?: string
    zipCode?: string
    city?: {
      id: string
      name: string
    }
  }
}

interface User {
  id: string
  role: string
}

interface LocksProps {
  user: User
}

export default function Locks({ user }: LocksProps) {
  const queryClient = useQueryClient()
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const [showInactive, setShowInactive] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table')
  const [searchTerm, setSearchTerm] = useState('')

  // Query parameters with tenant scoping
  const queryParams = useMemo(() => ({
    activeOnly: String(!showInactive),
    ...tenantParams
  }), [showInactive, tenantParams])

  // Query key with tenant scoping
  const locksQueryKey = useTenantQueryKey('locks', { showInactive })

  // Fetch locks with tenant isolation
  const {
    data: locksData,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: locksQueryKey,
    queryFn: async () => {
      const response = await api.get('/api/lock', { params: queryParams })
      return response.data
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  })

  // Permissions
  const canUpdate = ['ADMIN'].includes(user.role)
  const canPing = ['ADMIN', 'SUPERVISOR'].includes(user.role)

  // Mutations
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.put(`/api/lock/${id}`, { isActive })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      toastSuccess(variables.isActive ? 'Lock activated' : 'Lock deactivated')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to update lock')
    }
  })

  const pingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/api/lock/${id}/ping`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      toastSuccess('Lock ping sent successfully')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toastError(error?.response?.data?.error || 'Failed to ping lock')
    }
  })

  const allLocks = locksData?.data || []
  const isLoaderActive = isLoading || isFetching

  // Filter locks based on search term
  const locks = useMemo(() => {
    if (!searchTerm) return allLocks;
    
    return allLocks.filter((lock: Lock) =>
      lock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lock.lockType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lock.address?.city?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lock.address?.street?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allLocks, searchTerm])

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never'
    
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Locks Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage locks, monitor status, and control access
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search locks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TableCellsIcon className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewMode === 'tree' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
                Tree
              </button>
            </div>

            {/* Show Inactive Toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show inactive locks
            </label>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isLoaderActive}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${isLoaderActive ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Locks Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="ml-2 text-gray-600">Loading locks...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <div className="text-red-600 text-sm font-medium">Failed to load locks</div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Try again
              </button>
            </div>
          ) : locks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
              </svg>
              <div className="text-gray-600 font-medium">No locks found</div>
              <div className="text-gray-500 text-sm mt-1">
                {showInactive ? 'No locks match the current criteria' : 'Try enabling "Show inactive locks" to see all locks'}
              </div>
            </div>
          ) : viewMode === 'tree' ? (
            <LockTreeView
              searchTerm={searchTerm}
              user={user}
              onLockSelect={(lock) => {
                // Handle lock selection - could open a modal or show details
                console.log('Lock selected:', lock);
              }}
              onLocationSelect={(location) => {
                // Handle location selection
                console.log('Location selected:', location);
              }}
              onLockAction={(action, lock) => {
                if (action === 'ping') {
                  pingMutation.mutate(lock.id);
                } else if (action === 'toggle-active') {
                  toggleActiveMutation.mutate({ 
                    id: lock.id, 
                    isActive: !lock.isActive 
                  });
                }
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lock Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Seen
                    </th>
                    {(canUpdate || canPing) && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locks.map((lock: Lock) => (
                    <tr key={lock.id} className="hover:bg-gray-50">
                      {/* Lock Details */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lock.name}</div>
                          {lock.lockType && (
                            <div className="text-sm text-gray-500">{lock.lockType}</div>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {lock.address?.city?.name || 'Unknown City'}
                        </div>
                        {lock.address && (
                          <div className="text-sm text-gray-500">
                            {[lock.address.street, lock.address.number].filter(Boolean).join(' ')}
                            {lock.address.zipCode && ` (${lock.address.zipCode})`}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Online Status */}
                          <div className="flex items-center gap-1">
                            {lock.isOnline ? (
                              <>
                                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                </svg>
                                <span className="text-xs font-medium text-green-700">Online</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m0 0l6.364-6.364M12 12L5.636 5.636" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Offline</span>
                              </>
                            )}
                          </div>
                          
                          {/* Active Status */}
                          <div className="flex items-center gap-1">
                            {lock.isActive ? (
                              <>
                                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-xs font-medium text-blue-700">Active</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 5.636l12.728 12.728m-9.9-2.829L12 12m0 0l3.464-3.536M12 12l-3.536 3.464" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Inactive</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatLastSeen(lock.lastSeen)}
                        </div>
                      </td>

                      {/* Actions */}
                      {(canUpdate || canPing) && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canPing && (
                              <button
                                onClick={() => pingMutation.mutate(lock.id)}
                                disabled={pingMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 disabled:opacity-50"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Ping
                              </button>
                            )}
                            
                            {canUpdate && (
                              <button
                                onClick={() => toggleActiveMutation.mutate({ 
                                  id: lock.id, 
                                  isActive: !lock.isActive 
                                })}
                                disabled={toggleActiveMutation.isPending}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border disabled:opacity-50 ${
                                  lock.isActive
                                    ? 'text-red-600 hover:text-red-800 hover:bg-red-50 border-transparent hover:border-red-200'
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50 border-transparent hover:border-green-200'
                                }`}
                              >
                                {lock.isActive ? (
                                  <>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 5.636l12.728 12.728m-9.9-2.829L12 12m0 0l3.464-3.536M12 12l-3.536 3.464" />
                                    </svg>
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Activate
                                  </>
                                )}
                              </button>
                            )}
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

      {/* Stats Summary */}
      {locks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{locks.length}</div>
              <div className="text-sm text-gray-500">Total Locks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {locks.filter((l: Lock) => l.isActive).length}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {locks.filter((l: Lock) => l.isOnline).length}
              </div>
              <div className="text-sm text-gray-500">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {locks.filter((l: Lock) => l.isActive && l.isOnline).length}
              </div>
              <div className="text-sm text-gray-500">Active & Online</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}