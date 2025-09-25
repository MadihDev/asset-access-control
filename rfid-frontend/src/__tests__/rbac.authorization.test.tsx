import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { TenantProvider } from '../contexts/TenantContext'
import { ToastProvider } from '../contexts/ToastContext'
import { hasRole, hasAnyRole, ROLES } from '../utils/rbac'
import Navigation from '../components/Navigation'
import UserManagement from '../components/UserManagement'
import Locks from '../components/Locks'
import type { AuthUser } from '../contexts/auth-context'
import '../test/setup'

// Mock APIs
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../services/tenantApi', () => ({
  fetchCitiesByProject: vi.fn(),
  fetchProjects: vi.fn(),
}))

// Import mocked api after mock declaration
import api from '../services/api'

// Mock console.error to avoid React warnings in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
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

describe('Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    consoleSpy.mockClear()
  })

  describe('RBAC Utility Functions', () => {
    const superAdmin: AuthUser = { id: 'sa1', email: 'sa@test.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', cityId: 'city1' }
    const admin: AuthUser = { id: 'a1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN', cityId: 'city1' }
    const supervisor: AuthUser = { id: 's1', email: 'supervisor@test.com', firstName: 'Supervisor', lastName: 'User', role: 'SUPERVISOR', cityId: 'city1' }
    const user: AuthUser = { id: 'u1', email: 'user@test.com', firstName: 'Regular', lastName: 'User', role: 'USER', cityId: 'city1' }

    describe('hasRole', () => {
      it('correctly identifies exact role matches', () => {
        expect(hasRole(superAdmin, ROLES.SUPER_ADMIN)).toBe(true)
        expect(hasRole(admin, ROLES.ADMIN)).toBe(true)
        expect(hasRole(supervisor, ROLES.SUPERVISOR)).toBe(true)
        expect(hasRole(user, ROLES.USER)).toBe(true)
      })

      it('returns false for role mismatches', () => {
        expect(hasRole(user, ROLES.ADMIN)).toBe(false)
        expect(hasRole(supervisor, ROLES.SUPER_ADMIN)).toBe(false)
        expect(hasRole(admin, ROLES.USER)).toBe(false)
      })

      it('handles null/undefined users', () => {
        expect(hasRole(null, ROLES.ADMIN)).toBe(false)
        expect(hasRole(undefined, ROLES.USER)).toBe(false)
      })
    })

    describe('hasAnyRole', () => {
      it('correctly identifies users with any of the specified roles', () => {
        expect(hasAnyRole(superAdmin, [ROLES.SUPER_ADMIN, ROLES.ADMIN])).toBe(true)
        expect(hasAnyRole(admin, [ROLES.SUPER_ADMIN, ROLES.ADMIN])).toBe(true)
        expect(hasAnyRole(supervisor, [ROLES.SUPERVISOR, ROLES.USER])).toBe(true)
        expect(hasAnyRole(user, [ROLES.USER])).toBe(true)
      })

      it('returns false when user has none of the specified roles', () => {
        expect(hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN])).toBe(false)
        expect(hasAnyRole(supervisor, [ROLES.SUPER_ADMIN, ROLES.ADMIN])).toBe(false)
      })

      it('handles null/undefined users', () => {
        expect(hasAnyRole(null, [ROLES.ADMIN])).toBe(false)
        expect(hasAnyRole(undefined, [ROLES.ADMIN, ROLES.USER])).toBe(false)
      })
    })
  })

  describe('Navigation Component Access Control', () => {
    it('shows all navigation items for SUPER_ADMIN', () => {
      const superAdmin: AuthUser = { id: 'sa1', email: 'sa@test.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Navigation user={superAdmin} />
        </Wrapper>
      )

      // SUPER_ADMIN should see all navigation items
      expect(screen.getAllByText('Dashboard')).toHaveLength(2) // desktop and mobile
      expect(screen.getAllByText('Access Logs')).toHaveLength(2)
      expect(screen.getAllByText('Locks')).toHaveLength(2)
      expect(screen.getAllByText('Users')).toHaveLength(2)
      expect(screen.getAllByText('Audit Logs')).toHaveLength(2)
      expect(screen.getAllByText('Settings')).toHaveLength(2)
    })

    it('shows limited navigation items for SUPERVISOR', () => {
      const supervisor: AuthUser = { id: 's1', email: 'supervisor@test.com', firstName: 'Supervisor', lastName: 'User', role: 'SUPERVISOR', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Navigation user={supervisor} />
        </Wrapper>
      )

      // SUPERVISOR should see most items but not Users
      expect(screen.getAllByText('Dashboard')).toHaveLength(2)
      expect(screen.getAllByText('Access Logs')).toHaveLength(2)
      expect(screen.getAllByText('Locks')).toHaveLength(2)
      expect(screen.getAllByText('Audit Logs')).toHaveLength(2)
      expect(screen.getAllByText('Settings')).toHaveLength(2)
      // SUPERVISOR should NOT see Users management
      expect(screen.queryByText('Users')).not.toBeInTheDocument()
    })

    it('shows minimal navigation items for USER', () => {
      const user: AuthUser = { id: 'u1', email: 'user@test.com', firstName: 'Regular', lastName: 'User', role: 'USER', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Navigation user={user} />
        </Wrapper>
      )

      // USER should see only basic items
      expect(screen.getAllByText('Dashboard')).toHaveLength(2)
      expect(screen.getAllByText('Access Logs')).toHaveLength(2)
      
      // USER should NOT see advanced management features
      expect(screen.queryByText('Locks')).not.toBeInTheDocument()
      expect(screen.queryByText('Users')).not.toBeInTheDocument()
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  describe('UserManagement Component Access Control', () => {
    beforeEach(() => {
      // Mock API responses for UserManagement
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            { id: 'u1', email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'USER', isActive: true },
            { id: 'u2', email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'SUPERVISOR', isActive: true },
          ],
          pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 }
        }
      })
    })

    it('allows SUPER_ADMIN to manage all users', async () => {
      const superAdmin: AuthUser = { id: 'sa1', email: 'sa@test.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <UserManagement user={superAdmin} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument()
      })

      // SUPER_ADMIN should see all user management controls
      expect(screen.getByText(/Manage users, roles, and permissions as super admin/)).toBeInTheDocument()
    })

    it('denies SUPERVISOR access to user creation', async () => {
      const supervisor: AuthUser = { id: 's1', email: 'supervisor@test.com', firstName: 'Supervisor', lastName: 'User', role: 'SUPERVISOR', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <UserManagement user={supervisor} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Manage users, roles, and permissions as supervisor/)).toBeInTheDocument()
      })

      // SUPERVISOR should not see user creation
      expect(screen.queryByText('New User')).not.toBeInTheDocument()
    })
  })

  describe('Lock Management Access Control', () => {
    beforeEach(() => {
      // Mock API responses for Locks
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            { id: 'l1', name: 'Lock 1', isActive: true, isOnline: true },
            { id: 'l2', name: 'Lock 2', isActive: false, isOnline: false },
          ]
        }
      })
    })

    it('allows SUPER_ADMIN full lock management', async () => {
      const superAdmin: AuthUser = { id: 'sa1', email: 'sa@test.com', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Locks user={superAdmin} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Lock 1')).toBeInTheDocument()
      })

      // SUPER_ADMIN should see deactivate and ping buttons
      const firstLockRow = screen.getByText('Lock 1').closest('tr')!
      expect(within(firstLockRow).getByText('Deactivate')).toBeInTheDocument()
      expect(within(firstLockRow).getByText('Ping')).toBeInTheDocument()
    })

    it('allows SUPERVISOR to ping but not update locks', async () => {
      const supervisor: AuthUser = { id: 's1', email: 'supervisor@test.com', firstName: 'Supervisor', lastName: 'User', role: 'SUPERVISOR', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Locks user={supervisor} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Lock 1')).toBeInTheDocument()
      })

      // SUPERVISOR should see ping but not deactivate buttons
      const firstLockRow = screen.getByText('Lock 1').closest('tr')!
      expect(within(firstLockRow).queryByText('Deactivate')).not.toBeInTheDocument()
      expect(within(firstLockRow).getByText('Ping')).toBeInTheDocument()
    })

    it('denies USER access to lock management actions', async () => {
      const user: AuthUser = { id: 'u1', email: 'user@test.com', firstName: 'Regular', lastName: 'User', role: 'USER', cityId: 'city1' }
      const Wrapper = createTestWrapper()

      render(
        <Wrapper>
          <Locks user={user} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Lock 1')).toBeInTheDocument()
      })

      // USER should not see deactivate or ping buttons
      const firstLockRow = screen.getByText('Lock 1').closest('tr')!
      expect(within(firstLockRow).queryByText('Deactivate')).not.toBeInTheDocument()
      expect(within(firstLockRow).queryByText('Ping')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling in RBAC', () => {
    it('handles missing user context gracefully', () => {
      // Test the utility functions directly with null users
      expect(hasRole(null, ROLES.ADMIN)).toBe(false)
      expect(hasAnyRole(null, [ROLES.ADMIN, ROLES.USER])).toBe(false)
    })

    it('handles invalid role values gracefully', () => {
      const invalidUser = { id: 'u1', email: 'user@test.com', firstName: 'User', lastName: 'Name', role: 'INVALID_ROLE', cityId: 'city1' } as AuthUser

      // Should not crash and should return false for invalid roles
      expect(hasRole(invalidUser, ROLES.ADMIN)).toBe(false)
      expect(hasAnyRole(invalidUser, [ROLES.ADMIN])).toBe(false)
    })
  })
})