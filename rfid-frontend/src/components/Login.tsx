import { useEffect, useMemo, useState } from 'react' 
import api from '../services/api'
import type { AxiosError } from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../contexts/TenantContext'
import type { LoginCredentials } from '../contexts/auth-context'

interface LoginForm {
  username: string
  password: string
  cityId: string
  project?: string
}

const Login: React.FC = () => {
  const { login } = useAuth()
  const { mode, projects, cities, selection, setSelection, refresh } = useTenant()
  const [formData, setFormData] = useState<LoginForm>({ username: '', password: '', cityId: '', project: selection.project })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [citiesFallback, setCitiesFallback] = useState<Array<{ id: string; name: string }>>([])
  const apiBaseUrl = useMemo(() => (api.defaults.baseURL as string | undefined) || (import.meta.env.VITE_API_URL as string | undefined) || window.location.origin, [])

  useEffect(() => {
    if (mode === 'project-city') {
      // Ensure we have latest projects/cities
      refresh().catch(() => void 0)
    } else {
      ;(async () => {
        try {
          const { data } = await api.get('/api/city')
          setCitiesFallback(data.data || [])
        } catch {
          setCitiesFallback([])
        }
      })()
    }
  }, [mode, refresh])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Pre-validation checks
      const validationErrors: string[] = []
      
      if (!formData.username.trim()) {
        validationErrors.push('Username is required')
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
        validationErrors.push('Username must contain only letters and numbers (no spaces, underscores, or special characters)')
      }
      
      if (!formData.password) {
        validationErrors.push('Password is required')
      } else if (formData.password.length < 6) {
        validationErrors.push('Password must be at least 6 characters long')
      }
      
      if (mode === 'project-city') {
        if (!formData.project && !selection.project) {
          validationErrors.push('Project selection is required')
        }
        if (!formData.cityId) {
          validationErrors.push('City selection is required')
        }
      } else {
        if (!formData.cityId) {
          validationErrors.push('City selection is required')
        }
      }
      
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed:\n\n${validationErrors.map(err => `• ${err}`).join('\n')}\n\n🔍 Debug Info:\nPlease check your input and ensure all required fields are filled correctly.`)
      }

      // Persist selected city for scoping
      localStorage.setItem('cityId', formData.cityId)
      
      // Prepare login credentials based on mode
      const credentials: LoginCredentials = {
        username: formData.username,
        password: formData.password
      }
      
      if (mode === 'project-city' && formData.project) {
        // New project-city mode
        const selectedProject = projects.find(p => (p.slug || p.id) === formData.project)
        const selectedCity = cities.find(c => c.id === formData.cityId)
        
        if (selectedProject && selectedCity) {
          credentials.projectId = selectedProject.slug || selectedProject.id // Use slug or ID, not name
          credentials.cityName = selectedCity.name
          credentials.cityId = formData.cityId // Also send cityId for validation
        } else {
          throw new Error('Invalid project or city selection')
        }
      } else {
        // Legacy city-only mode
        credentials.cityId = formData.cityId
      }
      
      // Delegate API call and token persistence to AuthContext
      await login(credentials)
    } catch (err: unknown) {
      console.error('Login Error Details:', err)
      
      const allowDemo = import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true'
      if (allowDemo && formData.username === 'admin' && formData.password === 'password123') {
        localStorage.setItem('token', 'mock-token-123')
        if (formData.cityId) {
          localStorage.setItem('cityId', formData.cityId)
        } else if (cities[0]?.id) {
          localStorage.setItem('cityId', cities[0].id)
        }
        const demoCredentials: LoginCredentials = {
          username: formData.username,
          password: formData.password,
          cityId: formData.cityId || cities[0]?.id || ''
        }
        await login(demoCredentials)
      } else {
        // Enhanced error handling with detailed debugging
        const axiosErr = err as AxiosError<{ 
          error?: string; 
          message?: string; 
          details?: Array<{ field?: string; message?: string }> 
        }>
        
        const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000'
        let errorMessage = 'Login failed'
        let debugInfo = ''
        
        if (axiosErr.response) {
          // Server responded with error status
          const status = axiosErr.response.status
          const data = axiosErr.response.data
          
          // Extract validation errors
          const validationErrors = data?.details?.map(d => d.message).filter(Boolean) || []
          const serverError = data?.error || data?.message
          
          switch (status) {
            case 400:
              if (validationErrors.length > 0) {
                errorMessage = `Validation Error: ${validationErrors.join('; ')}`
                debugInfo = `Check your input format. Username must be alphanumeric, password min 6 chars, city required.`
              } else {
                errorMessage = serverError || 'Bad request - check your input'
                debugInfo = 'Invalid request format or missing required fields'
              }
              break
            case 401:
              errorMessage = 'Invalid credentials'
              debugInfo = `Username "${formData.username}" or password incorrect. Check spelling and case sensitivity.`
              break
            case 403:
              errorMessage = 'Access forbidden'
              debugInfo = 'Account may be inactive or insufficient permissions'
              break
            case 404:
              errorMessage = 'Login endpoint not found'
              debugInfo = `API endpoint ${baseUrl}/api/auth/login not available`
              break
            case 500:
              errorMessage = 'Server error'
              debugInfo = 'Internal server error - check backend logs'
              break
            default:
              errorMessage = serverError || `HTTP ${status} error`
              debugInfo = `Unexpected server response: ${status}`
          }
          
          // Add submitted data to debug info
          debugInfo += `\n\nSubmitted data:\n• Username: "${formData.username}"\n• Project: "${formData.project || selection.project}"\n• City ID: "${formData.cityId}"\n• Mode: ${mode}`
          
        } else if (axiosErr.request) {
          // Request made but no response
          errorMessage = `Cannot connect to server at ${baseUrl}`
          debugInfo = `Network error - is the backend running on port 5000?\n\nTroubleshooting:\n• Check if backend server is running\n• Verify CORS settings\n• Check firewall/antivirus blocking\n• Try refreshing the page`
          
        } else {
          // Something else happened
          errorMessage = axiosErr.message || 'Unknown error occurred'
          debugInfo = `Error setting up request: ${axiosErr.message}`
        }
        
        // Combine error message with debug info
        const fullErrorMessage = `${errorMessage}\n\n🔍 Debug Info:\n${debugInfo}`
        
        console.error('Login Error Analysis:', {
          status: axiosErr.response?.status,
          data: axiosErr.response?.data,
          submittedCredentials: {
            username: formData.username,
            project: formData.project || selection.project,
            cityId: formData.cityId,
            mode: mode
          },
          availableProjects: projects.map(p => p.name),
          availableCities: cities.map(c => c.name),
          apiUrl: baseUrl
        })
        
        setError(fullErrorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Keep TenantContext selection in sync
    if (name === 'project') {
      setSelection({ project: value })
      setFormData({ ...formData, project: value, cityId: '' })
    } else if (name === 'cityId') {
      setSelection({ project: formData.project || selection.project, cityId: value })
      setFormData({ ...formData, cityId: value })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              RFID Access Control
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access the system
            </p>
          </div>

          {/* Tenant Mode Banner */}
          <div className="mb-4">
            {mode === 'project-city' ? (
              <div className="text-xs px-3 py-2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tenant mode: Project + City{(formData.project || selection.project) ? ` • Project: ${formData.project || selection.project}` : ''}
              </div>
            ) : (
              <div className="text-xs px-3 py-2 rounded-md bg-gray-50 text-gray-700 border border-gray-200">
                Tenant mode: City-only
              </div>
            )}
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="text-sm font-medium mb-2">Login Error</div>
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">{error}</pre>
                <div className="mt-2 text-xs text-red-600">
                  💡 Tip: Check browser console (F12) for more technical details
                </div>
              </div>
            )}

            {mode === 'project-city' ? (
              <>
                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    id="project"
                    name="project"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.project || selection.project || ''}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select a project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.slug || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cityId" className="block text-sm font-medium text-gray-700">City</label>
                  <select
                    id="cityId"
                    name="cityId"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.cityId}
                    onChange={handleChange}
                    disabled={!formData.project && !selection.project}
                  >
                    <option value="" disabled>Select a city</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Choose your project then city.</p>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="cityId" className="block text-sm font-medium text-gray-700">City</label>
                <select
                  id="cityId"
                  name="cityId"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.cityId}
                  onChange={handleChange}
                >
                  <option value="" disabled>Select a city</option>
                  {citiesFallback.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">City must match the user’s assigned city (e.g., admin → Amsterdam).</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username (not email)</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. admin, manager, user1"
                value={formData.username}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">Use your username (not email).</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
            {mode === 'project-city' ? (
              <div className="text-xs text-gray-600 space-y-2">
                <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                  <div className="font-semibold text-blue-800 mb-1">🇳🇱 PerfectIT Solutions</div>
                  <div><strong>Amsterdam Admin:</strong> username=amsterdamadmin, password=Password123!, project=perfectit-solutions, city=Amsterdam</div>
                  <div><strong>Rotterdam Admin:</strong> username=rotterdamadmin, password=Password123!, project=perfectit-solutions, city=Rotterdam</div>
                </div>
                <div className="bg-green-50 p-2 rounded border-l-2 border-green-400">
                  <div className="font-semibold text-green-800 mb-1">🏢 Acme Corporation</div>
                  <div><strong>Acme Admin:</strong> username=acmeadmin, password=password123, project=Acme Corporation, city=Amsterdam</div>
                  <div><strong>Acme User:</strong> username=acmeuser, password=password123, project=Acme Corporation, city=Utrecht</div>
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  ℹ️ All usernames are now alphanumeric-only (no underscores or special characters)
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 space-y-2">
                <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                  <div className="font-semibold text-blue-800 mb-1">🇳🇱 PerfectIT Solutions</div>
                  <div><strong>Amsterdam Admin:</strong> username=amsterdamadmin, password=Password123!, city=Amsterdam</div>
                  <div><strong>Rotterdam Admin:</strong> username=rotterdamadmin, password=Password123!, city=Rotterdam</div>
                </div>
                <div className="bg-green-50 p-2 rounded border-l-2 border-green-400">
                  <div className="font-semibold text-green-800 mb-1">🏢 Acme Corporation</div>
                  <div><strong>Acme Admin:</strong> username=acmeadmin, password=password123, city=Amsterdam</div>
                  <div><strong>Acme User:</strong> username=acmeuser, password=password123, city=Utrecht</div>
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  ℹ️ All usernames are now alphanumeric-only (no underscores or special characters)
                </div>
              </div>
            )}
          </div>

          {/* Env / API Info */}
          <div className="mt-4 text-[11px] text-gray-500 text-center">
            Using API: {apiBaseUrl}
          </div>
          
          {/* Debug Panel - Shows form state for troubleshooting */}
          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              🔧 Debug Info (Click to expand)
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div><strong>Mode:</strong> {mode}</div>
                <div><strong>Projects:</strong> {projects.length}</div>
                <div><strong>Cities:</strong> {cities.length}</div>
                <div><strong>Selected Project:</strong> {formData.project || selection.project || 'None'}</div>
                <div><strong>Selected City:</strong> {formData.cityId || 'None'}</div>
                <div><strong>Username:</strong> {formData.username || 'None'}</div>
              </div>
              {projects.length > 0 && (
                <div className="mt-2">
                  <strong>Available Projects:</strong> {projects.map(p => p.name).join(', ')}
                </div>
              )}
              {cities.length > 0 && (
                <div className="mt-1">
                  <strong>Available Cities:</strong> {cities.map(c => c.name).join(', ')}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                This panel helps identify form state issues. Clear browser cache if needed.
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default Login