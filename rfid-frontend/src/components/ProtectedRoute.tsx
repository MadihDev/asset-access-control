import React, { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasAnyRole, type Role } from '../utils/rbac'
import { useToast } from '../hooks/useToast'

export const ProtectedRoute: React.FC<{ roles?: Role[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, loading } = useAuth()
  const { error } = useToast()
  const notifiedRef = useRef(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Fallback, usually App shows Login when !user
    return <Navigate to="/" replace />
  }

  if (roles && roles.length > 0 && !hasAnyRole(user, roles)) {
    if (!notifiedRef.current) {
      notifiedRef.current = true
      // defer toast to effect to avoid side-effects during render
      setTimeout(() => error("You don't have access to that page"), 0)
    }
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
