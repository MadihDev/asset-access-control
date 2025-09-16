import axios from 'axios'

const envBaseUrl = import.meta.env.VITE_API_URL as string | undefined
if (!envBaseUrl) {
  // Helpful hint in dev when env is missing
  console.warn('VITE_API_URL is not set; defaulting to http://localhost:5001')
}
const baseURL = envBaseUrl || 'http://localhost:5001'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

// Global 401 handler: clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      // Hard redirect to root (login)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)
