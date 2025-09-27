import React, { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Address {
  id: string
  street: string
  number: string
  zipCode: string
  city: {
    id: string
    name: string
  }
}

interface Location {
  id: string
  name: string
  description?: string
  addressId: string
  address: Address
  _count?: {
    locks: number
    users?: number
  }
}

interface AddressTreeProps {
  locations: Location[]
  selectedLocation: Location | null
  onLocationClick: (location: Location) => void
  onAddLocation: () => void
  onEditLocation: (location: Location) => void
  onDeleteLocation: (location: Location) => void
  loading: boolean
}

interface AddressGroup {
  address: Address
  locations: Location[]
}

const AddressTree: React.FC<AddressTreeProps> = ({
  locations,
  selectedLocation,
  onLocationClick,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  loading
}) => {
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())

  // Group locations by address
  const addressGroups: AddressGroup[] = React.useMemo(() => {
    const groupMap = new Map<string, AddressGroup>()
    
    locations.forEach(location => {
      const addressId = location.address.id
      if (!groupMap.has(addressId)) {
        groupMap.set(addressId, {
          address: location.address,
          locations: []
        })
      }
      groupMap.get(addressId)!.locations.push(location)
    })
    
    return Array.from(groupMap.values()).sort((a, b) => 
      a.address.street.localeCompare(b.address.street)
    )
  }, [locations])

  const toggleAddressExpansion = (addressId: string) => {
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

  const isAddressExpanded = (addressId: string) => {
    return expandedAddresses.has(addressId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (addressGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p>No addresses found</p>
        <button
          onClick={onAddLocation}
          className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add First Location
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {addressGroups.map((group) => {
        const isExpanded = isAddressExpanded(group.address.id)
        
        return (
          <div key={group.address.id} className="space-y-1">
            {/* Address Header */}
            <div 
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
              onClick={() => toggleAddressExpansion(group.address.id)}
            >
              {/* Expand/Collapse Icon */}
              <button className="flex-shrink-0 p-1 rounded hover:bg-gray-100">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                )}
              </button>

              {/* Building Icon */}
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>

              {/* Address Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {group.address.street} {group.address.number}
                </div>
                <div className="text-sm text-gray-500">
                  {group.address.city.name} • {group.locations.length} location{group.locations.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Address Actions (shown on hover) */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Add address edit functionality
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit address"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Locations (shown when expanded) */}
            {isExpanded && (
              <div className="ml-6 space-y-1 border-l-2 border-gray-100 pl-4">
                {group.locations.map((location) => {
                  const isSelected = selectedLocation?.id === location.id
                  
                  return (
                    <div
                      key={location.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => onLocationClick(location)}
                    >
                      {/* Location Icon */}
                      <div className="flex-shrink-0">
                        <svg className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>

                      {/* Location Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {location.name}
                        </div>
                        {location.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {location.description}
                          </div>
                        )}
                      </div>

                      {/* Location Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {location._count?.users || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m12 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12z" />
                          </svg>
                          {location._count?.locks || 0}
                        </span>
                      </div>

                      {/* Location Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditLocation(location)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit location"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteLocation(location)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete location"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add Location Button */}
                <div className="pt-2">
                  <button
                    onClick={() => onAddLocation()}
                    className="flex items-center gap-2 w-full p-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Location to {group.address.street} {group.address.number}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AddressTree