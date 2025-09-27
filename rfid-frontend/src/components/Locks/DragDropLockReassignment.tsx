import { useState, useCallback } from 'react'
import { 
  LockClosedIcon, 
  MapPinIcon, 
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

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
  locks?: Lock[]
}

interface Lock {
  id: string
  name: string
  serialNumber?: string
  status: 'active' | 'inactive' | 'maintenance'
  location?: Location
  locationId?: string
}

// Draggable Lock Component
interface DraggableLockProps {
  lock: Lock
  onLockClick?: (lock: Lock) => void
  className?: string
}

function DraggableLock({ lock, onLockClick, className = '' }: DraggableLockProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'lock',
      lockId: lock.id,
      sourceLocationId: lock.locationId
    }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onLockClick?.(lock)}
      className={`
        group flex items-center p-3 border rounded-lg cursor-move transition-all
        ${getStatusColor(lock.status)}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
        ${className}
      `}
    >
      <LockClosedIcon className="h-5 w-5 mr-3 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{lock.name}</div>
        {lock.serialNumber && (
          <div className="text-sm opacity-75 truncate">
            SN: {lock.serialNumber}
          </div>
        )}
      </div>
      <div className="ml-2 text-xs capitalize px-2 py-1 rounded-full border">
        {lock.status}
      </div>
    </div>
  )
}

// Drop Zone Location Component
interface DropZoneLocationProps {
  location: Location
  onLockDrop: (lockId: string, targetLocationId: string) => void
  expanded?: boolean
  onToggleExpanded?: () => void
  className?: string
}

function DropZoneLocation({
  location,
  onLockDrop,
  expanded = false,
  onToggleExpanded,
  className = ''
}: DropZoneLocationProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'lock' && data.sourceLocationId !== location.id) {
        onLockDrop(data.lockId, location.id)
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error)
    }
  }

  const hasLocks = location.locks && location.locks.length > 0

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-4 transition-all
          ${isOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        {/* Location Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center flex-1 min-w-0">
            <MapPinIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">
                {location.name}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {location.address.street} {location.address.number}
              </div>
            </div>
          </div>
          
          {hasLocks && (
            <button
              onClick={onToggleExpanded}
              className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              {expanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="text-center py-4 text-blue-600 font-medium">
            Drop lock here to reassign
          </div>
        )}

        {/* Locks List */}
        {hasLocks && expanded && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
            {location.locks!.map(lock => (
              <DraggableLock
                key={lock.id}
                lock={lock}
                className="bg-white"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!hasLocks && (
          <div className="text-center py-4 text-gray-500">
            No locks assigned
          </div>
        )}
      </div>
    </div>
  )
}

// Unassign Drop Zone Component
function UnassignDropZone() {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'lock') {
        console.log('Unassigning lock:', data.lockId)
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isOver 
          ? 'border-red-400 bg-red-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
      <span className="mt-2 block text-sm font-medium text-gray-900">
        {isOver ? 'Drop to unassign' : 'Drop locks here to unassign them'}
      </span>
      <span className="mt-1 block text-sm text-gray-500">
        Locks dropped here will be removed from their current location
      </span>
    </div>
  )
}

// Main Drag and Drop Interface
interface DragDropLockReassignmentProps {
  locations: Location[]
  unassignedLocks?: Lock[]
  onLockReassign: (lockId: string, newLocationId: string | null) => Promise<void>
  onLockClick?: (lock: Lock) => void
  loading?: boolean
  className?: string
}

export default function DragDropLockReassignment({
  locations,
  unassignedLocks = [],
  onLockReassign,
  onLockClick,
  loading = false,
  className = ''
}: DragDropLockReassignmentProps) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [reassigning, setReassigning] = useState<string | null>(null)

  const toggleLocationExpanded = (locationId: string) => {
    const newExpanded = new Set(expandedLocations)
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId)
    } else {
      newExpanded.add(locationId)
    }
    setExpandedLocations(newExpanded)
  }

  const handleLockDrop = useCallback(async (lockId: string, targetLocationId: string) => {
    if (reassigning) return
    
    setReassigning(lockId)
    try {
      await onLockReassign(lockId, targetLocationId)
    } catch (error) {
      console.error('Failed to reassign lock:', error)
    } finally {
      setReassigning(null)
    }
  }, [onLockReassign, reassigning])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading locations and locks...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ArrowPathIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Drag and Drop Lock Reassignment
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Drag locks from one location to another to reassign them. 
                You can also drop locks in the "Unassigned" area to remove their location assignment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Locks */}
      {unassignedLocks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-400" />
            Unassigned Locks ({unassignedLocks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unassignedLocks.map(lock => (
              <DraggableLock
                key={lock.id}
                lock={lock}
                onLockClick={onLockClick}
                className={reassigning === lock.id ? 'opacity-50' : ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locations */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
          Locations ({locations.length})
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {locations.map(location => (
            <DropZoneLocation
              key={location.id}
              location={location}
              onLockDrop={handleLockDrop}
              expanded={expandedLocations.has(location.id)}
              onToggleExpanded={() => toggleLocationExpanded(location.id)}
            />
          ))}
        </div>
      </div>

      {/* Unassign Drop Zone */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-400" />
          Unassign Area
        </h3>
        <UnassignDropZone />
      </div>
    </div>
  )
}