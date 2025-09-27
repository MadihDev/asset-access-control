import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope } from '../../hooks/useTenantScope'
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

interface Address {
  id: string
  street: string
  number: string
  city: { name: string }
}

interface Location {
  id: string
  name: string
  description?: string
  address: Address
  _count?: {
    locks: number
  }
}

interface UserPermission {
  id: string
  userId: string
  lockId: string
  canAccess: boolean
  timeRestrictions?: {
    startTime?: string
    endTime?: string
    daysOfWeek?: number[]
  }
  expiresAt?: string
  lock: {
    id: string
    name: string
    location: Location
  }
}

interface EnhancedPermissionAssignmentProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User
}

interface LocationPermissionState {
  locationId: string
  selected: boolean
  lockIds: string[]
  timeRestrictions?: {
    startTime?: string
    endTime?: string
    daysOfWeek?: number[]
  }
  expiresAt?: string
}

export default function EnhancedPermissionAssignment({
  isOpen,
  onClose,
  onSuccess,
  user
}: EnhancedPermissionAssignmentProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const queryClient = useQueryClient()

  const [locationPermissions, setLocationPermissions] = useState<Record<string, LocationPermissionState>>({})
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())
  const [bulkSelection, setBulkSelection] = useState({
    timeRestrictions: {
      startTime: '',
      endTime: '',
      daysOfWeek: [] as number[],
      enabled: false
    },
    expiresAt: '',
    applyToAll: false
  })

  // Fetch all locations grouped by address
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations-with-locks', tenantParams],
    queryFn: async () => {
      const response = await api.get('/api/location', {
        params: { ...tenantParams, includeAddress: true, includeLocks: true }
      })
      return response.data.data as Location[]
    },
    enabled: isOpen
  })

  // Fetch user's current permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', user.id, tenantParams],
    queryFn: async () => {
      const response = await api.get(`/api/user/${user.id}/permissions`, {
        params: tenantParams
      })
      return response.data.data as UserPermission[]
    },
    enabled: isOpen
  })

  // Group locations by address
  const groupedLocations = locationsData?.reduce((acc, location) => {
    const addressKey = location.address.id
    if (!acc[addressKey]) {
      acc[addressKey] = {
        address: location.address,
        locations: []
      }
    }
    acc[addressKey].locations.push(location)
    return acc
  }, {} as Record<string, { address: Address; locations: Location[] }>)

  // Initialize location permissions state
  useEffect(() => {
    if (locationsData && userPermissions) {
      const initialState: Record<string, LocationPermissionState> = {}
      
      locationsData.forEach(location => {
        const userLocPermissions = userPermissions.filter(
          perm => perm.lock.location.id === location.id
        )
        
        initialState[location.id] = {
          locationId: location.id,
          selected: userLocPermissions.length > 0,
          lockIds: userLocPermissions.map(perm => perm.lockId),
          timeRestrictions: userLocPermissions[0]?.timeRestrictions,
          expiresAt: userLocPermissions[0]?.expiresAt
        }
      })
      
      setLocationPermissions(initialState)
    }
  }, [locationsData, userPermissions])

  const permissionMutation = useMutation({
    mutationFn: async (permissions: LocationPermissionState[]) => {
      const response = await api.post(`/api/user/${user.id}/permissions/bulk`, {
        permissions: permissions.map(perm => ({
          locationId: perm.locationId,
          lockIds: perm.lockIds,
          canAccess: perm.selected,
          timeRestrictions: perm.timeRestrictions,
          expiresAt: perm.expiresAt
        }))
      }, { params: tenantParams })
      return response.data
    },
    onSuccess: () => {
      toastSuccess('Permissions updated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>
      const message = axiosError.response?.data?.error || 'Failed to update permissions'
      toastError(message)
    }
  })

  const handleLocationToggle = (locationId: string) => {
    setLocationPermissions(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        selected: !prev[locationId]?.selected
      }
    }))
  }



  const handleTimeRestrictions = (locationId: string, restrictions: {
    startTime?: string
    endTime?: string
    daysOfWeek?: number[]
  }) => {
    setLocationPermissions(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        timeRestrictions: restrictions
      }
    }))
  }

  const handleExpiryDate = (locationId: string, expiresAt: string) => {
    setLocationPermissions(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        expiresAt
      }
    }))
  }

  const applyBulkSettings = () => {
    const selectedLocations = Object.values(locationPermissions).filter(perm => perm.selected)
    
    selectedLocations.forEach(locationPerm => {
      if (bulkSelection.timeRestrictions.enabled) {
        handleTimeRestrictions(locationPerm.locationId, {
          startTime: bulkSelection.timeRestrictions.startTime,
          endTime: bulkSelection.timeRestrictions.endTime,
          daysOfWeek: bulkSelection.timeRestrictions.daysOfWeek
        })
      }
      
      if (bulkSelection.expiresAt) {
        handleExpiryDate(locationPerm.locationId, bulkSelection.expiresAt)
      }
    })
    
    toastSuccess(`Applied bulk settings to ${selectedLocations.length} location(s)`)
  }

  const handleSave = () => {
    const permissionsToSave = Object.values(locationPermissions).filter(perm => perm.selected || perm.lockIds.length > 0)
    permissionMutation.mutate(permissionsToSave)
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (!isOpen) return null

  return (
    <Modal
      title={`Enhanced Permission Assignment - ${user.firstName} ${user.lastName}`}
      onClose={onClose}
      maxWidth="2xl"
    >
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {/* Bulk Settings Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Bulk Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Restrictions */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={bulkSelection.timeRestrictions.enabled}
                  onChange={(e) => setBulkSelection(prev => ({
                    ...prev,
                    timeRestrictions: { ...prev.timeRestrictions, enabled: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Apply Time Restrictions</span>
              </label>
              
              {bulkSelection.timeRestrictions.enabled && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={bulkSelection.timeRestrictions.startTime}
                      onChange={(e) => setBulkSelection(prev => ({
                        ...prev,
                        timeRestrictions: { ...prev.timeRestrictions, startTime: e.target.value }
                      }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    />
                    <input
                      type="time"
                      value={bulkSelection.timeRestrictions.endTime}
                      onChange={(e) => setBulkSelection(prev => ({
                        ...prev,
                        timeRestrictions: { ...prev.timeRestrictions, endTime: e.target.value }
                      }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                  <div className="flex gap-1">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const daysOfWeek = bulkSelection.timeRestrictions.daysOfWeek.includes(index)
                            ? bulkSelection.timeRestrictions.daysOfWeek.filter(d => d !== index)
                            : [...bulkSelection.timeRestrictions.daysOfWeek, index]
                          setBulkSelection(prev => ({
                            ...prev,
                            timeRestrictions: { ...prev.timeRestrictions, daysOfWeek }
                          }))
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          bulkSelection.timeRestrictions.daysOfWeek.includes(index)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="datetime-local"
                value={bulkSelection.expiresAt}
                onChange={(e) => setBulkSelection(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
              />
            </div>
          </div>
          
          <button
            onClick={applyBulkSettings}
            className="mt-3 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply to Selected Locations
          </button>
        </div>

        {/* Location Tree */}
        {locationsLoading || permissionsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading locations and permissions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedLocations || {}).map(([addressId, { address, locations }]) => (
              <div key={addressId} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedAddresses(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(addressId)) {
                      newSet.delete(addressId)
                    } else {
                      newSet.add(addressId)
                    }
                    return newSet
                  })}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">
                        {address.street} {address.number}
                      </div>
                      <div className="text-sm text-gray-500">{address.city.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{locations.length} location(s)</span>
                    {expandedAddresses.has(addressId) ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
                
                {expandedAddresses.has(addressId) && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {locations.map(location => {
                      const locationPerm = locationPermissions[location.id] || {
                        locationId: location.id,
                        selected: false,
                        lockIds: []
                      }
                      
                      return (
                        <div key={location.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={locationPerm.selected}
                                onChange={() => handleLocationToggle(location.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <div className="font-medium text-gray-900">{location.name}</div>
                                <div className="text-sm text-gray-500">
                                  {location._count?.locks || 0} locks available
                                </div>
                              </div>
                            </label>
                          </div>
                          
                          {locationPerm.selected && (
                            <div className="ml-7 space-y-2 text-sm">
                              <div className="text-gray-600">
                                Selected locks: {locationPerm.lockIds.length} of {location._count?.locks || 0}
                              </div>
                              
                              {locationPerm.timeRestrictions && (
                                <div className="text-blue-600">
                                  Time: {locationPerm.timeRestrictions.startTime} - {locationPerm.timeRestrictions.endTime}
                                </div>
                              )}
                              
                              {locationPerm.expiresAt && (
                                <div className="text-orange-600">
                                  Expires: {new Date(locationPerm.expiresAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={permissionMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {permissionMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Permissions'
          )}
        </button>
      </div>
    </Modal>
  )
}