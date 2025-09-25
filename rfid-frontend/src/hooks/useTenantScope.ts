import { useMemo } from 'react'
import { useTenant } from '../contexts/TenantContext'
import { useAuth } from './useAuth'

/**
 * Hook that provides tenant-aware API parameters for data fetching
 * Includes proper scoping based on current tenant mode and user context
 */
export const useTenantScope = () => {
  const { mode, selection } = useTenant()
  const { user } = useAuth()

  const tenantParams = useMemo(() => {
    const params: Record<string, string> = {}

    if (mode === 'project-city' && user?.projectCityId) {
      // New project-city mode: use projectCityId for scoping
      params.projectCityId = user.projectCityId
    } else if (selection.cityId) {
      // Legacy city-only mode: use cityId for scoping
      params.cityId = selection.cityId
    } else if (user?.cityId) {
      // Fallback to user's cityId if no selection
      params.cityId = user.cityId
    }

    return params
  }, [mode, selection.cityId, user?.projectCityId, user?.cityId])

  const selectedCityId = useMemo(() => {
    // For backward compatibility with existing components
    return selection.cityId || user?.cityId || null
  }, [selection.cityId, user?.cityId])

  const selectedProjectCityId = useMemo(() => {
    // Project-city scoping identifier
    return user?.projectCityId || null
  }, [user?.projectCityId])

  return {
    tenantParams,
    selectedCityId,
    selectedProjectCityId,
    mode,
    isProjectCityMode: mode === 'project-city'
  }
}

/**
 * Hook that provides tenant-aware query keys for React Query
 * Ensures proper cache invalidation when switching tenants
 */
export const useTenantQueryKey = (baseKey: string, additionalParams?: object) => {
  const { tenantParams } = useTenantScope()

  return useMemo(() => {
    return [baseKey, tenantParams, additionalParams].filter(Boolean)
  }, [baseKey, tenantParams, additionalParams])
}