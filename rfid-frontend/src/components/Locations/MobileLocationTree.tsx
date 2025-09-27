import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

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

interface Lock {
  id: string
  name: string
  lockType?: string
  isOnline: boolean
  batteryLevel?: number
  locationId?: string
}

interface MobileLocationTreeProps {
  locations: Location[]
  locks: Lock[]
  selectedLocationId?: string
  selectedLockId?: string
  onLocationSelect?: (location: Location) => void
  onLockSelect?: (lock: Lock) => void
  showLockDetails?: boolean
  searchQuery?: string
  bulkSelection?: {
    enabled: boolean
    selectedLocations: Location[]
    onLocationToggle: (location: Location) => void
    onSelectAll: () => void
    selectAll: boolean
  }
}

export default function MobileLocationTree({
  locations,
  locks,
  selectedLocationId,
  selectedLockId,
  onLocationSelect,
  onLockSelect,
  showLockDetails = false,
  searchQuery = '',
  bulkSelection
}: MobileLocationTreeProps) {
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

  // Group locations by address
  const groupedLocations = locations.reduce((acc, location) => {
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

  // Filter locations based on search
  const filteredGroupedLocations = Object.entries(groupedLocations).reduce((acc, [addressId, data]) => {
    const filteredLocations = data.locations.filter(location =>
      !searchQuery || 
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.city.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    if (filteredLocations.length > 0) {
      acc[addressId] = { ...data, locations: filteredLocations }
    }
    
    return acc
  }, {} as Record<string, { address: Address; locations: Location[] }>)

  const toggleAddress = (addressId: string) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(addressId)) {
        newSet.delete(addressId)
      } else {
        newSet.add(addressId)
      }
      return newSet
    })
  }

  const toggleLocation = (locationId: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(locationId)) {
        newSet.delete(locationId)
      } else {
        newSet.add(locationId)
      }
      return newSet
    })
  }

  const getLocationLocks = (locationId: string) => {
    return locks.filter(lock => {
      // Assuming locks have locationId - adjust based on your data structure
      return lock.locationId === locationId
    })
  }

  const getStatusIcon = (isOnline: boolean, batteryLevel?: number) => {
    if (!isOnline) {
      return (
        <div className="h-3 w-3 rounded-full bg-red-500" title="Offline" />
      )
    }
    
    if (batteryLevel !== undefined && batteryLevel < 20) {
      return (
        <div className="h-3 w-3 rounded-full bg-orange-500" title={`Battery: ${batteryLevel}%`} />
      )
    }
    
    return (
      <div className="h-3 w-3 rounded-full bg-green-500" title="Online" />
    )
  }

  if (Object.keys(filteredGroupedLocations).length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-600 font-medium">No locations found</p>
        <p className="text-gray-500 text-sm mt-1">
          {searchQuery ? 'Try adjusting your search terms' : 'No locations available'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Bulk Selection Header */}
      {bulkSelection?.enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
              <input
                type="checkbox"
                checked={bulkSelection.selectAll}
                onChange={bulkSelection.onSelectAll}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              Select All
            </label>
            <span className="text-sm text-blue-700">
              {bulkSelection.selectedLocations.length} selected
            </span>
          </div>
        </div>
      )}

      {/* Location Tree */}
      {Object.entries(filteredGroupedLocations).map(([addressId, { address, locations }]) => (
        <div key={addressId} className="border border-gray-200 rounded-lg bg-white shadow-sm">
          {/* Address Header */}
          <button
            onClick={() => toggleAddress(addressId)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">
                  {address.street} {address.number}
                </div>
                <div className="text-sm text-gray-500 truncate">{address.city.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {locations.length}
              </span>
              {expandedAddresses.has(addressId) ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </button>
          
          {/* Locations List */}
          {expandedAddresses.has(addressId) && (
            <div className="border-t border-gray-200">
              {locations.map(location => {
                const isSelected = selectedLocationId === location.id
                const locationLocks = getLocationLocks(location.id)
                const isLocationExpanded = expandedLocations.has(location.id)
                
                return (
                  <div key={location.id}>
                    {/* Location Row */}
                    <div className={`border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center p-4">
                        {/* Bulk Selection Checkbox */}
                        {bulkSelection?.enabled && (
                          <input
                            type="checkbox"
                            checked={bulkSelection.selectedLocations.some(loc => loc.id === location.id)}
                            onChange={() => bulkSelection.onLocationToggle(location)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3 flex-shrink-0"
                          />
                        )}
                        
                        {/* Location Content */}
                        <div 
                          className="flex items-center justify-between w-full min-w-0 cursor-pointer"
                          onClick={() => onLocationSelect?.(location)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{location.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{location._count?.locks || 0} locks</span>
                                {location.description && (
                                  <span className="truncate">{location.description}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Lock Expansion Button */}
                          {showLockDetails && locationLocks.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleLocation(location.id)
                              }}
                              className="p-1 hover:bg-gray-200 rounded flex-shrink-0 ml-2"
                            >
                              {isLocationExpanded ? (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Locks List */}
                      {showLockDetails && isLocationExpanded && locationLocks.length > 0 && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          {locationLocks.map(lock => (
                            <div
                              key={lock.id}
                              className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-100 ${
                                selectedLockId === lock.id ? 'bg-purple-50 border-purple-200' : ''
                              }`}
                              onClick={() => onLockSelect?.(lock)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <svg className="h-4 w-4 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-900 text-sm truncate">{lock.name}</div>
                                    {lock.lockType && (
                                      <div className="text-xs text-gray-500">{lock.lockType}</div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getStatusIcon(lock.isOnline, lock.batteryLevel)}
                                  {lock.batteryLevel !== undefined && (
                                    <span className="text-xs text-gray-500">
                                      {lock.batteryLevel}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}