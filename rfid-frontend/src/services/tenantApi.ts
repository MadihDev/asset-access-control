import api from './api'

export type Project = { id: string; name: string; slug: string; isActive: boolean }
export type City = { id: string; name: string; country: string; isActive: boolean }

// Simple in-memory cache to prevent repeated requests
const projectsCache = new Map<string, { data: Project[]; timestamp: number; expiry: number }>()
const citiesCache = new Map<string, { data: City[]; timestamp: number; expiry: number }>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const REQUEST_DEBOUNCE = 100 // 100ms debounce

// Debounce map to prevent rapid-fire requests
const projectsRequests = new Map<string, Promise<Project[]>>()
const citiesRequests = new Map<string, Promise<City[]>>()

export async function fetchProjects(): Promise<Project[]> {
  const cacheKey = 'projects'
  const now = Date.now()
  
  // Check cache first
  const cached = projectsCache.get(cacheKey)
  if (cached && now < cached.expiry) {
    return cached.data
  }
  
  // Check if there's already a pending request for this endpoint
  if (projectsRequests.has(cacheKey)) {
    return projectsRequests.get(cacheKey)!
  }
  
  // Create new request with debouncing
  const requestPromise = (async () => {
    try {
      const { data } = await api.get('/api/project')
      const result = data.data as Project[]
      
      // Cache the result
      projectsCache.set(cacheKey, {
        data: result,
        timestamp: now,
        expiry: now + CACHE_DURATION
      })
      
      return result
    } finally {
      // Remove from debounce map after request completes
      setTimeout(() => {
        projectsRequests.delete(cacheKey)
      }, REQUEST_DEBOUNCE)
    }
  })()
  
  projectsRequests.set(cacheKey, requestPromise)
  return requestPromise
}

export async function fetchCitiesByProject(project: string): Promise<City[]> {
  const cacheKey = `cities:${project}`
  const now = Date.now()
  
  // Check cache first
  const cached = citiesCache.get(cacheKey)
  if (cached && now < cached.expiry) {
    return cached.data
  }
  
  // Check if there's already a pending request for this endpoint
  if (citiesRequests.has(cacheKey)) {
    return citiesRequests.get(cacheKey)!
  }
  
  // Create new request with debouncing
  const requestPromise = (async () => {
    try {
      const { data } = await api.get(`/api/project/${project}/cities`)
      const result = data.data as City[]
      
      // Cache the result
      citiesCache.set(cacheKey, {
        data: result,
        timestamp: now,
        expiry: now + CACHE_DURATION
      })
      
      return result
    } finally {
      // Remove from debounce map after request completes
      setTimeout(() => {
        citiesRequests.delete(cacheKey)
      }, REQUEST_DEBOUNCE)
    }
  })()
  
  citiesRequests.set(cacheKey, requestPromise)
  return requestPromise
}

// Clear cache function for manual refresh
export function clearTenantCache(): void {
  projectsCache.clear()
  citiesCache.clear()
  projectsRequests.clear()
  citiesRequests.clear()
}
