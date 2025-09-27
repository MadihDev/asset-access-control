import { useState } from 'react'
import {
  LockClosedIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import type { NavigationItem } from './navigationItems'

interface SidebarNavigationProps {
  navigation: NavigationItem[]
  currentPath?: string
  onNavigate?: (item: NavigationItem) => void
  className?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export default function SidebarNavigation({
  navigation,
  currentPath,
  onNavigate,
  className = '',
  collapsed = false,
  onCollapsedChange
}: SidebarNavigationProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id)
    } else {
      onNavigate?.(item)
      item.onClick?.()
    }
  }

  const isItemCurrent = (item: NavigationItem) => {
    if (item.current) return true
    if (currentPath && item.href) return currentPath === item.href
    return false
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isCurrent = isItemCurrent(item)
    const Icon = item.icon

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item)}
          className={`
            group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors
            ${level > 0 ? 'ml-6' : ''}
            ${isCurrent 
              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
            ${collapsed ? 'justify-center px-1' : ''}
          `}
          title={collapsed ? item.name : undefined}
        >
          <Icon
            className={`
              flex-shrink-0 h-5 w-5 transition-colors
              ${isCurrent ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
              ${collapsed ? '' : 'mr-3'}
            `}
          />
          
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.name}</span>
              
              {/* Badge */}
              {item.badge && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {item.badge}
                </span>
              )}
              
              {/* Expand/collapse arrow */}
              {hasChildren && (
                <svg
                  className={`ml-2 h-4 w-4 transform transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          )}
        </button>
        
        {/* Children */}
        {hasChildren && !collapsed && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center">
            <LockClosedIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              Access Control
            </span>
          </div>
        )}
        
        {onCollapsedChange && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            {collapsed ? (
              <Bars3Icon className="h-6 w-6" />
            ) : (
              <XMarkIcon className="h-6 w-6" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map(item => renderNavigationItem(item))}
      </nav>
    </div>
  )
}



// Mobile sidebar component
interface MobileSidebarProps extends SidebarNavigationProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({
  isOpen,
  onClose,
  ...props
}: MobileSidebarProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform">
        <SidebarNavigation {...props} className="h-full" />
      </div>
    </>
  )
}