import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthUser } from '../../contexts/auth-context'

// Mock the API service
const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../../services/api', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    defaults: { baseURL: 'http://localhost:5000' }
  }
}))

// Import components after mocking
const { AuthProvider } = await import('../../contexts/AuthContext')
const { useAuth } = await import('../../hooks/useAuth')

// Test component that uses the AuthContext
const AuthTestComponent = () => {
  const { user, loading, login, logout } = useAuth()
  
  const handleLogin = async (credentials: { username: string; password: string; cityId?: string; projectId?: string; cityName?: string }) => {
    try {
      await login(credentials)
    } catch (error) {
      // Silently handle login errors in test
      console.log('Login failed as expected:', error)
    }
  }
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user-id">{user?.id || 'none'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="user-role">{user?.role || 'none'}</div>
      <div data-testid="user-city">{user?.cityId || 'none'}</div>
      <div data-testid="user-project-city">{user?.projectCityId || 'none'}</div>
      
      {/* Control buttons for testing */}
      <button 
        onClick={() => handleLogin({
          username: 'test-user',
          password: 'test-password',
          cityId: 'test-city'
        })}
        data-testid="login-city-only"
      >
        Login City Only
      </button>
      <button 
        onClick={() => handleLogin({
          username: 'test-user',
          password: 'test-password',
          projectId: 'test-project',
          cityName: 'test-city-name'
        })}
        data-testid="login-project-city"
      >
        Login Project City
      </button>
      <button 
        onClick={logout}
        data-testid="logout"
      >
        Logout
      </button>
    </div>
  )
}

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <AuthTestComponent />
    </AuthProvider>
  )
}

