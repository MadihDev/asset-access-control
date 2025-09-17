import { useEffect, useState } from 'react' 
import api from '../services/api'
import type { AxiosError } from 'axios'
import { useAuth } from '../hooks/useAuth'

interface LoginForm {
  username: string
  password: string
  cityId: string
}

const Login: React.FC = () => {
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginForm>({ username: '', password: '', cityId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/api/city')
        setCities(data.data || [])
      } catch {
        setCities([])
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Persist selected city for scoping
      localStorage.setItem('cityId', formData.cityId)
      // Delegate API call and token persistence to AuthContext
      await login(formData.username, formData.password, formData.cityId)
    } catch (err: unknown) {
      const allowDemo = import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true'
      if (allowDemo && formData.username === 'admin' && formData.password === 'password123') {
        localStorage.setItem('token', 'mock-token-123')
        if (formData.cityId) {
          localStorage.setItem('cityId', formData.cityId)
        } else if (cities[0]?.id) {
          localStorage.setItem('cityId', cities[0].id)
        }
        await login(formData.username, formData.password, formData.cityId || cities[0]?.id || '')
      } else {
        const axiosErr = err as AxiosError<{ error?: string; details?: Array<{ field?: string; message?: string }> }>
        const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5001'
        const validationDetails = axiosErr?.response?.data?.details?.map(d => d.message).filter(Boolean).join('; ')
        const message = validationDetails
          || axiosErr?.response?.data?.error
          || (!axiosErr.response ? `Cannot reach API at ${baseUrl}` : 'Login failed')
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

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
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

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
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Admin:</strong> username=admin, password=password123, city=Amsterdam</div>
              <div><strong>Manager:</strong> username=manager, password=password123, city=Rotterdam</div>
              <div><strong>Supervisor:</strong> username=supervisor, password=password123, city=The Hague</div>
              <div><strong>User 1:</strong> username=user1, password=password123, city=Utrecht</div>
              <div><strong>User 2:</strong> username=user2, password=password123, city=Eindhoven</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login