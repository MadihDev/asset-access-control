import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// Mock useAuth to capture login calls
vi.mock('../hooks/useAuth', () => {
  const loginMock = vi.fn().mockResolvedValue(undefined)
  return {
    useAuth: () => ({
      login: loginMock,
    }),
    loginMock,
  }
})

// Prepare a mutable mock for useTenant
const selectionState: { project?: string; cityId?: string } = {}
const setSelection = vi.fn((sel: { project?: string; cityId?: string }) => {
  selectionState.project = sel.project
  selectionState.cityId = sel.cityId
})
const refresh = vi.fn(async () => {})

vi.mock('../contexts/TenantContext', () => {
  return {
    useTenant: () => ({
      mode: 'project-city',
      projects: [
        { id: 'p1', name: 'Project One', slug: 'project-one', isActive: true },
        { id: 'p2', name: 'Project Two', slug: 'project-two', isActive: true },
      ],
      // Provide cities list as if filtered by currently selected project
      cities: [
        { id: 'c1', name: 'Amsterdam', country: 'NL', isActive: true },
        { id: 'c2', name: 'Rotterdam', country: 'NL', isActive: true },
      ],
      selection: selectionState,
      setSelection,
      refresh,
    }),
  }
})

// Import after mocks
import Login from '../components/Login'

describe('Login (project + city mode)', () => {
  beforeEach(() => {
    // Reset selection & mocks between tests
    selectionState.project = undefined
    selectionState.cityId = undefined
    setSelection.mockClear()
    refresh.mockClear()
    // JSDOM localStorage safety
    localStorage.clear()
  })

  it('renders project and city selectors and submits login with selected cityId', async () => {
    await act(async () => {
      render(<Login />)
    })

    // Wait for any state updates to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Project selector should be present
    const projectSelect = await screen.findByLabelText('Project')
  expect(projectSelect).toBeTruthy()

    // Choose a project
    await act(async () => {
      fireEvent.change(projectSelect, { target: { value: 'project-one' } })
    })
    expect(setSelection).toHaveBeenCalledWith({ project: 'project-one' })

    // City selector should be enabled and show city options from mock
    const citySelect = await screen.findByLabelText('City')
  expect(citySelect).toBeTruthy()
  expect(screen.getByText('Amsterdam')).toBeTruthy()
  expect(screen.getByText('Rotterdam')).toBeTruthy()

    // Fill the rest of the form
    await act(async () => {
      fireEvent.change(citySelect, { target: { value: 'c1' } })
      fireEvent.change(screen.getByLabelText('Username (not email)'), { target: { value: 'admin' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    })

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    })

    // Assert login called with inputs
    const mockedModule = (await import('../hooks/useAuth')) as unknown as {
      loginMock: ReturnType<typeof vi.fn>
    }
    const loginMock = mockedModule.loginMock
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
        projectId: 'Project One',
        cityName: 'Amsterdam',
        cityId: 'c1'
      })
    })
  })
})
