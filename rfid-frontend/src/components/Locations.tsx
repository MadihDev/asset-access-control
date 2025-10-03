import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import { useTenantScope } from '../hooks/useTenantScope'
import { useAuth } from '../hooks/useAuth'
import LocationUserPermissionModal from './Locations/LocationUserPermissionModal'
import AddressTree from './Locations/AddressTree'

import LocationSearch from './Locations/LocationSearch'
import LocationManagementModal from './Locations/LocationManagementModal'
import LockManagementModal from './Locations/LockManagementModal'
import BulkLocationOperations from './Locations/BulkLocationOperations'
import ConfirmationModal from './common/ConfirmationModal'
import type { AxiosError } from 'axios'

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
    users?: number
  }
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  accessType?: {
    hasPermissions: boolean
    hasActiveRfidKey: boolean
    hasRecentAccess: boolean
  }
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
  deviceId: string
  lockType: 'DOOR' | 'GATE' | 'CABINET' | 'ROOM'
  isActive: boolean
  isOnline?: boolean
  locationId: string
  batteryLevel?: number
  _count?: {
    permissions: number
  }
  location?: {
    id: string
    name: string
    address: {
      street: string
      number: string
      city: { name: string }
    }
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
  issuedAt?: string
  assignedAt?: string
}

interface FilterOptions {
  showOfflineOnly: boolean
  showLowBattery: boolean
  sortBy: 'name' | 'status' | 'locks'
}

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'locks' | 'keys'>('users')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null)
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [lockToEdit, setLockToEdit] = useState<Lock | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Bulk operations state
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  
  // Tab data
  const [users, setUsers] = useState<User[]>([])
  const [locks, setLocks] = useState<Lock[]>([])
  const [rfidKeys, setRfidKeys] = useState<RfidKey[]>([])
  
  // Track which tabs have been loaded for the current location
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    showOfflineOnly: false,
    showLowBattery: false,
    sortBy: 'name'
  })
  // const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree')

  const { tenantParams } = useTenantScope()
  const { user: authUser } = useAuth()

  // Get all available addresses for location creation
  const [availableAddresses, setAvailableAddresses] = useState<{id: string, street: string, number: string, zipCode: string, city: {id: string, name: string}}[]>([])

  // Filtered and sorted locations based on search and filters
  const filteredLocations = useMemo(() => {
    let filtered = locations

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query) ||
        location.address?.street?.toLowerCase().includes(query) ||
        location.address?.city?.name?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filterOptions.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'locks':
          return (b._count?.locks || 0) - (a._count?.locks || 0)
        case 'status': {
          // Sort by address city, then by name
          const cityCompare = (a.address?.city?.name || '').localeCompare(b.address?.city?.name || '')
          return cityCompare !== 0 ? cityCompare : a.name.localeCompare(b.name)
        }
        default:
          return 0
      }
    })

    return filtered
  }, [locations, searchQuery, filterOptions])

  const fetchLocations = useCallback(async () => {
    if (!authUser) {
      setError('Please log in to view locations')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🏠 Fetching locations with params:', tenantParams)
      const { data } = await api.get('/api/location', { params: tenantParams })
      console.log('✅ Locations received:', data)
      setLocations(data.data || [])
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      console.error('❌ Error fetching locations:', error)
      setError(`Failed to load locations: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }, [authUser, tenantParams])

  const fetchLocationDetails = useCallback(async (location: Location, tab: 'users' | 'locks' | 'keys') => {
    if (!authUser || !location) return

    try {
      setDetailLoading(true)
      
      console.log(`🔍 Fetching ${tab} for location:`, location.id)

      if (tab === 'users') {
        const { data } = await api.get(`/api/location/${location.addressId}/users`, { params: tenantParams })
        console.log('✅ Users received:', data)
        setUsers(data.data || [])
      } else if (tab === 'locks') {
        const { data } = await api.get(`/api/location/${location.id}/locks`, { params: tenantParams })
        console.log('✅ Locks received:', data)
        setLocks(data.data || [])
      } else if (tab === 'keys') {
        const { data } = await api.get(`/api/location/${location.addressId}/keys`, { params: tenantParams })
        console.log('✅ RFID Keys received:', data)
        setRfidKeys(data.data || [])
      }
      
      // Mark this tab as loaded for this location
      setLoadedTabs(prev => new Set(prev).add(`${location.id}-${tab}`))
      
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      console.error(`❌ Error fetching ${tab}:`, error)
      setError(`Failed to load ${tab}: ${error.response?.data?.error || error.message}`)
    } finally {
      setDetailLoading(false)
    }
  }, [authUser, tenantParams])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  useEffect(() => {
    if (selectedLocation) {
      fetchLocationDetails(selectedLocation, activeTab)
    }
  }, [selectedLocation, activeTab, fetchLocationDetails])

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location)
    setActiveTab('users') // Reset to first tab
    // Clear previous data
    setUsers([])
    setLocks([])
    setRfidKeys([])
    // Clear loaded tabs tracking
    setLoadedTabs(new Set())
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
    if (selectedLocation) {
      fetchLocationDetails(selectedLocation, activeTab)
    }
  }

  // New handlers for enhanced functionality
  const handleAddLocation = () => {
    console.log('handleAddLocation called')
    console.log('Current locationModalOpen state:', locationModalOpen)
    setLocationToEdit(null)
    setLocationModalOpen(true)
    console.log('Setting locationModalOpen to true')
  }

  const handleEditLocation = (location: Location) => {
    setLocationToEdit(location)
    setLocationModalOpen(true)
  }

  const handleLocationModalSuccess = () => {
    fetchLocations() // Refresh locations list
    setLocationModalOpen(false)
    setLocationToEdit(null)
  }

  const handleDeleteLocation = (location: Location) => {
    setLocationToDelete(location)
    setDeleteModalOpen(true)
  }

  // Lock management handlers
  const handleAddLock = () => {
    setLockToEdit(null)
    setLockModalOpen(true)
  }

  const handleEditLock = (lock: Lock) => {
    setLockToEdit(lock)
    setLockModalOpen(true)
  }

  const handleLockModalSuccess = () => {
    fetchLocations() // Refresh locations list
    if (selectedLocation) {
      fetchLocationDetails(selectedLocation, activeTab) // Refresh current tab
    }
    setLockModalOpen(false)
    setLockToEdit(null)
  }

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return

    setDeleteLoading(true)
    try {
      await api.delete(`/api/location/${locationToDelete.id}`, { params: tenantParams })
      
      // If we're deleting the currently selected location, clear selection
      if (selectedLocation?.id === locationToDelete.id) {
        setSelectedLocation(null)
        setUsers([])
        setLocks([])
        setRfidKeys([])
      }
      
      fetchLocations() // Refresh locations list
      setDeleteModalOpen(false)
      setLocationToDelete(null)
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>
      console.error('Delete location error:', err)
      // You might want to show a toast error here
      alert(`Failed to delete location: ${axiosErr.response?.data?.error || 'Unknown error'}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBulkModalSuccess = () => {
    fetchLocations() // Refresh locations list
  }

  // Fetch available addresses for location creation
  const fetchAddresses = useCallback(async () => {
    try {
      console.log('Fetching addresses with params:', tenantParams)
      const { data } = await api.get('/api/address', { params: tenantParams })
      console.log('Addresses loaded:', data.data || [])
      setAvailableAddresses(data.data || [])
    } catch (err) {
      console.error('Failed to fetch addresses:', err)
    }
  }, [tenantParams])

  useEffect(() => {
    if (authUser) {
      fetchAddresses()
    }
  }, [authUser, fetchAddresses])

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
          onClick={fetchLocations}
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
            <span className="text-xs bg-yellow-100 px-2 py-1 rounded ml-3">
              Modal: {locationModalOpen ? 'OPEN' : 'CLOSED'} | Addresses: {availableAddresses.length}
            </span>
          </div>
          <p className="text-gray-600 mb-4">Manage locations and view associated users, locks, and keys</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Signed in as: <span className="font-medium">{authUser?.firstName} {authUser?.lastName}</span></span>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <LocationSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOptions={filterOptions}
          onFilterChange={setFilterOptions}
          totalCount={locations.length}
          filteredCount={filteredLocations.length}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations Tree */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">Addresses & Locations</h2>
                </div>
                <button
                  onClick={handleAddLocation}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Location
                </button>
              </div>
              
              <div className="text-sm text-gray-500 mt-3">
                {filteredLocations.length} of {locations.length} locations
              </div>
            </div>
            <div className="p-6">
              {/* Address Tree View */}
              <AddressTree
                locations={filteredLocations}
                selectedLocation={selectedLocation}
                onLocationClick={handleLocationClick}
                onAddLocation={handleAddLocation}
                onEditLocation={handleEditLocation}
                onDeleteLocation={handleDeleteLocation}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="lg:col-span-2">
          {selectedLocation ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedLocation.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedLocation.address?.street} {selectedLocation.address?.number}, {selectedLocation.address?.city?.name || 'Unknown City'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditLocation(selectedLocation)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(selectedLocation)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
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
                        Users ({selectedLocation && loadedTabs.has(`${selectedLocation.id}-users`) ? users?.length || 0 : '?'}){detailLoading && activeTab === 'users' && <span className="ml-1 text-xs">⟳</span>}
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
                        Locks ({selectedLocation._count?.locks || 0}){detailLoading && activeTab === 'locks' && <span className="ml-1 text-xs">⟳</span>}
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
                        Keys ({selectedLocation && loadedTabs.has(`${selectedLocation.id}-keys`) ? rfidKeys?.length || 0 : '?'}){detailLoading && activeTab === 'keys' && <span className="ml-1 text-xs">⟳</span>}
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
                                <div className="space-y-2 text-sm mb-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Role: {user.role.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-2">
                                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                      <span className="text-gray-500">{user.rfidKeys?.length || 0} keys</span>
                                    </div>
                                  </div>
                                  {user.accessType && (
                                    <div className="flex items-center gap-3 text-xs">
                                      {user.accessType.hasPermissions && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                          <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                                          </svg>
                                          Lock Access
                                        </span>
                                      )}
                                      {user.accessType.hasActiveRfidKey && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                          </svg>
                                          RFID Key
                                        </span>
                                      )}
                                      {user.accessType.hasRecentAccess && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Recent Access
                                        </span>
                                      )}
                                    </div>
                                  )}
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
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Locks at this Location</h3>
                          <button
                            onClick={handleAddLock}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Lock
                          </button>
                        </div>
                        
                        {(locks || []).length === 0 ? (
                          <div className="text-center py-8">
                            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                            </svg>
                            <div className="text-gray-600 font-medium">No locks found</div>
                            <div className="text-gray-500 text-sm mt-1">
                              {detailLoading ? 'Loading locks...' : 'No locks are installed at this location'}
                            </div>
                            <button
                              onClick={handleAddLock}
                              className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add First Lock
                            </button>
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
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(true, lock.isOnline)}
                                    <button
                                      onClick={() => handleEditLock(lock)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors"
                                    >
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                  </div>
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
                                    <span className="text-gray-500">Issued:</span>
                                    <span className="text-gray-900">
                                      {new Date(key.issuedAt || key.assignedAt || Date.now()).toLocaleDateString()}
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
                <div className="text-gray-600 font-medium">Select a Location</div>
                <div className="text-gray-500 text-sm mt-1">
                  Choose a location from the list to view its users, locks, and keys
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Management Modal */}
      {permissionModalUser && selectedLocation && (
        <LocationUserPermissionModal
          user={permissionModalUser}
          location={selectedLocation}
          onClose={handlePermissionModalClose}
          onSuccess={handlePermissionModalSuccess}
        />
      )}

      {/* Location Management Modal */}
      <LocationManagementModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSuccess={handleLocationModalSuccess}
        location={locationToEdit}
        availableAddresses={availableAddresses}
      />

      {/* Lock Management Modal */}
      <LockManagementModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        onSuccess={handleLockModalSuccess}
        lock={lockToEdit}
        currentLocationId={selectedLocation?.id}
        availableLocations={locations}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Location"
        message={`Are you sure you want to delete "${locationToDelete?.name}"? This action cannot be undone and will remove all associated locks and permissions.`}
        confirmText="Delete Location"
        confirmStyle="danger"
        loading={deleteLoading}
      />

      {/* Bulk Operations Modal */}
      <BulkLocationOperations
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={handleBulkModalSuccess}
        selectedLocations={[]}
      />
    </div>
  )
}

export default Locations