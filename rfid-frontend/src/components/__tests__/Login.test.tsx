import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from '../Login'
import { AuthProvider } from '../../contexts/AuthContext'
import { TenantProvider } from '../../contexts/TenantContext'
import { ToastProvider } from '../../contexts/ToastContext'

// Mock the auth hook
const mockLogin = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
    logout: vi.fn()
  })
}))

// Mock API module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({
      data: {
        data: [
          { id: 'city1', name: 'Amsterdam' },
          { id: 'city2', name: 'Rotterdam' },
          { id: 'city3', name: 'The Hague' },
          { id: 'city4', name: 'Utrecht' },
          { id: 'city5', name: 'Eindhoven' }
        ]
      }
    })),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:5000' }
  }
}))

// Mock tenant API
vi.mock('../../services/tenantApi', () => ({
  fetchProjects: vi.fn(() => Promise.resolve([
    { id: '1', name: 'PerfectIT Solutions', slug: 'perfectit', isActive: true },
    { id: '2', name: 'Acme Corporation', slug: 'acmecorp', isActive: true }
  ])),
  fetchCitiesByProject: vi.fn(() => Promise.resolve([
    { id: 'city1', name: 'Amsterdam', country: 'Netherlands', isActive: true },
    { id: 'city2', name: 'Rotterdam', country: 'Netherlands', isActive: true }
  ]))
}))

// Test wrapper component that provides all necessary contexts
const TestWrapper = ({ children, tenantMode = 'city-only' }: { children: React.ReactNode; tenantMode?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  // Mock environment variable
  vi.stubEnv('VITE_TENANT_MODE', tenantMode)
  vi.stubEnv('VITE_API_URL', 'http://localhost:5000')
  vi.stubEnv('VITE_ALLOW_DEMO_LOGIN', 'true')
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              {children}
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('City-Only Mode', () => {
    it('renders login form with city selector only', async () => {
      render(
        <TestWrapper tenantMode="city-only">
          <Login />
        </TestWrapper>
      )

      // Wait for cities to load
      await waitFor(() => {
        expect(screen.getByText('Amsterdam')).toBeDefined()
      })

      expect(screen.getByLabelText(/city/i)).toBeDefined()
      expect(screen.queryByLabelText(/project/i)).toBeNull()
      expect(screen.getByText('Tenant mode: City-only')).toBeDefined()
    })

    it('validates required fields in city-only mode', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper tenantMode="city-only">
          <Login />
        </TestWrapper>
      )

      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Form should prevent submission (HTML5 validation)
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('submits login with cityId in city-only mode', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({})

      render(
        <TestWrapper tenantMode="city-only">
          <Login />
        </TestWrapper>
      )

      // Wait for cities to load and be available
      await waitFor(() => {
        expect(screen.getByText('Amsterdam')).toBeDefined()
      })

      // Fill form
      await user.selectOptions(screen.getByLabelText(/city/i), 'city1')
      await user.type(screen.getByLabelText(/username/i), 'admin')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'admin',
          password: 'password123',
          cityId: 'city1'
        })
      })
    })
  })

  describe('Project-City Mode', () => {
    it('renders login form with project and city selectors', async () => {
      render(
        <TestWrapper tenantMode="project-city">
          <Login />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeDefined()
      })
      
      expect(screen.getByLabelText(/city/i)).toBeDefined()
      expect(screen.getByText('Tenant mode: Project + City')).toBeDefined()
    })

    it('disables city selector until project is selected', async () => {
      render(
        <TestWrapper tenantMode="project-city">
          <Login />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeDefined()
      })

      const citySelect = screen.getByLabelText(/city/i) as HTMLSelectElement
      expect(citySelect.disabled).toBe(true)
    })

    it('enables city selector after project selection', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper tenantMode="project-city">
          <Login />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeDefined()
        expect(screen.getByText('PerfectIT Solutions')).toBeDefined()
      })

      await user.selectOptions(screen.getByLabelText(/project/i), 'perfectit')

      await waitFor(() => {
        const citySelect = screen.getByLabelText(/city/i) as HTMLSelectElement
        expect(citySelect.disabled).toBe(false)
      })
    })

    it('submits login with project and city names in project-city mode', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValue({})

      render(
        <TestWrapper tenantMode="project-city">
          <Login />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/project/i)).toBeDefined()
        expect(screen.getByText('PerfectIT Solutions')).toBeDefined()
      })

      // Select project first
      await user.selectOptions(screen.getByLabelText(/project/i), 'perfectit')
      
      // Wait for cities to load
      await waitFor(() => {
        const citySelect = screen.getByLabelText(/city/i) as HTMLSelectElement
        expect(citySelect.disabled).toBe(false)
      })

      // Fill remaining form
      await user.selectOptions(screen.getByLabelText(/city/i), 'city1')
      await user.type(screen.getByLabelText(/username/i), 'perfectitadmin')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'perfectitadmin',
          password: 'password123',
          projectId: 'PerfectIT Solutions',
          cityName: 'Amsterdam',
          cityId: 'city1'
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('displays login error message', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } }
      })

      render(
        <TestWrapper tenantMode="city-only">
          <Login />
        </TestWrapper>
      )

      // Wait for cities to load
      await waitFor(() => {
        expect(screen.getByText('Amsterdam')).toBeDefined()
      })

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText(/city/i), 'city1')
      await user.type(screen.getByLabelText(/username/i), 'wronguser')
      await user.type(screen.getByLabelText(/password/i), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        // Look for the error text in the pre element or anywhere containing it
        expect(screen.getByText(/Invalid credentials/)).toBeDefined()
      })
    })

    it('shows loading state during login', async () => {
      const user = userEvent.setup()
      let resolveLogin: (value: unknown) => void
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve
      })
      mockLogin.mockReturnValue(loginPromise)

      render(
        <TestWrapper tenantMode="city-only">
          <Login />
        </TestWrapper>
      )

      // Wait for cities to load
      await waitFor(() => {
        expect(screen.getByText('Amsterdam')).toBeDefined()
      })

      // Fill and submit form
      await user.selectOptions(screen.getByLabelText(/city/i), 'city1')
      await user.type(screen.getByLabelText(/username/i), 'admin')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Check loading state
      expect(screen.getByText('Signing in...')).toBeDefined()
      const button = screen.getByRole('button', { name: /signing in/i }) as HTMLButtonElement
      expect(button.disabled).toBe(true)

      // Resolve the promise
      resolveLogin!({})
      await waitFor(() => {
        expect(screen.queryByText('Signing in...')).toBeNull()
      })
    })
  })

  describe('Demo Credentials', () => {
    it('shows appropriate demo credentials for city-only mode', async () => {
      await act(async () => {
        render(
          <TestWrapper tenantMode="city-only">
            <Login />
          </TestWrapper>
        )
      })

      expect(screen.getByText('Admin:', { exact: false })).toBeDefined()
      expect(screen.getByText(/username=admin/)).toBeDefined()
      expect(screen.getByText(/city=Amsterdam/)).toBeDefined()
      expect(screen.getByText('Manager:', { exact: false })).toBeDefined()
    })

    it('shows appropriate demo credentials for project-city mode', async () => {
      render(
        <TestWrapper tenantMode="project-city">
          <Login />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('PerfectIT Admin:', { exact: false })).toBeDefined()
        expect(screen.getByText(/username=perfectitadmin/)).toBeDefined()
        // Use getAllByText for multiple matches
        expect(screen.getAllByText(/project=PerfectIT Solutions/).length).toBeGreaterThan(0)
        expect(screen.getByText('Acme Admin:', { exact: false })).toBeDefined()
      })
    })
  })
})