import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import { useTenantScope } from '../../hooks/useTenantScope'
import { Modal } from '../ui/Modal'

interface CurrentUser {
  id: string
  role: string
  projectCityId?: string
  cityId?: string
}

interface CreateUserModalProps {
  onClose: () => void
  onSuccess: () => void
  currentUser: CurrentUser
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  username: string
  password: string
  role: string
  isActive: boolean
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  username?: string
  password?: string
  role?: string
  general?: string
}

const ROLE_OPTIONS = [
  { value: 'USER', label: 'User', description: 'Basic access to assigned locks' },
  { value: 'SUPERVISOR', label: 'Supervisor', description: 'Can monitor and access assigned locks' },
  { value: 'ADMIN', label: 'Admin', description: 'Full access to manage users and locks' }
] as const

export default function CreateUserModal({ onClose, onSuccess, currentUser }: CreateUserModalProps) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { tenantParams } = useTenantScope()
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'USER',
    isActive: true
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9]{3,20}$/
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (!usernameRegex.test(formData.username.trim())) {
      newErrors.username = 'Username must be 3-20 characters and contain only letters and numbers'
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: FormData) => {
      const payload = {
        ...userData,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.trim().toLowerCase(),
        username: userData.username.trim().toLowerCase(),
        ...tenantParams // Include tenant scoping
      }
      
      const response = await api.post('/api/user', payload)
      return response.data
    },
    onSuccess: () => {
      toastSuccess('User created successfully')
      onSuccess()
    },
    onError: (error: Error & { response?: { data?: { error?: string; errors?: Record<string, string> } } }) => {
      const errorData = error?.response?.data
      
      if (errorData?.errors) {
        // Handle field-specific validation errors from the server
        setErrors(errorData.errors)
      } else if (errorData?.error) {
        if (errorData.error.includes('email')) {
          setErrors({ email: 'This email address is already in use' })
        } else if (errorData.error.includes('username')) {
          setErrors({ username: 'This username is already taken' })
        } else {
          setErrors({ general: errorData.error })
        }
      } else {
        setErrors({ general: 'Failed to create user. Please try again.' })
        toastError('Failed to create user')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    
    try {
      await createUserMutation.mutateAsync(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const canCreateRole = (role: string) => {
    // Admins can create users and supervisors, but not other admins
    if (currentUser.role === 'ADMIN') {
      return ['USER', 'SUPERVISOR'].includes(role)
    }
    
    return false
  }

  const availableRoles = ROLE_OPTIONS.filter(option => canCreateRole(option.value))

  return (
    <Modal title="Create New User" onClose={onClose} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">{errors.general}</div>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter first name"
              disabled={isSubmitting}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter last name"
              disabled={isSubmitting}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="user@example.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.username ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="username"
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="Enter password"
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter a password for the user
          </p>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <div className="space-y-3">
            {availableRoles.map((roleOption) => (
              <label
                key={roleOption.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.role === roleOption.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={roleOption.value}
                  checked={formData.role === roleOption.value}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{roleOption.label}</div>
                  <div className="text-sm text-gray-600">{roleOption.description}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.role && (
            <p className="mt-1 text-xs text-red-600">{errors.role}</p>
          )}
        </div>

        {/* Status Toggle */}
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <div>
              <div className="font-medium text-gray-900">Active User</div>
              <div className="text-sm text-gray-600">
                User can log in and access assigned resources
              </div>
            </div>
          </label>
        </div>

        {/* City Assignment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-blue-800">
                City Assignment
              </div>
              <div className="text-sm text-blue-700 mt-1">
                This user will be automatically assigned to your current city and will only have access to resources within that city.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createUserMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            {(isSubmitting || createUserMutation.isPending) && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Create User
          </button>
        </div>
      </form>
    </Modal>
  )
}