describe('Authentication Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial Load', () => {
    it('starts in loading state when token exists', async () => {
      localStorage.setItem('token', 'some-token')
      
      // Mock a delayed response to catch loading state
      let resolveApiCall: (value: { data: { data: AuthUser } }) => void
      const apiPromise = new Promise(resolve => {
        resolveApiCall = resolve
      })
      mockGet.mockReturnValue(apiPromise)
      
      renderWithAuthProvider()
      
      // Should be loading initially
      expect(screen.getByTestId('loading').textContent).toBe('loading')
      expect(screen.getByTestId('user-id').textContent).toBe('none')
      
      // Resolve the API call
      resolveApiCall!({
        data: { 
          data: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            cityId: 'city-1'
          }
        }
      })
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })
      
      expect(screen.getByTestId('user-id').textContent).toBe('user-123')
    })

    it('loads user from valid token on mount', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        cityId: 'city-1'
      }

      localStorage.setItem('token', 'valid-token')
      mockGet.mockResolvedValue({
        data: { data: mockUser }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      expect(mockGet).toHaveBeenCalledWith('/api/auth/profile')
      expect(screen.getByTestId('user-id').textContent).toBe('user-123')
      expect(screen.getByTestId('user-email').textContent).toBe('test@example.com')
      expect(screen.getByTestId('user-role').textContent).toBe('admin')
      expect(screen.getByTestId('user-city').textContent).toBe('city-1')
    })

    it('clears invalid token and shows no user', async () => {
      localStorage.setItem('token', 'invalid-token')
      mockGet.mockRejectedValue(new Error('Invalid token'))

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      expect(localStorage.getItem('token')).toBeNull()
      expect(screen.getByTestId('user-id').textContent).toBe('none')
    })

    it('shows ready state when no token exists', async () => {
      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      expect(mockGet).not.toHaveBeenCalled()
      expect(screen.getByTestId('user-id').textContent).toBe('none')
    })
  })

  describe('Login', () => {
    it('successfully logs in with city-only credentials', async () => {
      const mockUser: AuthUser = {
        id: 'user-456',
        email: 'city-user@example.com',
        firstName: 'City',
        lastName: 'User',
        role: 'manager',
        cityId: 'test-city'
      }

      mockPost.mockResolvedValue({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            user: mockUser
          }
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-city-only'))

      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('user-456')
      })

      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        username: 'test-user',
        password: 'test-password',
        cityId: 'test-city'
      })

      expect(localStorage.getItem('token')).toBe('new-access-token')
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token')
      expect(screen.getByTestId('user-email').textContent).toBe('city-user@example.com')
      expect(screen.getByTestId('user-role').textContent).toBe('manager')
      expect(screen.getByTestId('user-city').textContent).toBe('test-city')
    })

    it('successfully logs in with project-city credentials', async () => {
      const mockUser: AuthUser = {
        id: 'user-789',
        email: 'project-user@example.com',
        firstName: 'Project',
        lastName: 'User',
        role: 'user',
        projectCityId: 'project-city-1'
      }

      mockPost.mockResolvedValue({
        data: {
          data: {
            accessToken: 'project-access-token',
            refreshToken: 'project-refresh-token',
            user: mockUser
          }
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-project-city'))

      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('user-789')
      })

      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        username: 'test-user',
        password: 'test-password',
        projectId: 'test-project',
        cityName: 'test-city-name'
      })

      expect(localStorage.getItem('token')).toBe('project-access-token')
      expect(localStorage.getItem('refreshToken')).toBe('project-refresh-token')
      expect(screen.getByTestId('user-email').textContent).toBe('project-user@example.com')
      expect(screen.getByTestId('user-role').textContent).toBe('user')
      expect(screen.getByTestId('user-project-city').textContent).toBe('project-city-1')
    })

    it('handles login failure gracefully', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid credentials' }
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      
      // This should throw and be caught by the component using the hook
      await expect(async () => {
        await user.click(screen.getByTestId('login-city-only'))
      }).not.toThrow()

      // User should remain null
      expect(screen.getByTestId('user-id').textContent).toBe('none')
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('Logout', () => {
    it('successfully logs out user', async () => {
      // Setup initial logged-in state
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        cityId: 'city-1'
      }

      localStorage.setItem('token', 'valid-token')
      localStorage.setItem('refreshToken', 'valid-refresh-token')
      mockGet.mockResolvedValue({
        data: { data: mockUser }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('user-123')
      })

      // Logout
      const user = userEvent.setup()
      await user.click(screen.getByTestId('logout'))

      expect(screen.getByTestId('user-id').textContent).toBe('none')
      expect(screen.getByTestId('user-email').textContent).toBe('none')
      expect(screen.getByTestId('user-role').textContent).toBe('none')
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })

    it('can logout when not logged in', async () => {
      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      expect(screen.getByTestId('user-id').textContent).toBe('none')

      // Logout should not crash
      const user = userEvent.setup()
      await user.click(screen.getByTestId('logout'))

      expect(screen.getByTestId('user-id').textContent).toBe('none')
    })
  })

  describe('Tenant Awareness', () => {
    it('stores cityId in user data for city-only mode', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        cityId: 'amsterdam-1'
      }

      mockPost.mockResolvedValue({
        data: {
          data: {
            accessToken: 'city-token',
            refreshToken: 'city-refresh-token',
            user: mockUser
          }
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-city-only'))

      await waitFor(() => {
        expect(screen.getByTestId('user-city').textContent).toBe('amsterdam-1')
      })

      expect(screen.getByTestId('user-project-city').textContent).toBe('none')
    })

    it('stores projectCityId in user data for project-city mode', async () => {
      const mockUser: AuthUser = {
        id: 'user-456',
        email: 'project@example.com',
        firstName: 'Project',
        lastName: 'User',
        role: 'manager',
        projectCityId: 'perfectit-amsterdam-1'
      }

      mockPost.mockResolvedValue({
        data: {
          data: {
            accessToken: 'project-token',
            refreshToken: 'project-refresh-token',
            user: mockUser
          }
        }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-project-city'))

      await waitFor(() => {
        expect(screen.getByTestId('user-project-city').textContent).toBe('perfectit-amsterdam-1')
      })

      expect(screen.getByTestId('user-city').textContent).toBe('none')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors during profile fetch', async () => {
      localStorage.setItem('token', 'valid-token')
      mockGet.mockRejectedValue(new Error('Network error'))

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      expect(screen.getByTestId('user-id').textContent).toBe('none')
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('handles malformed API responses gracefully', async () => {
      localStorage.setItem('token', 'valid-token')
      mockGet.mockResolvedValue({
        data: { malformed: 'response' }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      // Should handle missing user data gracefully
      expect(screen.getByTestId('user-id').textContent).toBe('none')
    })

    it('handles login with malformed response', async () => {
      mockPost.mockResolvedValue({
        data: { malformed: 'login response' }
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('ready')
      })

      const user = userEvent.setup()
      
      // Click login button - the error should be handled by the test component
      await user.click(screen.getByTestId('login-city-only'))
      
      // Wait for any async operations to complete
      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('none')
      })

      // User should remain null and tokens should not be set
      expect(screen.getByTestId('user-id').textContent).toBe('none')
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })
})