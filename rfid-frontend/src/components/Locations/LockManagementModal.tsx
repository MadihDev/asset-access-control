import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope } from '../../hooks/useTenantScope'
import { Modal } from '../ui/Modal'
import type { AxiosError } from 'axios'

interface Lock {
  id: string
  name: string
  description?: string
  deviceId: string
  lockType: 'DOOR' | 'GATE' | 'CABINET' | 'ROOM'
  isActive: boolean
  isOnline?: boolean
  locationId: string
  location?: {
    id: string
    name: string
    address: {
      street: string
      number: string
      city: { name: string }
    }
  }
}

interface Location {
  id: string
  name: string
  description?: string
  addressId: string
  address: {
    id: string
    street: string
    number: string
    zipCode: string
    city: {
      id: string
      name: string
    }
  }
}

interface LockManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lock?: Lock | null
  currentLocationId?: string
  availableLocations: Location[]
}

const lockTypes = [
  { value: 'DOOR', label: 'Door' },
  { value: 'GATE', label: 'Gate' },
  { value: 'CABINET', label: 'Cabinet' },
  { value: 'ROOM', label: 'Room' }
] as const

export default function LockManagementModal({
  isOpen,
  onClose,
  onSuccess,
  lock,
  currentLocationId,
  availableLocations
}: LockManagementModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<{
    name: string
    description: string
    deviceId: string
    lockType: 'DOOR' | 'GATE' | 'CABINET' | 'ROOM'
    locationId: string
    isActive: boolean
  }>({
    name: '',
    description: '',
    deviceId: '',
    lockType: 'DOOR',
    locationId: currentLocationId || '',
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or lock changes
  useEffect(() => {
    if (isOpen) {
      if (lock) {
        // Edit mode
        setFormData({
          name: lock.name,
          description: lock.description || '',
          deviceId: lock.deviceId || '',
          lockType: lock.lockType || 'DOOR',
          locationId: lock.locationId || '',
          isActive: lock.isActive || false
        })
      } else {
        // Add mode
        setFormData({
          name: '',
          description: '',
          deviceId: '',
          lockType: 'DOOR',
          locationId: currentLocationId || '',
          isActive: true
        })
      }
      setErrors({})
    }
  }, [isOpen, lock, currentLocationId])

  // Create/Update lock mutation
  const saveLockMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (lock) {
        // Update existing lock
        const response = await api.put(`/api/lock/${lock.id}`, data, { params: tenantParams })
        return response.data
      } else {
        // Create new lock
        const response = await api.post('/api/lock', data, { params: tenantParams })
        return response.data
      }
    },
    onSuccess: () => {
      toastSuccess(lock ? 'Lock updated successfully' : 'Lock created successfully')
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['locks'] })
      queryClient.invalidateQueries({ queryKey: ['location-locks'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string, details?: Record<string, string> }>
      const message = axiosError.response?.data?.error || `Failed to ${lock ? 'update' : 'create'} lock`
      
      // Handle validation errors
      if (axiosError.response?.data?.details) {
        setErrors(axiosError.response.data.details)
      } else {
        toastError(message)
      }
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Lock name is required'
    }
    
    if (!formData.deviceId.trim()) {
      newErrors.deviceId = 'Device ID is required'
    }
    
    if (!formData.locationId) {
      newErrors.locationId = 'Location is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    saveLockMutation.mutate(formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedLocation = availableLocations.find(loc => loc.id === formData.locationId)

  if (!isOpen) return null

  return (
    <Modal
      title={lock ? 'Edit Lock' : 'Add New Lock'}
      onClose={onClose}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lock Details */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Lock Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Main Entrance Door"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description of the lock"
            />
          </div>

          <div>
            <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-1">
              Device ID *
            </label>
            <input
              type="text"
              id="deviceId"
              value={formData.deviceId}
              onChange={(e) => handleInputChange('deviceId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.deviceId ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., LOCK-001"
            />
            {errors.deviceId && (
              <p className="mt-1 text-sm text-red-600">{errors.deviceId}</p>
            )}
          </div>

          <div>
            <label htmlFor="lockType" className="block text-sm font-medium text-gray-700 mb-1">
              Lock Type
            </label>
            <select
              id="lockType"
              value={formData.lockType}
              onChange={(e) => handleInputChange('lockType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {lockTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Selection */}
        <div>
          <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <select
            id="locationId"
            value={formData.locationId}
            onChange={(e) => handleInputChange('locationId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.locationId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select a location</option>
            {availableLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} - {location.address.street} {location.address.number}
              </option>
            ))}
          </select>
          {errors.locationId && (
            <p className="mt-1 text-sm text-red-600">{errors.locationId}</p>
          )}
          
          {selectedLocation && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-900">
                <strong>{selectedLocation.name}</strong>
              </div>
              <div className="text-xs text-blue-700">
                {selectedLocation.address.street} {selectedLocation.address.number}, {selectedLocation.address.city.name}
              </div>
              {selectedLocation.description && (
                <div className="text-xs text-blue-600 mt-1">
                  {selectedLocation.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
            Active (lock is operational and can grant access)
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveLockMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveLockMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {lock ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              lock ? 'Update Lock' : 'Create Lock'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}