import { useState, useEffect } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import NavigationHeader from './NavigationHeader'
import SidebarNavigation, { MobileSidebar } from './SidebarNavigation'
import { defaultNavigationItems } from './navigationItems'
import type { NavigationItem } from './navigationItems'

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

interface MainLayoutProps {
  children: React.ReactNode
  
  // Navigation state
  currentPath?: string
  currentAddress?: Address
  currentLocation?: Location
  currentLock?: Lock
  
  // Navigation handlers
  onNavigate?: (item: NavigationItem) => void
  onAddressClick?: (address: Address) => void
  onLocationClick?: (location: Location) => void
  onLockClick?: (lock: Lock) => void
  onHomeClick?: () => void
  
  // Search
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearchSubmit?: (query: string) => void
  
  // Location switcher
  locations?: Location[]
  onLocationSelect?: (location: Location) => void
  
  // User
  currentUser?: User
  onUserMenuClick?: () => void
  onNotificationsClick?: () => void
  onSettingsClick?: () => void
  onLogout?: () => void
  notificationCount?: number
  
  // Navigation items
  navigationItems?: NavigationItem[]
  
  // Layout options
  sidebarCollapsed?: boolean
  onSidebarCollapsedChange?: (collapsed: boolean) => void
  
  className?: string
}

export default function MainLayout({
  children,
  currentPath,
  currentAddress,
  currentLocation,
  currentLock,
  onNavigate,
  onAddressClick,
  onLocationClick,
  onLockClick,
  onHomeClick,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  locations = [],
  onLocationSelect,
  currentUser,
  onUserMenuClick,
  onNotificationsClick,
  onSettingsClick,
  onLogout,
  notificationCount = 0,
  navigationItems = defaultNavigationItems,
  sidebarCollapsed = false,
  onSidebarCollapsedChange,
  className = ''
}: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu when navigation occurs
  const handleNavigate = (item: NavigationItem) => {
    setIsMobileMenuOpen(false)
    onNavigate?.(item)
  }

  // Update navigation items with current state
  const navigationWithCurrent = navigationItems.map(item => ({
    ...item,
    current: currentPath === item.href,
    children: item.children?.map(child => ({
      ...child,
      current: currentPath === child.href
    }))
  }))

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64'

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile menu button */}
      {isMobile && (
        <div className="lg:hidden">
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="block h-6 w-6" />
            </button>
            
            <div className="flex items-center">
              <span className="text-xl font-semibold text-gray-900">
                Access Control
              </span>
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} transition-all duration-300`}>
          <SidebarNavigation
            navigation={navigationWithCurrent}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onCollapsedChange={onSidebarCollapsedChange}
          />
        </div>
      )}

      {/* Mobile sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigationWithCurrent}
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />

      {/* Main content */}
      <div className={`${!isMobile ? `ml-${sidebarWidth.split('-')[1]} transition-all duration-300` : ''}`}>
        {/* Header */}
        <div className={`${isMobile ? 'hidden' : 'block'}`}>
          <NavigationHeader
            currentAddress={currentAddress}
            currentLocation={currentLocation}
            currentLock={currentLock}
            onAddressClick={onAddressClick}
            onLocationClick={onLocationClick}
            onLockClick={onLockClick}
            onHomeClick={onHomeClick}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            locations={locations}
            onLocationSelect={onLocationSelect}
            currentUser={currentUser}
            onUserMenuClick={onUserMenuClick}
            onNotificationsClick={onNotificationsClick}
            onSettingsClick={onSettingsClick}
            onLogout={onLogout}
            notificationCount={notificationCount}
          />
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

