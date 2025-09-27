import { useState } from 'react'
import { MagnifyingGlassIcon, UserIcon, BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import LocationBreadcrumb, { QuickLocationSwitcher } from './LocationBreadcrumb'

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

interface User {
  id: string
  username: string
  firstName?: string
  lastName?: string
  email?: string
}

interface NavigationHeaderProps {
  // Navigation props
  currentAddress?: Address
  currentLocation?: Location
  currentLock?: Lock
  onAddressClick?: (address: Address) => void
  onLocationClick?: (location: Location) => void
  onLockClick?: (lock: Lock) => void
  onHomeClick?: () => void
  
  // Search props
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearchSubmit?: (query: string) => void
  searchPlaceholder?: string
  
  // Location switcher props
  locations?: Location[]
  onLocationSelect?: (location: Location) => void
  
  // User props
  currentUser?: User
  onUserMenuClick?: () => void
  onNotificationsClick?: () => void
  onSettingsClick?: () => void
  onLogout?: () => void
  
  // Notification props
  notificationCount?: number
  
  className?: string
}

export default function NavigationHeader({
  currentAddress,
  currentLocation,
  currentLock,
  onAddressClick,
  onLocationClick,
  onLockClick,
  onHomeClick,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search locations, locks, users...',
  locations = [],
  onLocationSelect,
  currentUser,
  onUserMenuClick,
  onNotificationsClick,
  onSettingsClick,
  onLogout,
  notificationCount = 0,
  className = ''
}: NavigationHeaderProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value)
    onSearchChange?.(value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchSubmit?.(localSearchQuery)
  }

  const getUserDisplayName = () => {
    if (!currentUser) return 'User'
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`
    }
    if (currentUser.firstName) return currentUser.firstName
    if (currentUser.lastName) return currentUser.lastName
    return currentUser.username
  }

  const getCurrentLocationId = () => {
    if (currentLock?.location) return currentLock.location.id
    if (currentLocation) return currentLocation.id
    return undefined
  }

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left section - Breadcrumb */}
          <div className="flex items-center flex-1 min-w-0">
            <LocationBreadcrumb
              currentAddress={currentAddress}
              currentLocation={currentLocation}
              currentLock={currentLock}
              onAddressClick={onAddressClick}
              onLocationClick={onLocationClick}
              onLockClick={onLockClick}
              onHomeClick={onHomeClick}
              className="min-w-0 flex-shrink"
            />
          </div>

          {/* Center section - Search */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={searchPlaceholder}
              />
            </form>
          </div>

          {/* Right section - Actions and User */}
          <div className="flex items-center space-x-4">
            {/* Quick Location Switcher */}
            {locations.length > 0 && onLocationSelect && (
              <div className="hidden lg:block">
                <QuickLocationSwitcher
                  locations={locations}
                  currentLocationId={getCurrentLocationId()}
                  onLocationSelect={onLocationSelect}
                  className="w-64"
                />
              </div>
            )}

            {/* Notifications */}
            <button
              type="button"
              onClick={onNotificationsClick}
              className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onSettingsClick}
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Settings</span>
              <Cog6ToothIcon className="h-6 w-6" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {getUserDisplayName()}
                </span>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {currentUser?.email && (
                      <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                        {currentUser.email}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onUserMenuClick?.()
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Your Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onSettingsClick?.()
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onLogout?.()
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile location switcher */}
        {locations.length > 0 && onLocationSelect && (
          <div className="lg:hidden pb-3">
            <QuickLocationSwitcher
              locations={locations}
              currentLocationId={getCurrentLocationId()}
              onLocationSelect={onLocationSelect}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  )
}