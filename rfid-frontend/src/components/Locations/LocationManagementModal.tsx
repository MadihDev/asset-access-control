import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'
import { useTenantScope } from '../../hooks/useTenantScope'

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
}

interface LocationManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  location?: Location | null // null for create, Location for edit
  availableAddresses: Address[]
}

const LocationManagementModal: React.FC<LocationManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  location,
  availableAddresses
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    addressId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { tenantParams } = useTenantScope()

  const isEditing = !!location

  // Initialize form data when location changes
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        description: location.description || '',
        addressId: location.addressId
      })
    } else {
      setFormData({
        name: '',
        description: '',
        addressId: availableAddresses[0]?.id || ''
      })
    }
    setError(null)
  }, [location, availableAddresses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Location name is required')
      }
      if (!formData.addressId) {
        throw new Error('Please select an address')
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        addressId: formData.addressId,
        ...tenantParams
      }

      if (isEditing) {
        // Update existing location
        await api.put(`/api/location/${location.id}`, payload)
      } else {
        // Create new location
        await api.post('/api/location', payload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Location operation error:', err)
      let errorMessage = 'Operation failed'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        errorMessage = axiosError.response?.data?.error || 'Operation failed'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {isEditing ? 'Edit Location' : 'Add New Location'}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {isEditing 
                    ? 'Update the location details below.' 
                    : 'Create a new location within an existing address.'
                  }
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 sm:p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <div className="text-sm font-medium">Error</div>
                  <div className="text-sm mt-1">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Location Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    placeholder="e.g., Server Room, Conference Room A, Main Office"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a descriptive name that identifies this specific area
                  </p>
                </div>

                {/* Address Selection */}
                <div>
                  <label htmlFor="addressId" className="block text-sm font-medium text-gray-700">
                    Address *
                  </label>
                  <select
                    id="addressId"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressId}
                    onChange={(e) => setFormData({ ...formData, addressId: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">Select an address</option>
                    {availableAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.street} {address.number}, {address.city.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the building/address where this location is situated
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Optional description of the location's purpose or contents"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Add any additional details about this location
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Location' : 'Create Location'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LocationManagementModal