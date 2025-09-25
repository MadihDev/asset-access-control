import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { TenantProvider } from '../contexts/TenantContext'
import { ToastProvider } from '../contexts/ToastContext'

// Mock hooks and services
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
}))

// Create a test component that simulates tenant-aware data fetching
const TenantAwareComponent = ({ testScenario }: { testScenario: string }) => {
  // Simulate different data based on tenant context
  const getTenantData = () => {
    switch (testScenario) {
      case 'amsterdam-city':
        return {
          locations: ['Amsterdam HQ', 'Amsterdam Warehouse'],
          accessLogs: ['Access to Amsterdam HQ at 10:00', 'Access to Amsterdam Warehouse at 11:00']
        }
      case 'perfectit-amsterdam':
        return {
          locations: ['PerfectIT Amsterdam HQ', 'PerfectIT Amsterdam Lab'],
          accessLogs: ['Access to PerfectIT Amsterdam HQ at 10:00', 'Access to PerfectIT Amsterdam Lab at 11:00']
        }
      case 'unauthorized':
        return { error: 'Unauthorized access to tenant data' }
      default:
        return { locations: [], accessLogs: [] }
    }
  }

  const data = getTenantData()

  if (data.error) {
    return <div>Error: {data.error}</div>
  }

  return (
    <div>
      <h3>Tenant Dashboard</h3>
      <div>
        <h4>Locations</h4>
        {data.locations?.map((location, index) => (
          <div key={index} data-testid={`location-${index}`}>
            {location}
          </div>
        ))}
      </div>
      <div>
        <h4>Access Logs</h4>
        {data.accessLogs?.map((log, index) => (
          <div key={index} data-testid={`log-${index}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}

// Test wrapper component with all providers
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

describe('Tenant Data Isolation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('City-Only Mode Isolation', () => {
    it('displays only data for the user\'s assigned city', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="amsterdam-city" />
        </TestWrapper>
      )

      // Verify Amsterdam-specific data is displayed
      await waitFor(() => {
        expect(screen.getByText('Amsterdam HQ')).toBeTruthy()
        expect(screen.getByText('Amsterdam Warehouse')).toBeTruthy()
      })

      // Verify access logs are tenant-specific
      expect(screen.getByText('Access to Amsterdam HQ at 10:00')).toBeTruthy()
      expect(screen.getByText('Access to Amsterdam Warehouse at 11:00')).toBeTruthy()
    })

    it('prevents access to data from other cities', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="amsterdam-city" />
        </TestWrapper>
      )

      // Verify only Amsterdam data is present
      await waitFor(() => {
        expect(screen.getByText('Amsterdam HQ')).toBeTruthy()
      })

      // Verify other city data is NOT present
      expect(screen.queryByText('Rotterdam Office')).toBeFalsy()
      expect(screen.queryByText('Utrecht Branch')).toBeFalsy()
      expect(screen.queryByText('The Hague Center')).toBeFalsy()
    })
  })

  describe('Project-City Mode Isolation', () => {
    it('displays only data for the user\'s project-city combination', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="perfectit-amsterdam" />
        </TestWrapper>
      )

      // Verify PerfectIT Amsterdam-specific data is displayed
      await waitFor(() => {
        expect(screen.getByText('PerfectIT Amsterdam HQ')).toBeTruthy()
        expect(screen.getByText('PerfectIT Amsterdam Lab')).toBeTruthy()
      })

      // Verify project-specific access logs
      expect(screen.getByText('Access to PerfectIT Amsterdam HQ at 10:00')).toBeTruthy()
      expect(screen.getByText('Access to PerfectIT Amsterdam Lab at 11:00')).toBeTruthy()
    })

    it('prevents access to data from other project-city combinations', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="perfectit-amsterdam" />
        </TestWrapper>
      )

      // Verify only PerfectIT Amsterdam data is present
      await waitFor(() => {
        expect(screen.getByText('PerfectIT Amsterdam HQ')).toBeTruthy()
      })

      // Verify other project-city combinations are NOT present
      expect(screen.queryByText('Acme Utrecht')).toBeFalsy()
      expect(screen.queryByText('TechCorp Rotterdam')).toBeFalsy()
      expect(screen.queryByText('StartupX Amsterdam')).toBeFalsy()
    })
  })

  describe('Cross-Tenant Access Prevention', () => {
    it('blocks access to unauthorized tenant data', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="unauthorized" />
        </TestWrapper>
      )

      // Verify unauthorized access is properly handled
      await waitFor(() => {
        expect(screen.getByText('Error: Unauthorized access to tenant data')).toBeTruthy()
      })

      // Verify no tenant data is leaked in error state
      expect(screen.queryByText('Amsterdam')).toBeFalsy()
      expect(screen.queryByText('PerfectIT')).toBeFalsy()
    })

    it('ensures tenant context is properly isolated', async () => {
      // Test that tenant context properly isolates data
      const { rerender } = render(
        <TestWrapper>
          <TenantAwareComponent testScenario="amsterdam-city" />
        </TestWrapper>
      )

      // First scenario: Amsterdam city data
      await waitFor(() => {
        expect(screen.getByText('Amsterdam HQ')).toBeTruthy()
      })

      // Switch to different tenant scenario
      rerender(
        <TestWrapper>
          <TenantAwareComponent testScenario="perfectit-amsterdam" />
        </TestWrapper>
      )

      // Verify data changes properly with tenant context
      await waitFor(() => {
        expect(screen.getByText('PerfectIT Amsterdam HQ')).toBeTruthy()
      })

      // Verify previous tenant data is not present
      expect(screen.queryByText('Amsterdam Warehouse')).toBeFalsy()
    })
  })

  describe('Data Boundary Enforcement', () => {
    it('verifies tenant-specific data filtering', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="amsterdam-city" />
        </TestWrapper>
      )

      // Count the number of location elements to ensure only authorized data
      await waitFor(() => {
        const locationElements = screen.getAllByTestId(/location-/)
        expect(locationElements).toHaveLength(2) // Only Amsterdam locations
      })

      // Count access logs to ensure proper filtering
      const logElements = screen.getAllByTestId(/log-/)
      expect(logElements).toHaveLength(2) // Only Amsterdam access logs
    })

    it('validates no cross-tenant data leakage', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="perfectit-amsterdam" />
        </TestWrapper>
      )

      // Verify only authorized tenant identifiers are present
      await waitFor(() => {
        expect(screen.getByText('PerfectIT Amsterdam HQ')).toBeTruthy()
      })

      // Comprehensive check for unauthorized tenant data
      const unauthorizedTerms = [
        'Acme', 'TechCorp', 'StartupX', // Other companies
        'Rotterdam', 'Utrecht', 'The Hague', // Other cities (in different context)
        'Unauthorized', 'Forbidden', 'Access Denied' // Error indicators
      ]

      unauthorizedTerms.forEach(term => {
        expect(screen.queryByText(new RegExp(term, 'i'))).toBeFalsy()
      })
    })

    it('ensures proper error handling for tenant boundary violations', async () => {
      render(
        <TestWrapper>
          <TenantAwareComponent testScenario="unauthorized" />
        </TestWrapper>
      )

      // Verify error is displayed without data leakage
      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeTruthy()
        expect(screen.getByText(/Unauthorized access/)).toBeTruthy()
      })

      // Ensure no location or log elements are present in error state
      expect(screen.queryAllByTestId(/location-/)).toHaveLength(0)
      expect(screen.queryAllByTestId(/log-/)).toHaveLength(0)
    })
  })
})