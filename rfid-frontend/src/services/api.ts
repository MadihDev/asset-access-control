import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios'

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

function setAuthHeader(config: InternalAxiosRequestConfig, token: string) {
  let headers = config.headers
  if (!headers) {
    headers = new AxiosHeaders()
    config.headers = headers
  }
  const h = headers as unknown as { set?: (name: string, value: string) => void } & Record<string, string>
  if (typeof h.set === 'function') h.set('Authorization', `Bearer ${token}`)
  else h.Authorization = `Bearer ${token}`
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) setAuthHeader(config, token)
  return config
})

export default api

// Refresh token single-flight mechanism
let isRefreshing = false
let refreshPromise: Promise<void> | null = null
const subscribers: Array<(token: string) => void> = []

function onRefreshed(newToken: string) {
  subscribers.forEach((cb) => cb(newToken))
  subscribers.length = 0
}

function subscribeTokenRefresh(cb: (token: string) => void) {
  subscribers.push(cb)
}

async function performRefresh() {
  const existing = localStorage.getItem('refreshToken')
  if (!existing) throw new Error('No refresh token')
  const { data } = await api.post('/api/auth/refresh-token', { refreshToken: existing })
  const newAccess: string = data.data.accessToken
  const newRefresh: string = data.data.refreshToken
  localStorage.setItem('token', newAccess)
  localStorage.setItem('refreshToken', newRefresh)
  return newAccess
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = performRefresh()
          .then((newAccess) => {
            onRefreshed(newAccess)
          })
          .catch(() => {
            // Refresh failed → clear and redirect
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            if (typeof window !== 'undefined') window.location.href = '/'
            throw error
          })
          .finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
      }

      // Wait for refresh to complete, then retry
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          setAuthHeader(originalRequest, newToken)
          resolve(api(originalRequest))
        })

        // If a refresh is already in progress, just await it
        if (refreshPromise) {
          refreshPromise.catch(reject)
        }
      })
    }

    return Promise.reject(error)
  }
)
