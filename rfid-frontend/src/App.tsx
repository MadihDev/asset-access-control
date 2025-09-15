import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Navigation from './components/Navigation'
import UserManagement from './components/UserManagement'
import AccessLogs from './components/AccessLogs'
import AuditLogs from './components/AuditLogs'
import Settings from './components/Settings'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROLES } from './utils/rbac'

function App() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // no-op here; AuthProvider handles initial load
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RFID Access Control System...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
  <Navigation user={user} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <UserManagement user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/access-logs"
              element={
                <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <AccessLogs user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                  <Settings user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
