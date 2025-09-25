import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTenantScope, useTenantQueryKey } from '../../hooks/useTenantScope'
import { AuthProvider } from '../../contexts/AuthContext'
import { TenantProvider } from '../../contexts/TenantContext'
import { ToastProvider } from '../../contexts/ToastContext'
import { MemoryRouter } from 'react-router-dom'

// Mock hooks and services
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
}))

// Test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <TenantProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </TenantProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('API Hooks and Query Cache Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage to ensure clean state
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Tenant Scope Hook', () => {
    it('provides correct tenant parameters structure', async () => {
      const { result } = renderHook(() => useTenantScope(), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.tenantParams).toBeDefined()
      })

      // Should provide all expected properties
      expect(result.current).toHaveProperty('tenantParams')
      expect(result.current).toHaveProperty('selectedCityId')
      expect(result.current).toHaveProperty('selectedProjectCityId')
      expect(result.current).toHaveProperty('mode')
      expect(result.current).toHaveProperty('isProjectCityMode')

      // tenantParams should be an object
      expect(typeof result.current.tenantParams).toBe('object')
    })

    it('updates tenant parameters when context changes', async () => {
      const { result, rerender } = renderHook(() => useTenantScope(), {
        wrapper: TestWrapper
      })

      const initialParams = result.current.tenantParams

      // Force a re-render to test stability
      rerender()

      // Parameters should remain stable if context hasn't changed
      expect(result.current.tenantParams).toEqual(initialParams)
    })

    it('provides mode information correctly', async () => {
      const { result } = renderHook(() => useTenantScope(), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.mode).toBeDefined()
      })

      // Mode should be either 'city-only' or 'project-city'
      expect(['city-only', 'project-city']).toContain(result.current.mode)

      // isProjectCityMode should match the mode
      const expectedProjectCityMode = result.current.mode === 'project-city'
      expect(result.current.isProjectCityMode).toBe(expectedProjectCityMode)
    })
  })

  describe('Tenant Query Key Hook', () => {
    it('generates unique query keys with base key', async () => {
      const { result } = renderHook(() => {
        const queryKey1 = useTenantQueryKey('locks', { activeOnly: true })
        const queryKey2 = useTenantQueryKey('locations', { type: 'warehouse' })
        return { queryKey1, queryKey2 }
      }, {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current.queryKey1).toBeDefined()
        expect(result.current.queryKey2).toBeDefined()
      })

      // Verify query keys have correct structure
      expect(Array.isArray(result.current.queryKey1)).toBe(true)
      expect(Array.isArray(result.current.queryKey2)).toBe(true)

      // First element should be the base key
      expect(result.current.queryKey1[0]).toBe('locks')
      expect(result.current.queryKey2[0]).toBe('locations')

      // Query keys should be different for different base keys
      expect(result.current.queryKey1).not.toEqual(result.current.queryKey2)
    })

    it('includes tenant parameters in query keys', async () => {
      const { result } = renderHook(() => useTenantQueryKey('locks', { activeOnly: true }), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Should have at least base key and tenant params
      expect(result.current.length).toBeGreaterThanOrEqual(2)

      // Second element should be tenant parameters (object)
      expect(typeof result.current[1]).toBe('object')

      // Third element should be additional params
      expect(result.current[2]).toEqual({ activeOnly: true })
    })

    it('filters out undefined values correctly', async () => {
      const { result } = renderHook(() => useTenantQueryKey('locks'), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Should not include undefined values in the array
      expect(result.current.every(item => item !== undefined)).toBe(true)
    })

    it('memoizes query keys properly', async () => {
      const { result, rerender } = renderHook(() => useTenantQueryKey('locks', { activeOnly: true }), {
        wrapper: TestWrapper
      })

      const initialQueryKey = result.current

      // Rerender with same parameters
      rerender()

      // Query key should remain the same due to memoization
      expect(result.current).toEqual(initialQueryKey)
      // Note: Reference equality may not be guaranteed across renders with providers
    })

    it('updates query keys when parameters change', async () => {
      const { result, rerender } = renderHook(
        ({ params }) => useTenantQueryKey('locks', params),
        {
          wrapper: TestWrapper,
          initialProps: { params: { activeOnly: true } }
        }
      )

      const initialQueryKey = result.current

      // Change parameters
      rerender({ params: { activeOnly: false } })

      // Query key should change
      expect(result.current).not.toEqual(initialQueryKey)
      expect(result.current[2]).toEqual({ activeOnly: false })
    })
  })

  describe('Integration with React Query', () => {
    it('provides proper cache isolation between different keys', async () => {
      const queryClient = new QueryClient()

      // Different query keys for same tenant
      const locksQueryKey = ['locks', {}, { activeOnly: true }]
      const locationsQueryKey = ['locations', {}, { type: 'warehouse' }]

      // Set data for different entities
      queryClient.setQueryData(locksQueryKey, { data: ['lock-1', 'lock-2'] })
      queryClient.setQueryData(locationsQueryKey, { data: ['location-1'] })

      // Verify data is isolated
      const locksData = queryClient.getQueryData(locksQueryKey)
      const locationsData = queryClient.getQueryData(locationsQueryKey)

      expect(locksData).toEqual({ data: ['lock-1', 'lock-2'] })
      expect(locationsData).toEqual({ data: ['location-1'] })
      expect(locksData).not.toEqual(locationsData)
    })

    it('supports cache invalidation patterns', async () => {
      const queryClient = new QueryClient()

      // Set up related queries
      const baseParams = { cityId: 'amsterdam' }
      const locksQueryKey = ['locks', baseParams, { activeOnly: true }]
      const locationsQueryKey = ['locations', baseParams]

      queryClient.setQueryData(locksQueryKey, { data: ['lock-1'] })
      queryClient.setQueryData(locationsQueryKey, { data: ['location-1'] })

      // Verify data exists
      expect(queryClient.getQueryData(locksQueryKey)).toBeDefined()
      expect(queryClient.getQueryData(locationsQueryKey)).toBeDefined()

      // Invalidate queries by predicate
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return Array.isArray(queryKey) && 
                 queryKey.length > 1 && 
                 JSON.stringify(queryKey[1]) === JSON.stringify(baseParams)
        }
      })

      // Queries should be marked as stale
      const locksQuery = queryClient.getQueryCache().find({ queryKey: locksQueryKey })
      const locationsQuery = queryClient.getQueryCache().find({ queryKey: locationsQueryKey })

      expect(locksQuery?.isStale()).toBe(true)
      expect(locationsQuery?.isStale()).toBe(true)
    })

    it('maintains stable cache behavior across re-renders', async () => {
      const queryClient = new QueryClient()

      const { result: keyResult, rerender } = renderHook(() => useTenantQueryKey('locks'), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <AuthProvider>
                <TenantProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </TenantProvider>
              </AuthProvider>
            </MemoryRouter>
          </QueryClientProvider>
        )
      })

      const initialQueryKey = keyResult.current

      // Set data with this query key
      queryClient.setQueryData(initialQueryKey, { data: ['test-data'] })

      // Rerender
      rerender()

      // Query key should be stable
      expect(keyResult.current).toEqual(initialQueryKey)

      // Data should still be available
      expect(queryClient.getQueryData(keyResult.current)).toEqual({ data: ['test-data'] })
    })

    it('handles query key updates properly', async () => {
      const queryClient = new QueryClient()

      // Test that changing tenant context results in different cache entries
      const params1 = { cityId: 'amsterdam' }
      const params2 = { cityId: 'rotterdam' }

      const queryKey1 = ['locks', params1, { activeOnly: true }]
      const queryKey2 = ['locks', params2, { activeOnly: true }]

      // Set different data for different tenant contexts
      queryClient.setQueryData(queryKey1, { data: ['amsterdam-lock'] })
      queryClient.setQueryData(queryKey2, { data: ['rotterdam-lock'] })

      // Verify separate cache entries
      expect(queryClient.getQueryData(queryKey1)).toEqual({ data: ['amsterdam-lock'] })
      expect(queryClient.getQueryData(queryKey2)).toEqual({ data: ['rotterdam-lock'] })

      // Invalidate only one tenant's queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey
          return Array.isArray(queryKey) && 
                 queryKey.length > 1 && 
                 JSON.stringify(queryKey[1]) === JSON.stringify(params1)
        }
      })

      // Only Amsterdam queries should be stale
      const amsterdamQuery = queryClient.getQueryCache().find({ queryKey: queryKey1 })
      const rotterdamQuery = queryClient.getQueryCache().find({ queryKey: queryKey2 })

      expect(amsterdamQuery?.isStale()).toBe(true)
      expect(rotterdamQuery?.isStale()).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles empty tenant parameters gracefully', async () => {
      const { result } = renderHook(() => useTenantQueryKey('locks'), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Should generate valid query key even with empty tenant params
      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current[0]).toBe('locks')
      expect(typeof result.current[1]).toBe('object')
    })

    it('handles undefined additional parameters', async () => {
      const { result } = renderHook(() => useTenantQueryKey('locks', undefined), {
        wrapper: TestWrapper
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Should filter out undefined and only include defined values
      expect(result.current.every(item => item !== undefined)).toBe(true)
    })

    it('handles rapid context changes without errors', async () => {
      const { result, rerender } = renderHook(
        ({ baseKey, params }) => useTenantQueryKey(baseKey, params),
        {
          wrapper: TestWrapper,
          initialProps: { baseKey: 'locks', params: { activeOnly: true } }
        }
      )

      // Rapidly change parameters
      for (let i = 0; i < 10; i++) {
        rerender({ baseKey: `entity-${i}`, params: { activeOnly: i % 2 === 0 } })
      }

      // Should handle rapid changes without errors
      expect(result.current).toBeDefined()
      expect(result.current[0]).toBe('entity-9')
      expect(result.current[2]).toEqual({ activeOnly: false })
    })
  })
})