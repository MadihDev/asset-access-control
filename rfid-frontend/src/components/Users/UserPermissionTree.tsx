import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useTenantScope } from '../../hooks/useTenantScope'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

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
  createdAt: string
  lock: {
    id: string
    name: string
    location: Location
  }
}

interface UserPermissionTreeProps {
  user: User
  onEditPermissions?: (location: Location) => void
}

interface PermissionNode {
  type: 'address' | 'location' | 'lock'
  id: string
  name: string
  data: Address | Location | UserPermission
  children?: PermissionNode[]
  permissionCount?: number
  expiryInfo?: {
    hasExpiring: boolean
    nearestExpiry?: string
    expiredCount: number
  }
}

export default function UserPermissionTree({ user, onEditPermissions }: UserPermissionTreeProps) {
  const { tenantParams } = useTenantScope()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Fetch user permissions
  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: ['user-permissions-tree', user.id, tenantParams],
    queryFn: async () => {
      const response = await api.get(`/api/user/${user.id}/permissions`, {
        params: {
          ...tenantParams,
          includeLocation: true,
          includeLock: true
        }
      })
      return response.data.data as UserPermission[]
    }
  })

  // Build hierarchical tree structure
  const buildTree = (permissions: UserPermission[]): PermissionNode[] => {
    const addressMap = new Map<string, PermissionNode>()
    
    permissions.forEach(permission => {
      const address = permission.lock.location.address
      const location = permission.lock.location
      
      // Create or get address node
      if (!addressMap.has(address.id)) {
        addressMap.set(address.id, {
          type: 'address',
          id: address.id,
          name: `${address.street} ${address.number}, ${address.city.name}`,
          data: address,
          children: [],
          permissionCount: 0,
          expiryInfo: {
            hasExpiring: false,
            expiredCount: 0
          }
        })
      }
      
      const addressNode = addressMap.get(address.id)!
      
      // Find or create location node
      let locationNode = addressNode.children?.find(child => child.id === location.id)
      if (!locationNode) {
        locationNode = {
          type: 'location',
          id: location.id,
          name: location.name,
          data: location,
          children: [],
          permissionCount: 0,
          expiryInfo: {
            hasExpiring: false,
            expiredCount: 0
          }
        }
        addressNode.children!.push(locationNode)
      }
      
      // Add lock permission node
      const now = new Date()
      const expiresAt = permission.expiresAt ? new Date(permission.expiresAt) : null
      const isExpired = expiresAt && expiresAt < now
      const isExpiringSoon = expiresAt && expiresAt > now && expiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
      
      const lockNode: PermissionNode = {
        type: 'lock',
        id: permission.id,
        name: permission.lock.name,
        data: permission,
        permissionCount: 1,
        expiryInfo: {
          hasExpiring: isExpiringSoon || false,
          nearestExpiry: permission.expiresAt,
          expiredCount: isExpired ? 1 : 0
        }
      }
      
      locationNode.children!.push(lockNode)
      
      // Update counts and expiry info
      locationNode.permissionCount = (locationNode.permissionCount || 0) + 1
      addressNode.permissionCount = (addressNode.permissionCount || 0) + 1
      
      // Update expiry info
      if (isExpired) {
        locationNode.expiryInfo!.expiredCount = (locationNode.expiryInfo!.expiredCount || 0) + 1
        addressNode.expiryInfo!.expiredCount = (addressNode.expiryInfo!.expiredCount || 0) + 1
      }
      
      if (isExpiringSoon) {
        locationNode.expiryInfo!.hasExpiring = true
        addressNode.expiryInfo!.hasExpiring = true
        
        if (!locationNode.expiryInfo!.nearestExpiry || (expiresAt && expiresAt < new Date(locationNode.expiryInfo!.nearestExpiry))) {
          locationNode.expiryInfo!.nearestExpiry = permission.expiresAt
        }
        
        if (!addressNode.expiryInfo!.nearestExpiry || (expiresAt && expiresAt < new Date(addressNode.expiryInfo!.nearestExpiry))) {
          addressNode.expiryInfo!.nearestExpiry = permission.expiresAt
        }
      }
    })
    
    return Array.from(addressMap.values())
  }

  const tree = buildTree(permissions)

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const formatTimeRestrictions = (restrictions?: UserPermission['timeRestrictions']): string => {
    if (!restrictions) return 'No time restrictions'
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayNames = restrictions.daysOfWeek?.map(day => days[day]).join(', ') || 'All days'
    const timeRange = restrictions.startTime && restrictions.endTime 
      ? `${restrictions.startTime} - ${restrictions.endTime}`
      : 'All hours'
    
    return `${dayNames}, ${timeRange}`
  }

  const formatExpiryDate = (expiresAt?: string): { text: string; className: string } => {
    if (!expiresAt) return { text: 'Never expires', className: 'text-gray-500' }
    
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `Expired ${Math.abs(diffDays)} days ago`, className: 'text-red-600 font-medium' }
    } else if (diffDays <= 7) {
      return { text: `Expires in ${diffDays} days`, className: 'text-orange-600 font-medium' }
    } else {
      return { text: `Expires ${expiry.toLocaleDateString()}`, className: 'text-green-600' }
    }
  }

  const renderNode = (node: PermissionNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const indentClass = `ml-${depth * 4}`

    return (
      <div key={node.id} className="select-none">
        <div className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded ${indentClass}`}>
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}

          {/* Node Icon */}
          <div className="flex-shrink-0">
            {node.type === 'address' && (
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
            {node.type === 'location' && (
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {node.type === 'lock' && (
              <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-gray-900 truncate">{node.name}</span>
                
                {/* Permission Count Badge */}
                {node.permissionCount && node.permissionCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {node.permissionCount} {node.permissionCount === 1 ? 'permission' : 'permissions'}
                  </span>
                )}
                
                {/* Expiry Warnings */}
                {node.expiryInfo?.expiredCount && node.expiryInfo.expiredCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {node.expiryInfo.expiredCount} expired
                  </span>
                )}
                
                {node.expiryInfo?.hasExpiring && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Expiring soon
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {node.type === 'location' && onEditPermissions && (
                <button
                  onClick={() => onEditPermissions(node.data as Location)}
                  className="flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Lock Details */}
            {node.type === 'lock' && (
              <div className="mt-1 space-y-1 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Time: {formatTimeRestrictions((node.data as UserPermission).timeRestrictions)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={formatExpiryDate((node.data as UserPermission).expiresAt).className}>
                    {formatExpiryDate((node.data as UserPermission).expiresAt).text}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading user permissions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-red-600 font-medium">Failed to load permissions</p>
        <p className="text-gray-500 text-sm mt-1">Please try refreshing the page</p>
      </div>
    )
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-600 font-medium">No permissions assigned</p>
        <p className="text-gray-500 text-sm mt-1">
          {user.firstName} {user.lastName} doesn't have access to any locations yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {user.firstName} {user.lastName}'s Permissions
        </h3>
        <div className="text-sm text-gray-500">
          {permissions.length} total permissions
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg bg-white">
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  )
}