import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchProjects, fetchCitiesByProject, clearTenantCache, type Project, type City } from '../services/tenantApi'

type TenantMode = 'city-only' | 'project-city'

type TenantSelection = {
  project?: string // slug or id
  cityId?: string
}

type TenantContextValue = {
  mode: TenantMode
  projects: Project[]
  cities: City[]
  selection: TenantSelection
  setSelection: (sel: TenantSelection) => void
  refresh: (forceClearCache?: boolean) => Promise<void>
}

const defaultValue: TenantContextValue = {
  mode: 'city-only',
  projects: [],
  cities: [],
  selection: {},
  setSelection: () => void 0,
  refresh: async () => void 0,
}

const STORAGE_KEY = 'tenant.selection'
const TenantContext = createContext<TenantContextValue>(defaultValue)

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode: TenantMode = (import.meta.env.VITE_TENANT_MODE || 'city-only') === 'project-city' ? 'project-city' : 'city-only'
  const [projects, setProjects] = useState<Project[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selection, setSelectionState] = useState<TenantSelection>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as TenantSelection) : {}
    } catch {
      return {}
    }
  })

  const setSelection = useCallback((sel: TenantSelection) => {
    setSelectionState(sel)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sel))
    } catch (e) {
      // ignore persist errors (private mode, storage full)
      console.warn('Tenant selection persist failed', e)
    }
  }, [])

  const refresh = useCallback(async (forceClearCache = false) => {
    if (mode !== 'project-city' || isRefreshing) return
    
    setIsRefreshing(true)
    
    if (forceClearCache) {
      clearTenantCache()
    }
    
    try {
      const projs = await fetchProjects()
      setProjects(projs)
      
      // Auto-select first project if none is selected
      const projKey = selection.project || projs[0]?.slug || projs[0]?.id
      
      if (projKey) {
        const cs = await fetchCitiesByProject(projKey)
        setCities(cs)
        
        // Auto-update selection if no project was previously selected
        if (!selection.project && projs.length > 0) {
          setSelection({ project: projs[0].slug || projs[0].id })
        }
        // If current city selection is not in the new list, clear it
        else if (selection.cityId && !cs.some((c) => c.id === selection.cityId)) {
          setSelection({ project: projKey })
        }
      } else {
        setCities([])
      }
    } catch (error) {
      // In test environment, suppress tenant refresh errors
      if (process.env.NODE_ENV !== 'test') {
        console.error('Tenant refresh failed', error)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [mode, selection.project, selection.cityId, setSelection, isRefreshing])

  useEffect(() => {
    refresh().catch((e) => console.warn('Tenant refresh failed', e))
  }, [refresh])

  const value = useMemo(
    () => ({ mode, projects, cities, selection, setSelection, refresh }),
    [mode, projects, cities, selection, setSelection, refresh]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => useContext(TenantContext)
