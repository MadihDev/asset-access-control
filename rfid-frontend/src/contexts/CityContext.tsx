import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

export type City = { id: string; name: string }

type CityContextValue = {
  cities: City[]
  loading: boolean
  selectedCityId: string | null
  setSelectedCityId: (id: string | null) => void
  refresh: () => Promise<void>
}

const CityContext = createContext<CityContextValue | undefined>(undefined)

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedCityId, setSelectedCityIdState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('cityId') : null
  )

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/city')
      setCities(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setSelectedCityId = useCallback((id: string | null) => {
    setSelectedCityIdState(id)
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('cityId', id)
      } else {
        localStorage.removeItem('cityId')
      }
      // Clear cached lockId when switching cities to avoid cross-city errors
      localStorage.removeItem('lastLockId')
      // Inform listeners about city change (components can react accordingly)
      const detail: { cityId?: string } = { cityId: id || undefined }
      window.dispatchEvent(new CustomEvent('city:changed', { detail }))
    }
  }, [])

  const value = useMemo<CityContextValue>(() => ({ cities, loading, selectedCityId, setSelectedCityId, refresh }), [cities, loading, selectedCityId, setSelectedCityId, refresh])

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCity(): CityContextValue {
  const ctx = useContext(CityContext)
  if (!ctx) throw new Error('useCity must be used within CityProvider')
  return ctx
}
