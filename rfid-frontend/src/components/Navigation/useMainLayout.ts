import { useState } from 'react'
import type { NavigationItem } from './navigationItems'

// Hook for managing layout state
export function useMainLayout() {
  const [currentPath, setCurrentPath] = useState('/')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navigate = (item: NavigationItem) => {
    if (item.href) {
      setCurrentPath(item.href)
      // In a real app, you'd use your router here
      // e.g., router.push(item.href)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Implement search logic
    console.log('Search:', query)
  }

  return {
    currentPath,
    setCurrentPath,
    sidebarCollapsed,
    setSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    navigate,
    handleSearch
  }
}