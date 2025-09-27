import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'

interface Address {
  id: string
  street: string
  number: string
  city: { name: string }
}

interface Location {
  id: string
  name: string
  address: Address
}

interface Lock {
  id: string
  name: string
  location?: Location
}

interface BreadcrumbItem {
  id: string
  name: string
  type: 'home' | 'address' | 'location' | 'lock'
  onClick?: () => void
  current?: boolean
}

interface LocationBreadcrumbProps {
  currentAddress?: Address
  currentLocation?: Location
  currentLock?: Lock
  onAddressClick?: (address: Address) => void
  onLocationClick?: (location: Location) => void
  onLockClick?: (lock: Lock) => void
  onHomeClick?: () => void
  className?: string
}

export default function LocationBreadcrumb({
  currentAddress,
  currentLocation,
  currentLock,
  onAddressClick,
  onLocationClick,
  onLockClick,
  onHomeClick,
  className = ''
}: LocationBreadcrumbProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      id: 'home',
      name: 'Locations',
      type: 'home',
      onClick: onHomeClick
    }
  ]

  // Add address if we have one
  if (currentAddress) {
    breadcrumbs.push({
      id: currentAddress.id,
      name: `${currentAddress.street} ${currentAddress.number}`,
      type: 'address',
      onClick: () => onAddressClick?.(currentAddress)
    })
  }

  // Add location if we have one
  if (currentLocation) {
    breadcrumbs.push({
      id: currentLocation.id,
      name: currentLocation.name,
      type: 'location',
      onClick: () => onLocationClick?.(currentLocation)
    })
  }

  // Add lock if we have one
  if (currentLock) {
    breadcrumbs.push({
      id: currentLock.id,
      name: currentLock.name,
      type: 'lock',
      onClick: () => onLockClick?.(currentLock),
      current: true
    })
  } else if (currentLocation) {
    breadcrumbs[breadcrumbs.length - 1].current = true
  } else if (currentAddress) {
    breadcrumbs[breadcrumbs.length - 1].current = true
  } else {
    breadcrumbs[0].current = true
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <HomeIcon className="h-4 w-4" />
      case 'address':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'location':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'lock':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getTypeColor = (type: string, current: boolean) => {
    if (current) {
      return 'text-blue-600'
    }
    
    switch (type) {
      case 'home':
        return 'text-gray-500 hover:text-gray-700'
      case 'address':
        return 'text-blue-500 hover:text-blue-700'
      case 'location':
        return 'text-green-500 hover:text-green-700'
      case 'lock':
        return 'text-purple-500 hover:text-purple-700'
      default:
        return 'text-gray-500 hover:text-gray-700'
    }
  }

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.id} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
            )}
            
            <div className="flex items-center gap-1.5">
              {breadcrumb.onClick ? (
                <button
                  onClick={breadcrumb.onClick}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${getTypeColor(
                    breadcrumb.type,
                    breadcrumb.current || false
                  )} ${breadcrumb.current ? 'cursor-default' : 'hover:underline'}`}
                  disabled={breadcrumb.current}
                >
                  {getIcon(breadcrumb.type)}
                  <span className="truncate max-w-32 sm:max-w-48 md:max-w-none">
                    {breadcrumb.name}
                  </span>
                </button>
              ) : (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${getTypeColor(
                  breadcrumb.type,
                  breadcrumb.current || false
                )}`}>
                  {getIcon(breadcrumb.type)}
                  <span className="truncate max-w-32 sm:max-w-48 md:max-w-none">
                    {breadcrumb.name}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Quick Location Switcher Component
interface QuickLocationSwitcherProps {
  locations: Location[]
  currentLocationId?: string
  onLocationSelect: (location: Location) => void
  className?: string
}

export function QuickLocationSwitcher({
  locations,
  currentLocationId,
  onLocationSelect,
  className = ''
}: QuickLocationSwitcherProps) {
  const currentLocation = locations.find(loc => loc.id === currentLocationId)
  
  return (
    <div className={`relative ${className}`}>
      <select
        value={currentLocationId || ''}
        onChange={(e) => {
          const location = locations.find(loc => loc.id === e.target.value)
          if (location) onLocationSelect(location)
        }}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white"
      >
        <option value="">Select a location...</option>
        {locations.map(location => (
          <option key={location.id} value={location.id}>
            {location.name} - {location.address.street} {location.address.number}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      
      {/* Show current selection info */}
      {currentLocation && (
        <div className="mt-1 text-xs text-gray-500">
          Current: {currentLocation.address.city.name}
        </div>
      )}
    </div>
  )
}