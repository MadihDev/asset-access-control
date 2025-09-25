import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'
import { AuthProvider } from '../../contexts/AuthContext'
import { TenantProvider } from '../../contexts/TenantContext'

// Mock API client used by Dashboard
vi.mock('../../services/api', () => {
  return {
    default: {
      get: vi.fn((path: string) => {
        if (path === '/api/dashboard') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                totalUsers: 1,
                totalLocks: 1,
                totalAccessAttempts: 0,
                successfulAccess: 0,
                onlineLocks: 0,
                recentAccessLogs: [],
                locations: [
                  {
                    addressId: 'addr-1',
                    name: 'HQ Building',
                    cityId: 'city-1',
                    totalLocks: 2,
                    activeLocks: 1,
                    activeUsers: 5,
                    activeKeys: 3,
                    totalAttempts: 10,
                    successfulAttempts: 8,
                    successRate: 80,
                  },
                ],
              },
            },
          })
        }
        return Promise.resolve({ data: { success: true, data: {} } })
      }),
      post: vi.fn(),
    },
  }
})

// Mock City context to provide a selectedCityId
vi.mock('../../contexts/CityContext', () => {
  return {
    useCity: () => ({
      cities: [],
      loading: false,
      selectedCityId: 'city-1',
      setSelectedCityId: () => {},
      refresh: async () => {},
    }),
  }
})

// Mock tenant scope hook
vi.mock('../../hooks/useTenantScope', () => {
  return {
    useTenantScope: () => ({
      tenantParams: { cityId: 'city-1' },
      selectedCityId: 'city-1',
      scopedQuery: (key: string[]) => [...key, 'city-1'],
    }),
  }
})

// Mock toast hook to avoid needing provider
vi.mock('../../hooks/useToast', () => {
  return {
    useToast: () => ({ success: () => {}, error: () => {} })
  }
})

describe('Dashboard navigation', () => {
  it('displays location name as text in the locations table', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TenantProvider>
            <Dashboard
              user={{ id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'manager' }}
            />
          </TenantProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const locationText = await waitFor(() => screen.getByText('HQ Building'))
    expect(locationText).toBeTruthy()
    // Location name should be displayed as text, not as a link
    expect(locationText.tagName.toLowerCase()).not.toBe('a')
  })
})
