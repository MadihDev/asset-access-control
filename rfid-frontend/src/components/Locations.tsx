import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useTenantScope } from '../hooks/useTenantScope'
import { useAuth } from '../hooks/useAuth'
import LocationUserPermissionModal from './Locations/LocationUserPermissionModal'
import type { AxiosError } from 'axios'

interface Address {
  id: string
  street: string
  number: string
  city: {
    id: string
    name: string
  }
  _count?: {
    locks: number
    users: number
    keys: number
  }
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  rfidKeys?: {
    id: string
    cardId: string
    isActive: boolean
  }[]
}

interface Lock {
  id: string
  name: string
  description?: string
  isOnline: boolean
  lockType?: string
  batteryLevel?: number
  _count?: {
    permissions: number
  }
}

interface RfidKey {
  id: string
  cardId: string
  isActive: boolean
  user?: {
    firstName: string
    lastName: string
    email: string
  }
  assignedAt: string
}

const Locations: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'locks' | 'keys'>('users')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null)
  
  // Tab data
  const [users, setUsers] = useState<User[]>([])
  const [locks, setLocks] = useState<Lock[]>([])
  const [rfidKeys, setRfidKeys] = useState<RfidKey[]>([])

  const { tenantParams } = useTenantScope()
  const { user: authUser } = useAuth()

  const fetchAddresses = useCallback(async () => {
    if (!authUser) {
      setError('Please log in to view locations')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🏠 Fetching addresses with params:', tenantParams)
      const { data } = await api.get('/api/address', { params: tenantParams })
      console.log('✅ Addresses received:', data)
      setAddresses(data.data || [])
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      console.error('❌ Error fetching addresses:', error)
      setError(`Failed to load addresses: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }, [authUser, tenantParams])

  const fetchAddressDetails = useCallback(async (address: Address, tab: 'users' | 'locks' | 'keys') => {
    if (!authUser || !address) return

    try {
      setDetailLoading(true)
      
      const params = {
        ...tenantParams,
        addressId: address.id
      }

      console.log(`🔍 Fetching ${tab} for address:`, address.id, params)

      if (tab === 'users') {
        const { data } = await api.get(`/api/location/${address.id}/users`, { params: tenantParams })
        console.log('✅ Users received:', data)
        setUsers(data.data || [])
      } else if (tab === 'locks') {
        const { data } = await api.get(`/api/location/${address.id}/locks`, { params: tenantParams })
        console.log('✅ Locks received:', data)
        setLocks(data.data || [])
      } else if (tab === 'keys') {
        const { data } = await api.get(`/api/location/${address.id}/keys`, { params: tenantParams })
        console.log('✅ RFID Keys received:', data)
        setRfidKeys(data.data || [])
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      console.error(`❌ Error fetching ${tab}:`, error)
      setError(`Failed to load ${tab}: ${error.response?.data?.error || error.message}`)
    } finally {
      setDetailLoading(false)
    }
  }, [authUser, tenantParams])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  useEffect(() => {
    if (selectedAddress) {
      fetchAddressDetails(selectedAddress, activeTab)
    }
  }, [selectedAddress, activeTab, fetchAddressDetails])

  const handleAddressClick = (address: Address) => {
    setSelectedAddress(address)
    setActiveTab('users') // Reset to first tab
    // Clear previous data
    setUsers([])
    setLocks([])
    setRfidKeys([])
  }

  const handleTabChange = (tab: 'users' | 'locks' | 'keys') => {
    setActiveTab(tab)
  }

  const handleManagePermissions = (user: User) => {
    setPermissionModalUser(user)
  }

  const handlePermissionModalClose = () => {
    setPermissionModalUser(null)
  }

  const handlePermissionModalSuccess = () => {
    // Refresh the current tab data to reflect changes
    if (selectedAddress) {
      fetchAddressDetails(selectedAddress, activeTab)
    }
  }

  const getStatusIcon = (isActive: boolean, isOnline?: boolean) => {
    const isPositive = isOnline !== undefined ? isOnline : isActive
    return isPositive ? (
      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2 2m-2-2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={fetchAddresses}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          </div>
          <p className="text-gray-600 mb-4">Manage addresses and view associated users, locks, and keys</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Signed in as: <span className="font-medium">{authUser?.firstName} {authUser?.lastName}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Addresses List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
              </div>
              <div className="text-sm text-gray-500 mt-1">{(addresses || []).length} locations</div>
            </div>
            <div className="p-6">
              {(addresses || []).length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-gray-600 font-medium">No addresses found</div>
                  <div className="text-gray-500 text-sm mt-1">
                    Addresses will appear here when they are created
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(addresses || []).map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleAddressClick(address)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedAddress?.id === address.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <h3 className="font-medium text-gray-900">
                              {address.street} {address.number}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{address.city?.name || 'Unknown City'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>{address._count?.users || 0} users</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                              </svg>
                              <span>{address._count?.locks || 0} locks</span>
                            </div>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="lg:col-span-2">
          {selectedAddress ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedAddress.street} {selectedAddress.number}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedAddress.city?.name || 'Unknown City'}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-4">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => handleTabChange('users')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                        activeTab === 'users'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Users ({selectedAddress._count?.users || 0}){detailLoading && activeTab === 'users' && <span className="ml-1 text-xs">⟳</span>}
                      </div>
                    </button>
                    <button
                      onClick={() => handleTabChange('locks')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                        activeTab === 'locks'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                        </svg>
                        Locks ({selectedAddress._count?.locks || 0}){detailLoading && activeTab === 'locks' && <span className="ml-1 text-xs">⟳</span>}
                      </div>
                    </button>
                    <button
                      onClick={() => handleTabChange('keys')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                        activeTab === 'keys'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Keys ({selectedAddress._count?.keys || 0}){detailLoading && activeTab === 'keys' && <span className="ml-1 text-xs">⟳</span>}
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                      <div>
                        {(users || []).length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div className="text-gray-600 font-medium">No users found</div>
                            <div className="text-gray-500 text-sm mt-1">
                              {detailLoading ? 'Loading users...' : 'No users are associated with this address'}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(users || []).map((user) => (
                              <div key={user.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700">
                                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {user.firstName} {user.lastName}
                                      </h4>
                                      <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                  </div>
                                  {getStatusIcon(user.isActive)}
                                </div>
                                <div className="flex items-center justify-between text-sm mb-3">
                                  <span className="text-gray-500">Role: {user.role.replace('_', ' ')}</span>
                                  <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span className="text-gray-500">{user.rfidKeys?.length || 0} keys</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-end">
                                  <button
                                    onClick={() => handleManagePermissions(user)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                                    </svg>
                                    Manage Permissions
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Locks Tab */}
                    {activeTab === 'locks' && (
                      <div>
                        {(locks || []).length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                            </svg>
                            <div className="text-gray-600 font-medium">No locks found</div>
                            <div className="text-gray-500 text-sm mt-1">
                              {detailLoading ? 'Loading locks...' : 'No locks are installed at this address'}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(locks || []).map((lock) => (
                              <div key={lock.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">{lock.name}</h4>
                                      {lock.description && (
                                        <p className="text-sm text-gray-500">{lock.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  {getStatusIcon(true, lock.isOnline)}
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Type:</span>
                                    <span className="text-gray-900">{(lock.lockType || 'Unknown').replace('_', ' ')}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Permissions:</span>
                                    <span className="text-gray-900">{lock._count?.permissions || 0}</span>
                                  </div>
                                  {lock.batteryLevel !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500">Battery:</span>
                                      <span className={`${lock.batteryLevel < 20 ? 'text-red-600' : 'text-green-600'}`}>
                                        {lock.batteryLevel}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Keys Tab */}
                    {activeTab === 'keys' && (
                      <div>
                        {(rfidKeys || []).length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <div className="text-gray-600 font-medium">No RFID keys found</div>
                            <div className="text-gray-500 text-sm mt-1">
                              {detailLoading ? 'Loading...' : 'No RFID keys are associated with this address'}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(rfidKeys || []).map((key) => (
                              <div key={key.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">{key.cardId}</h4>
                                      {key.user && (
                                        <p className="text-sm text-gray-500">
                                          {key.user.firstName} {key.user.lastName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {getStatusIcon(key.isActive)}
                                </div>
                                <div className="space-y-2 text-sm">
                                  {key.user && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500">Email:</span>
                                      <span className="text-gray-900">{key.user.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Assigned:</span>
                                    <span className="text-gray-900">
                                      {new Date(key.assignedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-12 text-center">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="text-gray-600 font-medium">Select an Address</div>
                <div className="text-gray-500 text-sm mt-1">
                  Choose an address from the list to view its users, locks, and keys
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Management Modal */}
      {permissionModalUser && selectedAddress && (
        <LocationUserPermissionModal
          user={permissionModalUser}
          address={selectedAddress}
          onClose={handlePermissionModalClose}
          onSuccess={handlePermissionModalSuccess}
        />
      )}
    </div>
  )
}

export default Locations