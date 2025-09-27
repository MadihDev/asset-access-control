import React, { useState, useMemo } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  LockClosedIcon,
  UserGroupIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

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
    keys?: number
  }
}

interface Lock {
  id: string
  name: string
  description?: string
  isOnline: boolean
  locationId: string
  lockType?: string
  batteryLevel?: number
}

interface LocationTreeProps {
  locations: Location[]
  locks: Lock[]
  selectedLocationId?: string
  selectedLockId?: string
  onLocationSelect?: (location: Location) => void
  onLockSelect?: (lock: Lock) => void
  searchQuery?: string
  showLockDetails?: boolean
}

interface TreeNode {
  type: 'address' | 'location' | 'lock'
  id: string
  name: string
  data: Address | Location | Lock
  children?: TreeNode[]
  expanded?: boolean
  parentId?: string
}

const LocationTree: React.FC<LocationTreeProps> = ({
  locations,
  locks,
  selectedLocationId,
  selectedLockId,
  onLocationSelect,
  onLockSelect,
  searchQuery = '',
  showLockDetails = true
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Build hierarchical tree structure
  const treeData = useMemo(() => {
    // Group locations by address
    const addressMap = new Map<string, Address>()
    const locationsByAddress = new Map<string, Location[]>()
    
    locations.forEach(location => {
      const addressId = location.address.id
      addressMap.set(addressId, location.address)
      
      if (!locationsByAddress.has(addressId)) {
        locationsByAddress.set(addressId, [])
      }
      locationsByAddress.get(addressId)!.push(location)
    })

    // Group locks by location
    const locksByLocation = new Map<string, Lock[]>()
    locks.forEach(lock => {
      if (!locksByLocation.has(lock.locationId)) {
        locksByLocation.set(lock.locationId, [])
      }
      locksByLocation.get(lock.locationId)!.push(lock)
    })

    // Build tree nodes
    const treeNodes: TreeNode[] = []

    addressMap.forEach((address, addressId) => {
      const addressLocations = locationsByAddress.get(addressId) || []
      
      const locationNodes: TreeNode[] = addressLocations.map(location => {
        const locationLocks = locksByLocation.get(location.id) || []
        
        const lockNodes: TreeNode[] = locationLocks.map(lock => ({
          type: 'lock',
          id: lock.id,
          name: lock.name,
          data: lock,
          parentId: location.id
        }))

        return {
          type: 'location',
          id: location.id,
          name: location.name,
          data: location,
          children: showLockDetails ? lockNodes : undefined,
          parentId: addressId,
          expanded: expandedNodes.has(location.id)
        }
      })

      const addressNode: TreeNode = {
        type: 'address',
        id: addressId,
        name: `${address.street} ${address.number}, ${address.city.name}`,
        data: address,
        children: locationNodes,
        expanded: expandedNodes.has(addressId)
      }

      treeNodes.push(addressNode)
    })

    return treeNodes
  }, [locations, locks, expandedNodes, showLockDetails])

  // Filter tree based on search query
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData

    const query = searchQuery.toLowerCase()
    
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(query)
      
      if (node.children) {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean) as TreeNode[]
        
        if (matchesSearch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
            expanded: true // Auto-expand when filtering
          }
        }
      } else if (matchesSearch) {
        return node
      }
      
      return null
    }

    return treeData
      .map(node => filterNode(node))
      .filter(Boolean) as TreeNode[]
  }, [treeData, searchQuery])

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

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'location' && onLocationSelect) {
      onLocationSelect(node.data as Location)
    } else if (node.type === 'lock' && onLockSelect) {
      onLockSelect(node.data as Lock)
    }
    
    // Also toggle expansion for nodes with children
    if (node.children && node.children.length > 0) {
      toggleNode(node.id)
    }
  }

  const getNodeIcon = (node: TreeNode) => {
    switch (node.type) {
      case 'address':
        return <BuildingOfficeIcon className="h-4 w-4 text-blue-500" />
      case 'location':
        return <MapPinIcon className="h-4 w-4 text-green-500" />
      case 'lock':
        return <LockClosedIcon className="h-4 w-4 text-purple-500" />
      default:
        return null
    }
  }

  const getNodeStats = (node: TreeNode) => {
    if (node.type === 'location') {
      const location = node.data as Location
      return (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {location._count?.locks !== undefined && (
            <div className="flex items-center gap-1">
              <LockClosedIcon className="h-3 w-3" />
              <span>{location._count.locks}</span>
            </div>
          )}
          {location._count?.users !== undefined && (
            <div className="flex items-center gap-1">
              <UserGroupIcon className="h-3 w-3" />
              <span>{location._count.users}</span>
            </div>
          )}
          {location._count?.keys !== undefined && (
            <div className="flex items-center gap-1">
              <KeyIcon className="h-3 w-3" />
              <span>{location._count.keys}</span>
            </div>
          )}
        </div>
      )
    } else if (node.type === 'lock') {
      const lock = node.data as Lock
      return (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${lock.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500">{lock.isOnline ? 'Online' : 'Offline'}</span>
          {lock.batteryLevel !== undefined && (
            <span className={`${lock.batteryLevel < 20 ? 'text-red-600' : 'text-gray-500'}`}>
              {lock.batteryLevel}%
            </span>
          )}
        </div>
      )
    }
    return null
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = 
      (node.type === 'location' && node.id === selectedLocationId) ||
      (node.type === 'lock' && node.id === selectedLockId)

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-50 border border-blue-200' 
              : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="h-3 w-3 text-gray-400" />
              ) : (
                <ChevronRightIcon className="h-3 w-3 text-gray-400" />
              )
            ) : null}
          </div>

          {/* Node Icon */}
          {getNodeIcon(node)}

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`truncate ${
                node.type === 'address' ? 'font-medium text-gray-900' :
                node.type === 'location' ? 'font-medium text-gray-800' :
                'text-gray-700'
              }`}>
                {node.name}
              </span>
            </div>
            
            {/* Node Stats */}
            <div className="mt-1">
              {getNodeStats(node)}
            </div>

            {/* Description for locations */}
            {node.type === 'location' && (node.data as Location).description && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {(node.data as Location).description}
              </div>
            )}
          </div>
        </div>

        {/* Child Nodes */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (filteredTreeData.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <div className="text-gray-600 font-medium">
          {searchQuery ? 'No locations match your search' : 'No locations found'}
        </div>
        <div className="text-gray-500 text-sm mt-1">
          {searchQuery 
            ? 'Try adjusting your search terms' 
            : 'Locations will appear here when they are created'
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {filteredTreeData.map(node => renderNode(node))}
    </div>
  )
}

export default LocationTree