import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'

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

// Mock toast hook to avoid needing provider
vi.mock('../../hooks/useToast', () => {
  return {
    useToast: () => ({ success: () => {}, error: () => {} })
  }
})

describe('Dashboard navigation', () => {
  it('links location name to /location/:addressId with ?cityId when selected', async () => {
    render(
      <MemoryRouter>
        <Dashboard
          user={{ id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'manager' }}
        />
      </MemoryRouter>
    )

    const link = await waitFor(() => screen.getByRole('link', { name: 'HQ Building' }))
    expect(link).toBeInTheDocument()
    // In JSDOM, href is absolute; expect it to end with our path
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/location/addr-1?cityId=city-1')
  })
})
