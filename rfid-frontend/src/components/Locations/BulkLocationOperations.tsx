import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope } from '../../hooks/useTenantScope'
import { Modal } from '../ui/Modal'
import type { AxiosError } from 'axios'

interface Location {
  id: string
  name: string
  description?: string
  address: {
    street: string
    number: string
    city: { name: string }
  }
}

interface BulkLocationOperationsProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  selectedLocations: Location[]
}

type BulkOperation = 'activate' | 'deactivate' | 'delete' | 'export'

export default function BulkLocationOperations({
  isOpen,
  onClose,
  onSuccess,
  selectedLocations
}: BulkLocationOperationsProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  const queryClient = useQueryClient()

  const [selectedOperation, setSelectedOperation] = useState<BulkOperation>('activate')
  const [isConfirming, setIsConfirming] = useState(false)

  const operations = [
    { 
      value: 'activate' as const, 
      label: 'Activate Locations', 
      description: 'Enable all selected locations',
      icon: (
        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      dangerous: false
    },
    { 
      value: 'deactivate' as const, 
      label: 'Deactivate Locations', 
      description: 'Disable all selected locations and their locks',
      icon: (
        <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      dangerous: false
    },
    { 
      value: 'delete' as const, 
      label: 'Delete Locations', 
      description: 'Permanently remove all selected locations and their locks',
      icon: (
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      dangerous: true
    },
    { 
      value: 'export' as const, 
      label: 'Export Location Data', 
      description: 'Download CSV with location and lock information',
      icon: (
        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      dangerous: false
    }
  ]

  const selectedOperationData = operations.find(op => op.value === selectedOperation)

  const bulkOperationMutation = useMutation({
    mutationFn: async (operation: BulkOperation) => {
      const locationIds = selectedLocations.map(loc => loc.id)
      
      switch (operation) {
        case 'activate':
        case 'deactivate': {
          const response = await api.patch('/api/location/bulk', {
            locationIds,
            isActive: operation === 'activate'
          }, { params: tenantParams })
          return response.data
        }
          
        case 'delete': {
          const deleteResponse = await api.delete('/api/location/bulk', {
            data: { locationIds },
            params: tenantParams
          })
          return deleteResponse.data
        }
          
        case 'export': {
          const exportResponse = await api.get('/api/location/export', {
            params: { ...tenantParams, locationIds: locationIds.join(',') },
            responseType: 'blob'
          })
          
          // Create download link
          const url = window.URL.createObjectURL(new Blob([exportResponse.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `locations-${new Date().toISOString().split('T')[0]}.csv`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          
          return { message: 'Export completed' }
        }
          
        default:
          throw new Error('Unknown operation')
      }
    },
    onSuccess: (_data, operation) => {
      const operationLabels = {
        activate: 'activated',
        deactivate: 'deactivated', 
        delete: 'deleted',
        export: 'exported'
      }
      
      toastSuccess(`Successfully ${operationLabels[operation]} ${selectedLocations.length} location(s)`)
      
      if (operation !== 'export') {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['locations'] })
        queryClient.invalidateQueries({ queryKey: ['location-locks'] })
      }
      
      onSuccess()
      handleClose()
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>
      const message = axiosError.response?.data?.error || `Failed to ${selectedOperation} locations`
      toastError(message)
    }
  })

  const handleClose = () => {
    setIsConfirming(false)
    setSelectedOperation('activate')
    onClose()
  }

  const handleExecute = () => {
    if (!isConfirming && selectedOperationData?.dangerous) {
      setIsConfirming(true)
      return
    }
    
    bulkOperationMutation.mutate(selectedOperation)
  }

  const handleCancel = () => {
    if (isConfirming) {
      setIsConfirming(false)
    } else {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      title={`Bulk Operations - ${selectedLocations.length} Location(s)`}
      onClose={handleClose}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Selected Locations Preview */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Locations:</h4>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
            {selectedLocations.map((location) => (
              <div key={location.id} className="px-3 py-2 border-b border-gray-100 last:border-b-0">
                <div className="font-medium text-sm text-gray-900">{location.name}</div>
                <div className="text-xs text-gray-500">
                  {location.address.street} {location.address.number}, {location.address.city.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operation Selection */}
        {!isConfirming ? (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Select Operation:</h4>
            <div className="space-y-2">
              {operations.map((operation) => (
                <label key={operation.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="operation"
                    value={operation.value}
                    checked={selectedOperation === operation.value}
                    onChange={(e) => setSelectedOperation(e.target.value as BulkOperation)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {operation.icon}
                      <span className={`font-medium text-sm ${
                        operation.dangerous ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {operation.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{operation.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          /* Confirmation Step */
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="text-lg font-medium text-red-900">Confirm Dangerous Operation</h4>
            </div>
            <p className="text-red-800 mb-4">
              You are about to <strong>{selectedOperationData?.label.toLowerCase()}</strong> {selectedLocations.length} location(s).
              {selectedOperation === 'delete' && ' This action cannot be undone and will also remove all associated locks and permissions.'}
            </p>
            <div className="bg-white border border-red-200 rounded p-3">
              <div className="text-sm text-red-900 font-medium mb-2">Locations to be affected:</div>
              <ul className="text-sm text-red-800 space-y-1">
                {selectedLocations.slice(0, 5).map((location) => (
                  <li key={location.id}>• {location.name}</li>
                ))}
                {selectedLocations.length > 5 && (
                  <li className="text-red-600">• ... and {selectedLocations.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {isConfirming ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={handleExecute}
            disabled={bulkOperationMutation.isPending}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              selectedOperationData?.dangerous 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {bulkOperationMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              isConfirming ? 'Confirm & Execute' : 'Execute Operation'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}